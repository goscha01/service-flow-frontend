import React, { useState, useEffect, useMemo } from 'react';
import {
  Upload, FileText, CheckCircle, AlertCircle, Loader2, X, Save,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import FieldMappingTable from '../../components/FieldMappingTable';
import {
  UNIFIED_FIELDS, TARGET_FIELDS, TARGET_TYPE_LABELS, TARGET_TYPES,
  inferType, getRequiredFieldsForTarget, filterMappingForTarget,
} from '../../lib/import/targetFields';
import { suggestMapping, detectSource } from '../../lib/import/headerMatcher';

// CSV parser that handles multi-line quoted fields (BK-compatible)
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    const next = text[i + 1];
    if (c === '"') {
      if (inQuotes && next === '"') { field += '"'; i += 2; }
      else { inQuotes = !inQuotes; i++; }
    } else if (c === ',' && !inQuotes) {
      row.push(field); field = ''; i++;
    } else if ((c === '\n' || (c === '\r' && next === '\n')) && !inQuotes) {
      row.push(field);
      if (row.length > 0 && row.some((f) => f.trim() !== '')) rows.push(row);
      row = []; field = '';
      i += (c === '\r' && next === '\n') ? 2 : 1;
    } else {
      field += c; i++;
    }
  }
  if (field !== '' || row.length > 0) row.push(field);
  if (row.length > 0 && row.some((f) => f.trim() !== '')) rows.push(row);
  return rows;
}

