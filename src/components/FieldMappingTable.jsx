import React, { useMemo } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

/**
 * Two-column field mapping UI.
 *
 * Left column  — every CSV header from the uploaded file, with a sample value.
 * Right column — dropdown of available SF target fields (or "— Skip —").
 *
 * Mapping shape: { sfFieldKey: csvHeader }
 *   — note: keyed by SF field, NOT by CSV header. This matches the preset
 *     storage shape and lets multiple SF fields map to the same CSV column
 *     (e.g. firstName + customerFirstName both pulling from "First name").
 */
export default function FieldMappingTable({
  csvHeaders = [],
  sampleRow = {},
  targetFields = [],
  mapping = {},
  onChange,
}) {
  // Reverse lookup: csvHeader → list of sfFieldKeys it's currently mapped to.
  // mapping values may be a single CSV header (string) OR an array of CSV
  // headers (multi-mappable fields like Expense Amount). Both are flattened
  // into the same shape here.
  const headerToField = useMemo(() => {
    const out = {};
    for (const [sfField, csvHeader] of Object.entries(mapping)) {
      if (!csvHeader) continue;
      const headers = Array.isArray(csvHeader) ? csvHeader : [csvHeader];
      for (const h of headers) {
        if (!out[h]) out[h] = [];
        out[h].push(sfField);
      }
    }
    return out;
  }, [mapping]);

  const fieldByKey = useMemo(() => {
    const m = {};
    for (const f of targetFields) m[f.key] = f;
    return m;
  }, [targetFields]);

  const requiredFields = useMemo(
    () => targetFields.filter((f) => f.required).map((f) => f.key),
    [targetFields],
  );

  const missingRequired = requiredFields.filter((k) => !mapping[k]);

  const handleHeaderChange = (csvHeader, newSfField) => {
    const next = { ...mapping };
    // Strip csvHeader from any previous bindings (single OR multi).
    for (const sf of headerToField[csvHeader] || []) {
      if (sf === newSfField) continue;
      if (Array.isArray(next[sf])) {
        next[sf] = next[sf].filter((h) => h !== csvHeader);
        if (next[sf].length === 0) delete next[sf];
      } else if (next[sf] === csvHeader) {
        delete next[sf];
      }
    }
    if (newSfField) {
      const fieldDef = fieldByKey[newSfField];
      if (fieldDef?.multi) {
        // Multi-mappable: append (don't overwrite). Same column twice = no-op.
        const existing = Array.isArray(next[newSfField])
          ? next[newSfField]
          : (next[newSfField] ? [next[newSfField]] : []);
        if (!existing.includes(csvHeader)) existing.push(csvHeader);
        next[newSfField] = existing;
      } else {
        next[newSfField] = csvHeader;
      }
    }
    onChange?.(next);
  };

  // Group target fields by `group` for the dropdown
  const groupedFields = useMemo(() => {
    const groups = {};
    for (const f of targetFields) {
      const g = f.group || '';
      if (!groups[g]) groups[g] = [];
      groups[g].push(f);
    }
    return groups;
  }, [targetFields]);

  const renderFieldOptions = () => {
    const groupNames = Object.keys(groupedFields);
    if (groupNames.length === 1 && groupNames[0] === '') {
      return groupedFields[''].map((f) => (
        <option key={f.key} value={f.key}>
          {f.label}{f.required ? ' *' : ''}
        </option>
      ));
    }
    return groupNames.map((g) =>
      g ? (
        <optgroup key={g} label={g}>
          {groupedFields[g].map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}{f.required ? ' *' : ''}
            </option>
          ))}
        </optgroup>
      ) : (
        groupedFields[g].map((f) => (
          <option key={f.key} value={f.key}>
            {f.label}{f.required ? ' *' : ''}
          </option>
        ))
      ),
    );
  };

  const previewSample = (header) => {
    const v = sampleRow?.[header];
    if (v === undefined || v === null || v === '') return '—';
    const str = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return str.length > 80 ? str.slice(0, 80) + '…' : str;
  };

  return (
    <div className="space-y-4">
      {missingRequired.length > 0 && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <strong>Required fields not mapped:</strong>{' '}
            {missingRequired.map((k) => fieldByKey[k]?.label || k).join(', ')}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-[var(--sf-border-light)] overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-[var(--sf-bg-page)] border-b border-[var(--sf-border-light)] text-xs font-medium text-[var(--sf-text-muted)] uppercase tracking-wider">
          <div className="col-span-5">CSV Column</div>
          <div className="col-span-1" />
          <div className="col-span-6">Service Flow Field</div>
        </div>

        {csvHeaders.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-[var(--sf-text-muted)]">
            No columns detected.
          </div>
        )}

        {csvHeaders.map((header) => {
          const mappedField = (headerToField[header] || [])[0] || '';
          return (
            <div
              key={header}
              className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-[var(--sf-border-light)] last:border-b-0 items-center"
            >
              <div className="col-span-5 min-w-0">
                <div className="text-sm font-medium text-[var(--sf-text-primary)] truncate" title={header}>
                  {header}
                </div>
                <div className="text-xs text-[var(--sf-text-muted)] truncate" title={previewSample(header)}>
                  {previewSample(header)}
                </div>
              </div>

              <div className="col-span-1 flex justify-center">
                <ArrowRight className="w-4 h-4 text-[var(--sf-text-muted)]" />
              </div>

              <div className="col-span-6">
                <select
                  value={mappedField}
                  onChange={(e) => handleHeaderChange(header, e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--sf-border-light)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="">— Skip this column —</option>
                  {renderFieldOptions()}
                </select>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-xs text-[var(--sf-text-muted)] flex items-center space-x-2">
        <CheckCircle2 className="w-4 h-4 text-green-600" />
        <span>
          {Object.keys(mapping).filter((k) => mapping[k]).length} field
          {Object.keys(mapping).filter((k) => mapping[k]).length === 1 ? '' : 's'} mapped
          {requiredFields.length > 0 && ` · ${requiredFields.length - missingRequired.length}/${requiredFields.length} required`}
        </span>
      </div>
    </div>
  );
}
