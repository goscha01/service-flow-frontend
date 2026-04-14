import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Mail, Plus, RefreshCw, Trash2, CheckCircle2, AlertCircle, Clock, Zap, ChevronDown } from 'lucide-react'
import { connectedEmailAPI } from '../../services/api'

const PROVIDERS = [
  { key: 'gmail', label: 'Gmail', description: 'Connect a Google / Gmail mailbox', color: 'bg-red-50 text-red-700' },
  { key: 'outlook', label: 'Outlook / Microsoft 365', description: 'Connect Outlook or Microsoft 365', color: 'bg-blue-50 text-blue-700' },
]

function SyncMenu({ disabled, onPick }) {
  const [open, setOpen] = useState(false)
  const options = [
    { label: 'Test: last 24h (10 msgs)', days: 1, max: 10 },
    { label: 'Test: last 7 days (50 msgs)', days: 7, max: 50 },
    { label: 'Test: last 30 days (100 msgs)', days: 30, max: 100 },
    { label: 'Full: last 90 days (200 msgs)', days: 90, max: 200 },
  ]
  return (
    <div className="relative">
      <button
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        title="Test sync"
        className="inline-flex items-center gap-0.5 p-1.5 text-[var(--sf-blue-500)] hover:text-[var(--sf-blue-600)] rounded hover:bg-blue-50 disabled:opacity-50">
        <Zap size={16} />
        <ChevronDown size={12} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-56 bg-white border border-[var(--sf-border-light)] rounded-lg shadow-lg py-1">
            {options.map(o => (
              <button key={o.label}
                onClick={() => { setOpen(false); onPick(o.days, o.max) }}
                className="w-full text-left px-3 py-2 text-xs text-[var(--sf-text-primary)] hover:bg-[var(--sf-bg-hover)]">
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function statusPill(status) {
  const map = {
    connected: { Icon: CheckCircle2, cls: 'text-green-700 bg-green-50', label: 'Connected' },
    syncing:   { Icon: RefreshCw, cls: 'text-blue-700 bg-blue-50', label: 'Syncing' },
    expired:   { Icon: Clock, cls: 'text-amber-700 bg-amber-50', label: 'Token expired' },
    error:     { Icon: AlertCircle, cls: 'text-red-700 bg-red-50', label: 'Error' },
    disconnected: { Icon: AlertCircle, cls: 'text-gray-600 bg-gray-100', label: 'Disconnected' },
  }
  const m = map[status] || map.disconnected
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${m.cls}`}>
      <m.Icon size={12} /> {m.label}
    </span>
  )
}

export default function ConnectedInboxes() {
  const [accounts, setAccounts] = useState([])
  const [configured, setConfigured] = useState(true)
  const [providerAvail, setProviderAvail] = useState({ gmail: true, outlook: true })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const [params] = useSearchParams()
  const flash = params.get('connected') || params.get('error')

  const load = async () => {
    try {
      setLoading(true)
      const data = await connectedEmailAPI.listAccounts()
      setAccounts(data.accounts || [])
      setConfigured(data.configured !== false)
      if (data.providers) setProviderAvail(data.providers)
    } catch (e) {
      console.error('Failed to load connected inboxes:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const connect = async (provider) => {
    try {
      setBusy(provider)
      const { authorization_url } = await connectedEmailAPI.startOAuth(provider)
      window.location.href = authorization_url
    } catch (e) {
      alert(e.response?.data?.error || `Failed to start ${provider} OAuth`)
      setBusy(null)
    }
  }

  const disconnect = async (id) => {
    if (!window.confirm('Disconnect this mailbox? Historical messages will be preserved.')) return
    try {
      setBusy(id)
      await connectedEmailAPI.disconnect(id)
      await load()
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to disconnect')
    } finally { setBusy(null) }
  }

  const resync = async (id) => {
    try {
      setBusy(id)
      await connectedEmailAPI.resync(id)
      setTimeout(load, 1500)
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to queue resync')
    } finally { setBusy(null) }
  }

  const testSync = async (id, days, maxMessages) => {
    try {
      setBusy(id)
      const r = await connectedEmailAPI.testSync(id, { days, maxMessages })
      alert(`Test sync done: scanned ${r.scanned} messages from last ${r.days} day${r.days === 1 ? '' : 's'}, imported ${r.synced} new`)
      await load()
    } catch (e) {
      alert(e.response?.data?.error || 'Test sync failed')
    } finally { setBusy(null) }
  }

  const byProvider = (p) => accounts.filter(a => a.provider === p && a.status !== 'disconnected')

  return (
    <div className="min-h-screen bg-[var(--sf-bg-page)] p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--sf-text-primary)]">Connected Inboxes</h1>
          <p className="text-sm text-[var(--sf-text-muted)] mt-1">
            Connect Gmail or Outlook to read and reply to email conversations in the Communications Hub.
            This is separate from Notification Email (SendGrid) used for system messages.
          </p>
        </div>

        {flash && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${params.get('error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {params.get('error') ? `Error: ${params.get('error')}` : `Connected ${params.get('connected')} successfully — initial sync started.`}
          </div>
        )}

        {!configured && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 text-amber-800 text-sm">
            Connected Email is not fully configured on this server yet. An administrator needs to set the OAuth client credentials and encryption key.
          </div>
        )}

        {/* Provider cards */}
        <div className="space-y-4">
          {PROVIDERS.map(p => {
            const existing = byProvider(p.key)
            return (
              <div key={p.key} className="bg-white border border-[var(--sf-border-light)] rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${p.color}`}>
                      <Mail size={20} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[var(--sf-text-primary)]">{p.label}</h3>
                      <p className="text-xs text-[var(--sf-text-muted)] mt-0.5">{p.description}</p>
                    </div>
                  </div>
                  <button
                    disabled={busy === p.key || !configured || !providerAvail[p.key]}
                    onClick={() => connect(p.key)}
                    title={!providerAvail[p.key] ? `${p.label} OAuth credentials not configured on server` : undefined}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-[var(--sf-blue-500)] text-white hover:bg-[var(--sf-blue-600)] disabled:opacity-50">
                    <Plus size={14} /> {busy === p.key ? 'Redirecting…' : (providerAvail[p.key] ? 'Connect' : 'Not configured')}
                  </button>
                </div>

                {existing.length > 0 && (
                  <div className="mt-4 border-t border-[var(--sf-border-light)] pt-3 space-y-2">
                    {existing.map(a => (
                      <div key={a.id} className="flex items-center justify-between py-1">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[var(--sf-text-primary)] truncate">{a.email_address}</span>
                            {statusPill(a.status)}
                          </div>
                          <div className="text-xs text-[var(--sf-text-muted)] mt-0.5">
                            {a.last_sync_at ? `Last sync: ${new Date(a.last_sync_at).toLocaleString()}` : 'No sync yet'}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <SyncMenu disabled={busy === a.id} onPick={(days, max) => testSync(a.id, days, max)} />
                          <button
                            onClick={() => resync(a.id)}
                            disabled={busy === a.id}
                            title="Resync (full incremental)"
                            className="p-1.5 text-[var(--sf-text-muted)] hover:text-[var(--sf-text-primary)] rounded hover:bg-[var(--sf-bg-hover)]">
                            <RefreshCw size={16} />
                          </button>
                          <button
                            onClick={() => disconnect(a.id)}
                            disabled={busy === a.id}
                            title="Disconnect"
                            className="p-1.5 text-red-500 hover:text-red-700 rounded hover:bg-red-50">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {loading && <div className="text-sm text-[var(--sf-text-muted)] mt-4">Loading…</div>}
      </div>
    </div>
  )
}