export default function DataImportPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Steps: 1=upload, 2=mapping (single unified dropdown), 3=preview,
  //        4=settings, 5=importing, 6=results
  const [step, setStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [parsedRows, setParsedRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [allPresets, setAllPresets] = useState([]);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [savePresetName, setSavePresetName] = useState('');
  const [importSettings, setImportSettings] = useState({
    skipDuplicates: true,
    updateExisting: false,
  });
  const [error, setError] = useState('');
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, imported: 0, skipped: 0, errors: 0 });
  const [importResult, setImportResult] = useState(null);

  // Type is DERIVED from the mapping — no manual selector. Picking a
  // single-target field (e.g. Hourly Rate → team_members) is what tells the
  // system what kind of data the user is importing.
  const inference = useMemo(() => inferType(mapping), [mapping]);
  const type = inference.type;

  // Load all presets once on mount
  useEffect(() => {
    api.get('/import-mapping-presets')
      .then((r) => {
        setAllPresets(r.data?.presets || []);
        const presetParam = searchParams.get('preset');
        if (presetParam) {
          const match = (r.data?.presets || []).find(
            (p) => p.is_system && p.name.toLowerCase().replace(/\s+/g, '-') === presetParam.toLowerCase(),
          );
          if (match) setSelectedPresetId(match.id);
        }
      })
      .catch(() => setAllPresets([]));
  }, [searchParams]);

  // All presets are valid options regardless of inferred type — picking one
  // overwrites the mapping (which then drives type inference).
  const presets = allPresets;

  const targetFields = UNIFIED_FIELDS;
  const requiredFields = getRequiredFieldsForTarget(type);
  const sampleRow = parsedRows[0] || {};

  const missingRequired = useMemo(
    () => requiredFields.filter((k) => !mapping[k]),
    [requiredFields, mapping],
  );

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const valid = ['.csv', '.xlsx', '.xls'].some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!valid) {
      setError('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
      return;
    }
    setSelectedFile(file);
    setError('');
    parseFile(file);
  };

  const parseFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let headers = [];
        let rows = [];

        if (file.name.toLowerCase().endsWith('.csv')) {
          const parsed = parseCSV(e.target.result);
          if (parsed.length === 0) {
            setError('CSV file appears to be empty');
            return;
          }
          headers = parsed[0].map((h) => h.replace(/^"|"$/g, '').trim());
          rows = parsed.slice(1).map((r) => {
            const obj = {};
            headers.forEach((h, i) => {
              obj[h] = (r[i] || '').replace(/^"|"$/g, '').trim();
            });
            return obj;
          });
        } else {
          const wb = XLSX.read(e.target.result, { type: 'binary' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          rows = XLSX.utils.sheet_to_json(ws);
          headers = rows.length > 0 ? Object.keys(rows[0]) : [];
        }

        setCsvHeaders(headers);
        setParsedRows(rows);

        // Try to detect a known source (BK, ZenBooker) and auto-pick the
        // matching system preset.
        let appliedFromPreset = false;
        if (!selectedPresetId) {
          const detected = detectSource(headers);
          if (detected) {
            const match = allPresets.find((p) => p.is_system && p.name === detected);
            if (match) {
              setSelectedPresetId(match.id);
              setMapping(filterMappingToHeaders(match.mapping, headers));
              appliedFromPreset = true;
            }
          }
        }

        // No preset matched → run synonym/fuzzy auto-suggest against the
        // unified catalog (any field key from any type is a candidate).
        if (!appliedFromPreset) {
          setMapping(suggestMapping(headers, UNIFIED_FIELDS));
        }

        setStep(2);
      } catch (err) {
        console.error('Parse error:', err);
        setError('Failed to parse file. Please ensure it is a valid CSV or Excel file.');
      }
    };
    reader.onerror = () => setError('Failed to read file. Please try again.');
    if (file.name.toLowerCase().endsWith('.csv')) reader.readAsText(file);
    else reader.readAsBinaryString(file);
  };

  // Strip mapping entries whose CSV header isn't in this file (presets may
  // reference headers the uploaded file doesn't have)
  const filterMappingToHeaders = (presetMapping, headers) => {
    const headersSet = new Set(headers);
    const out = {};
    for (const [sf, csv] of Object.entries(presetMapping || {})) {
      if (csv && headersSet.has(csv)) out[sf] = csv;
    }
    return out;
  };

  const handlePresetChange = (presetId) => {
    setSelectedPresetId(presetId);
    if (!presetId) {
      // "Custom (no preset)" — re-run auto-suggest against unified catalog
      setMapping(suggestMapping(csvHeaders, UNIFIED_FIELDS));
      return;
    }
    const preset = allPresets.find((p) => p.id === presetId);
    if (preset) setMapping(filterMappingToHeaders(preset.mapping, csvHeaders));
  };

  const handleSavePreset = async () => {
    const name = savePresetName.trim();
    if (!name) {
      setError('Please enter a name for the preset');
      return;
    }
    try {
      // Save preset under the inferred type, with only fields valid for it
      const presetMapping = filterMappingForTarget(mapping, type);
      const r = await api.post('/import-mapping-presets', { name, target: type, mapping: presetMapping });
      const newPreset = r.data?.preset;
      if (newPreset) {
        setAllPresets((prev) => [...prev, newPreset]);
        setSelectedPresetId(newPreset.id);
        setSavePresetName('');
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to save preset');
    }
  };

  const handleImport = async () => {
    if (!parsedRows.length) {
      setError('No data to import');
      return;
    }
    setError('');
    setStep(5);
    setImportProgress({ current: 0, total: parsedRows.length, imported: 0, skipped: 0, errors: 0 });

    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      let apiBaseUrl = process.env.REACT_APP_API_URL || api.defaults?.baseURL || 'http://localhost:3000/api';
      apiBaseUrl = apiBaseUrl.replace(/\/api$/, '');
      const url = `${apiBaseUrl}/api/data-import/import`;

      // Send only the fields valid for the inferred type — extra mappings
      // outside this type are silently dropped at submit. (UI doesn't allow
      // multi-type import yet; this guards against stale state.)
      const submitMapping = filterMappingForTarget(mapping, type);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type, rows: parsedRows, mapping: submitMapping, importSettings }),
      });

      if (!response.ok) {
        let msg = 'Import failed';
        try { const j = await response.json(); msg = j.error || msg; } catch {}
        throw new Error(msg);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const evt = JSON.parse(line);
            if (evt.type === 'progress') {
              // BK route emits { customers: {...}, jobs: {...} }; new types emit { [type]: {...} }
              const p = evt[type] || evt.customers || evt.jobs || evt;
              if (p && p.total !== undefined) setImportProgress(p);
            } else if (evt.type === 'complete') {
              const r = evt.results || {};
              const detail = r[type] || r.customers || r.jobs;
              setImportResult({
                imported: detail?.imported || 0,
                skipped: detail?.skipped || 0,
                errors: detail?.errors || [],
              });
              setStep(6);
            } else if (evt.type === 'error') {
              throw new Error(evt.message || evt.error || 'Import failed');
            }
          } catch (e) {
            if (e.message && !e.message.includes('Unexpected end of JSON')) {
              console.error('Progress parse error:', e);
            }
          }
        }
      }
    } catch (err) {
      console.error('Import error:', err);
      setError(err.message || 'Failed to import data');
      setStep(4);
    }
  };

  const reset = () => {
    setStep(1);
    setSelectedFile(null);
    setCsvHeaders([]);
    setParsedRows([]);
    setMapping({});
    setSelectedPresetId('');
    setError('');
    setImportResult(null);
  };

  // ── Step 1: Upload ───────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center space-x-2 text-[var(--sf-text-secondary)] hover:text-[var(--sf-text-primary)] mb-4"
          >
            <span>← Back to Settings</span>
          </button>
          <div className="flex items-center space-x-4 mb-2">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Upload className="w-8 h-8 text-orange-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[var(--sf-text-primary)]">Data Import</h1>
              <p className="text-[var(--sf-text-secondary)]">
                Upload a CSV or Excel file. You'll map columns to Service Flow fields on the next step.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-600 text-sm">{error}</span>
          </div>
        )}

        <div className="bg-white rounded-lg border border-[var(--sf-border-light)] p-6">
          <div className="border-2 border-dashed border-[var(--sf-border-light)] rounded-lg p-8 text-center hover:border-orange-400 transition-colors">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="data-import-file"
            />
            <label htmlFor="data-import-file" className="cursor-pointer flex flex-col items-center">
              <Upload className="w-12 h-12 text-[var(--sf-text-muted)] mb-4" />
              <p className="text-lg font-medium text-[var(--sf-text-primary)] mb-1">Click to upload or drag & drop</p>
              <p className="text-sm text-[var(--sf-text-muted)]">CSV or Excel files</p>
            </label>
          </div>

          {selectedFile && (
            <div className="mt-4 p-3 bg-[var(--sf-bg-page)] rounded-lg flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-[var(--sf-text-secondary)]" />
                <span className="text-sm font-medium">{selectedFile.name}</span>
                <span className="text-xs text-[var(--sf-text-muted)]">
                  ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <button
                onClick={() => { setSelectedFile(null); setCsvHeaders([]); setParsedRows([]); }}
                className="text-[var(--sf-text-muted)] hover:text-[var(--sf-text-secondary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Step 2: Map fields ────────────────────────────────────────────
  if (step === 2) {
    const systemPresets = presets.filter((p) => p.is_system);
    const userPresets = presets.filter((p) => !p.is_system);

    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="mb-6">
          <button
            onClick={() => setStep(1)}
            className="flex items-center space-x-2 text-[var(--sf-text-secondary)] hover:text-[var(--sf-text-primary)] mb-4"
          >
            <span>← Back</span>
          </button>
          <h1 className="text-2xl font-bold text-[var(--sf-text-primary)]">Map Fields</h1>
          <p className="text-[var(--sf-text-secondary)] mt-1">
            Match each column from your file to the matching Service Flow field.
          </p>
        </div>

        <div className="bg-white rounded-lg border border-[var(--sf-border-light)] p-4 mb-4 flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-[var(--sf-text-primary)] mb-1">Preset</label>
            <select
              value={selectedPresetId}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--sf-border-light)] rounded-lg text-sm"
            >
              <option value="">Custom (manual mapping)</option>
              {systemPresets.length > 0 && (
                <optgroup label="System">
                  {systemPresets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {TARGET_TYPE_LABELS[p.target]}
                    </option>
                  ))}
                </optgroup>
              )}
              {userPresets.length > 0 && (
                <optgroup label="My Presets">
                  {userPresets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {TARGET_TYPE_LABELS[p.target]}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
          {inference.mappedFields > 0 && (
            <div className="text-sm">
              <div className="text-[var(--sf-text-muted)] uppercase text-xs tracking-wider mb-1">Detected as</div>
              <div className="px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg font-medium text-orange-700">
                {TARGET_TYPE_LABELS[type]}
              </div>
            </div>
          )}
        </div>

        <FieldMappingTable
          csvHeaders={csvHeaders}
          sampleRow={sampleRow}
          targetFields={targetFields}
          mapping={mapping}
          onChange={setMapping}
        />

        <div className="mt-4 bg-white rounded-lg border border-[var(--sf-border-light)] p-4 flex items-end space-x-2">
          <div className="flex-1">
            <label className="block text-sm font-medium text-[var(--sf-text-primary)] mb-1">
              Save current mapping as preset
            </label>
            <input
              type="text"
              value={savePresetName}
              onChange={(e) => setSavePresetName(e.target.value)}
              placeholder="e.g. Jobber Customers Export"
              className="w-full px-3 py-2 border border-[var(--sf-border-light)] rounded-lg text-sm"
            />
          </div>
          <button
            onClick={handleSavePreset}
            disabled={!savePresetName.trim()}
            className="px-4 py-2 bg-[var(--sf-blue-500)] text-white rounded-lg hover:bg-[var(--sf-blue-600)] disabled:opacity-50 flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>Save</span>
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={() => setStep(1)}
            className="px-6 py-2 border border-[var(--sf-border-light)] rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={() => setStep(3)}
            disabled={missingRequired.length > 0}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // ── Step 3: Preview ────────────────────────────────────────────────
  if (step === 3) {
    // Preview uses only fields valid for the inferred type — what will
    // actually be sent to the backend.
    const submitMapping = filterMappingForTarget(mapping, type);
    const previewMapped = parsedRows.slice(0, 10).map((row) => {
      const out = {};
      for (const [sf, csv] of Object.entries(submitMapping)) {
        if (csv && row[csv] !== undefined) out[sf] = row[csv];
      }
      return out;
    });
    const previewCols = previewMapped[0] ? Object.keys(previewMapped[0]) : [];

    return (
      <div className="max-w-6xl mx-auto p-6">
        <button
          onClick={() => setStep(2)}
          className="flex items-center space-x-2 text-[var(--sf-text-secondary)] hover:text-[var(--sf-text-primary)] mb-4"
        >
          <span>← Back</span>
        </button>
        <h1 className="text-2xl font-bold text-[var(--sf-text-primary)] mb-1">Preview</h1>
        <p className="text-[var(--sf-text-secondary)] mb-4">
          First 10 rows as they will be imported. Total: {parsedRows.length} rows.
        </p>

        <div className="bg-white rounded-lg border border-[var(--sf-border-light)] overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--sf-border-light)]">
              <thead className="bg-[var(--sf-bg-page)]">
                <tr>
                  {previewCols.map((c) => (
                    <th key={c} className="px-4 py-2 text-left text-xs font-medium text-[var(--sf-text-muted)] uppercase">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[var(--sf-border-light)]">
                {previewMapped.map((row, idx) => (
                  <tr key={idx}>
                    {previewCols.map((c) => {
                      const v = row[c];
                      const display = typeof v === 'object' ? JSON.stringify(v) : String(v ?? '');
                      return (
                        <td key={c} className="px-4 py-2 text-sm text-[var(--sf-text-primary)] max-w-xs truncate" title={display}>
                          {display.length > 60 ? display.slice(0, 60) + '…' : display || '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button onClick={() => setStep(2)} className="px-6 py-2 border border-[var(--sf-border-light)] rounded-lg">
            Back
          </button>
          <button onClick={() => setStep(4)} className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
            Continue
          </button>
        </div>
      </div>
    );
  }

  // ── Step 4: Import settings ─────────────────────────────────────
  if (step === 4) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <button
          onClick={() => setStep(3)}
          className="flex items-center space-x-2 text-[var(--sf-text-secondary)] hover:text-[var(--sf-text-primary)] mb-4"
        >
          <span>← Back</span>
        </button>
        <h1 className="text-2xl font-bold text-[var(--sf-text-primary)] mb-4">Import Settings</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-600 text-sm">{error}</span>
          </div>
        )}

        <div className="bg-white rounded-lg border border-[var(--sf-border-light)] p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Duplicate Handling</h2>
          <label className="flex items-start space-x-3 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={importSettings.skipDuplicates}
              onChange={(e) => setImportSettings({ ...importSettings, skipDuplicates: e.target.checked })}
              className="mt-1"
            />
            <div>
              <span className="font-medium">Skip Duplicates</span>
              <p className="text-sm text-[var(--sf-text-secondary)]">
                Skip records that already exist
              </p>
            </div>
          </label>
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={importSettings.updateExisting}
              onChange={(e) => setImportSettings({ ...importSettings, updateExisting: e.target.checked })}
              disabled={!importSettings.skipDuplicates}
              className="mt-1"
            />
            <div>
              <span className="font-medium">Update Existing Records</span>
              <p className="text-sm text-[var(--sf-text-secondary)]">
                Update existing records with new data instead of skipping
              </p>
            </div>
          </label>
        </div>

        <div className="flex justify-end space-x-3">
          <button onClick={() => setStep(3)} className="px-6 py-2 border border-[var(--sf-border-light)] rounded-lg">
            Back
          </button>
          <button onClick={handleImport} className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
            Start Import
          </button>
        </div>
      </div>
    );
  }

  // ── Step 5: Importing ────────────────────────────────────────────
  if (step === 5) {
    const pct = importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0;
    return (
      <div className="max-w-3xl mx-auto p-6 text-center py-12">
        <Loader2 className="w-16 h-16 text-orange-600 mx-auto mb-4 animate-spin" />
        <h1 className="text-2xl font-bold mb-2">Importing {TARGET_TYPE_LABELS[type]}…</h1>
        <p className="text-[var(--sf-text-secondary)] mb-6">Please don't close this page.</p>

        <div className="mb-2 flex justify-between text-sm">
          <span>{importProgress.current} of {importProgress.total} processed</span>
          <span>{Math.round(pct)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div className="bg-orange-600 h-3 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-3 text-sm text-[var(--sf-text-secondary)] flex justify-center space-x-4">
          <span>✓ {importProgress.imported}</span>
          <span>⊘ {importProgress.skipped}</span>
          {importProgress.errors > 0 && <span className="text-red-600">✗ {importProgress.errors}</span>}
        </div>
      </div>
    );
  }

  // ── Step 6: Results ────────────────────────────────────────────
  if (step === 6 && importResult) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-center py-12">
        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Import Complete</h1>
        <p className="text-[var(--sf-text-secondary)] mb-6">
          {TARGET_TYPE_LABELS[type]} import finished
        </p>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6 text-left">
          <h3 className="text-lg font-semibold text-green-800 mb-3">Summary</h3>
          <div className="text-sm text-green-700 space-y-1">
            <p><strong>Imported:</strong> {importResult.imported}</p>
            {importResult.skipped > 0 && <p><strong>Skipped:</strong> {importResult.skipped} duplicates</p>}
            {importResult.errors?.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer font-medium">
                  Errors: {importResult.errors.length} record{importResult.errors.length === 1 ? '' : 's'} failed
                </summary>
                <ul className="list-disc list-inside mt-2 text-xs space-y-1">
                  {importResult.errors.slice(0, 20).map((e, i) => <li key={i}>{e}</li>)}
                  {importResult.errors.length > 20 && (
                    <li>… and {importResult.errors.length - 20} more</li>
                  )}
                </ul>
              </details>
            )}
          </div>
        </div>

        <div className="flex justify-center space-x-3">
          <button onClick={reset} className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
            Import More
          </button>
          <button onClick={() => navigate('/settings')} className="px-6 py-2 border border-[var(--sf-border-light)] rounded-lg">
            Back to Settings
          </button>
        </div>
      </div>
    );
  }

  return null;
}
