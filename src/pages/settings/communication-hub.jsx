"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../../components/sidebar"
import { openPhoneAPI, communicationsAPI } from "../../services/api"
import {
  ChevronLeft, Phone, PhoneCall, Star, ThumbsUp, Mail,
  MessageSquare, MessageCircle, Info, Check, X, ExternalLink,
  Radio, Settings, Zap, Shield, Clock, Loader2, RefreshCw, Users
} from "lucide-react"

// ═══════════════════════════════════════════════════════════════
// Provider config (static definitions — status comes from API)
// ═══════════════════════════════════════════════════════════════

const PROVIDER_DEFS = [
  { key: 'openphone', name: 'OpenPhone', description: 'Sync texts, calls, and contacts from your OpenPhone workspace', Icon: Phone },
  { key: 'leadbridge', name: 'LeadBridge', description: 'Import Yelp and Thumbtack conversations into CRM', Icon: Zap },
  { key: 'callio', name: 'Callio', description: 'Connect your native communication workspace and business number', Icon: PhoneCall },
  { key: 'twilio', name: 'Twilio', description: 'Connect a Twilio account for advanced communication workflows', Icon: Settings },
  { key: 'whatsapp', name: 'WhatsApp', description: 'Connect WhatsApp business messaging when available', Icon: MessageCircle },
  { key: 'messenger', name: 'Messenger', description: 'Connect Facebook Messenger when available', Icon: MessageSquare },
]

const CHANNEL_DEFS = [
  { channel: 'openphone_sms', name: 'OpenPhone SMS', providerKey: 'openphone' },
  { channel: 'calls', name: 'Calls', providerKey: 'openphone' },
  { channel: 'yelp', name: 'Yelp', providerKey: 'leadbridge' },
  { channel: 'thumbtack', name: 'Thumbtack', providerKey: 'leadbridge' },
  { channel: 'email', name: 'Email', providerKey: 'email' },
  { channel: 'whatsapp', name: 'WhatsApp', providerKey: 'whatsapp' },
  { channel: 'messenger', name: 'Messenger', providerKey: 'messenger' },
]

const DEFAULT_PREFERENCES = {
  defaultSendChannel: 'last_used',
  preferredOutboundBehavior: 'original_channel',
  autoLinkByPhone: true,
  autoLinkByEmail: true,
  autoLinkBySource: true,
  showUnlinkedConversations: true,
  markReadOnOpen: true,
  defaultInboxFilter: 'recents',
  showChannelBadges: true,
  groupByLeadWhenPossible: true,
  showArchivedConversations: false,
  showCallEvents: true,
  showSystemEvents: true,
}

// ═══════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════

function StatusBadge({ status }) {
  const styles = { connected: 'bg-green-100 text-green-700', not_connected: 'bg-gray-100 text-gray-600', coming_soon: 'bg-yellow-50 text-yellow-600' }
  const labels = { connected: 'Connected', not_connected: 'Not connected', coming_soon: 'Coming soon' }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] || styles.not_connected}`}>{labels[status] || status}</span>
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-[var(--sf-text-primary)]">{title}</h2>
      {subtitle && <p className="text-sm text-[var(--sf-text-muted)] mt-0.5">{subtitle}</p>}
    </div>
  )
}

function Toggle({ checked, onChange, label, helpText }) {
  return (
    <label className="flex items-start justify-between py-3 cursor-pointer group">
      <div className="pr-4">
        <div className="text-sm font-medium text-[var(--sf-text-primary)] group-hover:text-[var(--sf-blue-500)] transition-colors">{label}</div>
        {helpText && <div className="text-xs text-[var(--sf-text-muted)] mt-0.5">{helpText}</div>}
      </div>
      <div className="flex-shrink-0 relative">
        <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
        <div className={`w-10 h-6 rounded-full transition-colors ${checked ? 'bg-[var(--sf-blue-500)]' : 'bg-gray-300'}`}>
          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
        </div>
      </div>
    </label>
  )
}

function SelectControl({ label, helpText, value, onChange, options }) {
  return (
    <div className="py-3">
      <label className="text-sm font-medium text-[var(--sf-text-primary)] block mb-1">{label}</label>
      {helpText && <p className="text-xs text-[var(--sf-text-muted)] mb-2">{helpText}</p>}
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full sm:w-auto min-w-[280px] border border-[var(--sf-border-light)] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[var(--sf-blue-500)]">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════

const CommunicationHub = () => {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  // Connection state
  const [connected, setConnected] = useState(false)
  const [phoneNumbers, setPhoneNumbers] = useState([])
  const [connectedAt, setConnectedAt] = useState(null)

  // Connect modal
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState('')

  // Sync
  const [syncing, setSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState(null) // { status, total, synced, messages }
  const [syncResult, setSyncResult] = useState(null)

  // Preferences
  const [prefs, setPrefs] = useState(DEFAULT_PREFERENCES)
  const [hasChanges, setHasChanges] = useState(false)

  // Load status on mount
  useEffect(() => {
    loadStatus()
  }, [])

  const loadStatus = async () => {
    try {
      setLoading(true)
      const status = await openPhoneAPI.getStatus()
      setConnected(status.connected)
      setPhoneNumbers(status.phoneNumbers || [])
      setConnectedAt(status.connectedAt)
      if (status.preferences && Object.keys(status.preferences).length > 0) {
        setPrefs(prev => ({ ...prev, ...status.preferences }))
      }
    } catch (e) {
      console.error('Failed to load status:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    if (!apiKeyInput.trim()) { setConnectError('API key is required'); return }
    setConnecting(true); setConnectError('')
    try {
      const result = await openPhoneAPI.connect(apiKeyInput.trim())
      setConnected(true)
      setPhoneNumbers(result.phoneNumbers || [])
      setConnectedAt(new Date().toISOString())
      setShowConnectModal(false)
      setApiKeyInput('')
    } catch (e) {
      setConnectError(e.response?.data?.error || 'Failed to connect. Check your API key.')
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect OpenPhone? Webhooks will stop and no new messages will sync.')) return
    try {
      await openPhoneAPI.disconnect()
      setConnected(false); setPhoneNumbers([]); setConnectedAt(null)
    } catch (e) { alert('Failed to disconnect') }
  }

  const handleSync = async (limit) => {
    setSyncing(true); setSyncResult(null); setSyncProgress({ status: 'running', total: 0, synced: 0, messages: 0, phase: 'starting' })
    try {
      // Fire and forget — don't await, start polling immediately
      openPhoneAPI.sync(limit || undefined).catch(e => console.warn('Sync request:', e.message))
      // Poll progress every 1.5s
      const pollInterval = setInterval(async () => {
        try {
          const progress = await openPhoneAPI.getSyncProgress()
          setSyncProgress(progress)
          if (progress.status === 'complete' || progress.status === 'error') {
            clearInterval(pollInterval)
            setSyncing(false)
            if (progress.status === 'complete') {
              setSyncResult({ conversations: progress.synced, messages: progress.messages })
            } else if (progress.status === 'error') {
              alert('Sync error: ' + (progress.error || 'Unknown'))
            }
          }
        } catch (e) { /* keep polling */ }
      }, 3000)
      // Safety timeout: stop polling after 10 minutes
      setTimeout(() => { clearInterval(pollInterval); if (syncing) setSyncing(false) }, 600000)
    } catch (e) {
      alert('Sync failed: ' + (e.response?.data?.error || e.message))
      setSyncing(false)
    }
  }

  const updatePref = (key, value) => {
    setPrefs(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSavePrefs = async () => {
    try {
      await communicationsAPI.savePreferences(prefs)
      setHasChanges(false)
    } catch (e) { alert('Failed to save preferences') }
  }

  // Determine provider statuses
  const getProviderStatus = (key) => {
    if (key === 'openphone') return connected ? 'connected' : 'not_connected'
    if (['whatsapp', 'messenger'].includes(key)) return 'coming_soon'
    return 'not_connected'
  }

  return (
    <div className="min-h-screen bg-[var(--sf-bg-page)]">
      <div>
        {/* Header */}
        <div className="bg-white border-b border-[var(--sf-border-light)] px-6 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button onClick={() => navigate("/settings")} className="flex items-center space-x-2 text-[var(--sf-text-secondary)] hover:text-[var(--sf-text-primary)]">
                <ChevronLeft className="w-5 h-5" /><span className="text-sm">Settings</span>
              </button>
              <h1 className="text-xl font-semibold text-[var(--sf-text-primary)]">Communication Hub</h1>
            </div>
            {hasChanges && (
              <button onClick={handleSavePrefs} className="px-4 py-2 bg-[var(--sf-blue-500)] text-white text-sm font-medium rounded-lg hover:bg-[var(--sf-blue-600)]">
                Save Changes
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-20"><Loader2 size={32} className="animate-spin text-[var(--sf-text-muted)]" /></div>
        ) : (
        <div className="p-6 space-y-8">

          {/* ═══ Section 1: Connected Providers ═══ */}
          <section>
            <SectionHeader title="Connected Communication Providers" subtitle="Manage the communication platforms connected to your CRM" />
            <div className="grid gap-3">
              {PROVIDER_DEFS.map(p => {
                const status = getProviderStatus(p.key)
                const isOpenPhone = p.key === 'openphone'
                return (
                  <div key={p.key} className={`bg-white rounded-xl border border-[var(--sf-border-light)] overflow-hidden ${status === 'coming_soon' ? 'opacity-60' : ''}`}>
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-2.5 rounded-lg ${status === 'connected' ? 'bg-green-50 text-green-600' : status === 'coming_soon' ? 'bg-yellow-50 text-yellow-500' : 'bg-gray-100 text-gray-400'}`}>
                          <p.Icon size={22} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[var(--sf-text-primary)]">{p.name}</span>
                            <StatusBadge status={status} />
                          </div>
                          <p className="text-xs text-[var(--sf-text-muted)] mt-0.5">{p.description}</p>
                          {status === 'connected' && isOpenPhone && (
                            <div className="mt-1 flex flex-wrap gap-2">
                              {phoneNumbers.map((pn, i) => (
                                <span key={i} className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                                  <Phone size={10} />
                                  {pn.name}: {pn.number}
                                  <span className="text-green-500">
                                    {pn.capabilities?.sms ? ' SMS' : ''}{pn.capabilities?.voice ? ' Voice' : ''}
                                  </span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {status === 'connected' && isOpenPhone && (
                          <>
                            <button onClick={() => handleSync(10)} disabled={syncing}
                              className="px-3 py-1.5 text-xs font-medium bg-[var(--sf-blue-500)] text-white rounded-lg hover:bg-[var(--sf-blue-600)] disabled:opacity-50 flex items-center gap-1">
                              {syncing ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />} Test (10)
                            </button>
                            <button onClick={() => handleSync()} disabled={syncing}
                              className="px-3 py-1.5 text-xs font-medium border border-[var(--sf-border-light)] rounded-lg hover:bg-[var(--sf-bg-hover)] text-[var(--sf-text-secondary)] disabled:opacity-50 flex items-center gap-1">
                              {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Sync All
                            </button>
                            <button onClick={async () => {
                                try {
                                  const r = await openPhoneAPI.relink()
                                  alert(`Re-linked ${r.linked}/${r.total} conversations to customers`)
                                } catch (e) { alert('Re-link failed') }
                              }}
                              className="px-3 py-1.5 text-xs font-medium border border-[var(--sf-border-light)] rounded-lg hover:bg-[var(--sf-bg-hover)] text-[var(--sf-text-secondary)] flex items-center gap-1">
                              <Users size={12} /> Re-link
                            </button>
                            <button onClick={handleDisconnect}
                              className="px-3 py-1.5 text-xs font-medium border border-red-200 rounded-lg hover:bg-red-50 text-red-600">
                              Disconnect
                            </button>
                          </>
                        )}
                        {status === 'not_connected' && isOpenPhone && (
                          <button onClick={() => { setShowConnectModal(true); setConnectError('') }}
                            className="px-3 py-1.5 text-xs font-medium bg-[var(--sf-blue-500)] text-white rounded-lg hover:bg-[var(--sf-blue-600)]">
                            Connect
                          </button>
                        )}
                        {status === 'coming_soon' && <span className="text-xs text-[var(--sf-text-muted)]">Coming soon</span>}
                      </div>
                    </div>
                    {/* Progress bar inside OpenPhone card */}
                    {isOpenPhone && syncing && (
                      <div className="px-4 pb-4">
                        <div className="bg-[var(--sf-bg-input)] rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-[var(--sf-text-primary)]">
                              {syncProgress?.phase === 'fetching' ? 'Counting conversations...' : 'Syncing...'}
                            </span>
                            <span className="text-xs text-[var(--sf-text-muted)]">
                              {syncProgress ? `${syncProgress.synced}/${syncProgress.total} convs, ${syncProgress.messages} msgs` : 'Starting...'}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div className="bg-[var(--sf-blue-500)] h-1.5 rounded-full transition-all"
                              style={{ width: `${syncProgress?.total > 0 ? Math.round((syncProgress.synced / syncProgress.total) * 100) : 5}%` }} />
                          </div>
                          {syncProgress?.errors > 0 && <p className="text-[10px] text-red-500 mt-1">{syncProgress.errors} errors</p>}
                        </div>
                      </div>
                    )}
                    {/* Sync result inside OpenPhone card */}
                    {isOpenPhone && syncResult && !syncing && (
                      <div className="px-4 pb-4">
                        <div className="bg-green-50 rounded-lg p-3 text-xs text-green-700">
                          Synced {syncResult.conversations} conversations, {syncResult.messages} messages
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {syncResult && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                Synced {syncResult.conversations} conversations, {syncResult.messages} messages
              </div>
            )}
          </section>

          {/* ═══ Section 2: Available Channels ═══ */}
          <section>
            <SectionHeader title="Available Communication Channels" subtitle="Channels available in your CRM Communications inbox" />
            <div className="bg-white rounded-xl border border-[var(--sf-border-light)] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--sf-border-light)] bg-[var(--sf-bg-input)]">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--sf-text-muted)] uppercase">Channel</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--sf-text-muted)] uppercase">Provider</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--sf-text-muted)] uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--sf-border-light)]">
                  {CHANNEL_DEFS.map(ch => {
                    const providerConnected = getProviderStatus(ch.providerKey) === 'connected'
                    return (
                      <tr key={ch.channel} className={providerConnected ? '' : 'opacity-50'}>
                        <td className="px-4 py-3 font-medium text-[var(--sf-text-primary)]">{ch.name}</td>
                        <td className="px-4 py-3 text-[var(--sf-text-muted)]">{PROVIDER_DEFS.find(p => p.key === ch.providerKey)?.name || ch.providerKey}</td>
                        <td className="px-4 py-3">
                          {providerConnected ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-600"><Check size={14} /> Active</span>
                          ) : (
                            <span className="text-xs text-[var(--sf-text-muted)]">Not configured</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* ═══ Section 3: Default Behavior ═══ */}
          <section>
            <SectionHeader title="Default Communication Behavior" subtitle="Control how CRM chooses communication methods" />
            <div className="bg-white rounded-xl border border-[var(--sf-border-light)] p-5 space-y-1 divide-y divide-[var(--sf-border-light)]">
              <SelectControl label="Default send channel" helpText="The default channel selected in the conversation composer"
                value={prefs.defaultSendChannel} onChange={v => updatePref('defaultSendChannel', v)}
                options={[{ value: 'last_used', label: 'Last used channel' }, { value: 'openphone', label: 'OpenPhone' }, { value: 'leadbridge', label: 'LeadBridge channel' }]} />
              <SelectControl label="Preferred outbound channel" helpText="How to choose the channel for ongoing conversations"
                value={prefs.preferredOutboundBehavior} onChange={v => updatePref('preferredOutboundBehavior', v)}
                options={[{ value: 'original_channel', label: 'Keep using original source channel' }, { value: 'prefer_openphone', label: 'Prefer OpenPhone' }, { value: 'ask_each_time', label: 'Ask each time' }]} />
            </div>
          </section>

          {/* ═══ Section 4: Linking Rules ═══ */}
          <section>
            <SectionHeader title="Conversation Linking Rules" subtitle="How messages and calls attach to CRM leads and customers" />
            <div className="bg-white rounded-xl border border-[var(--sf-border-light)] p-5 divide-y divide-[var(--sf-border-light)]">
              <Toggle label="Auto-link by exact phone match" helpText="Match conversations to customers/leads with the same phone number" checked={prefs.autoLinkByPhone} onChange={v => updatePref('autoLinkByPhone', v)} />
              <Toggle label="Auto-link by exact email match" checked={prefs.autoLinkByEmail} onChange={v => updatePref('autoLinkByEmail', v)} />
              <Toggle label="Auto-link by existing source mapping" helpText="Match using known provider IDs" checked={prefs.autoLinkBySource} onChange={v => updatePref('autoLinkBySource', v)} />
              <Toggle label="Show unlinked conversations in inbox" helpText="Display conversations not matched to a CRM lead" checked={prefs.showUnlinkedConversations} onChange={v => updatePref('showUnlinkedConversations', v)} />
            </div>
          </section>

          {/* ═══ Section 5: Inbox Preferences ═══ */}
          <section>
            <SectionHeader title="Inbox Preferences" subtitle="Configure how the Communications screen behaves" />
            <div className="bg-white rounded-xl border border-[var(--sf-border-light)] p-5 divide-y divide-[var(--sf-border-light)]">
              <SelectControl label="Default inbox filter on load" value={prefs.defaultInboxFilter} onChange={v => updatePref('defaultInboxFilter', v)}
                options={[{ value: 'unread', label: 'Unread' }, { value: 'recents', label: 'Recents' }, { value: 'all', label: 'All' }]} />
              <Toggle label="Mark conversation as read when opened" checked={prefs.markReadOnOpen} onChange={v => updatePref('markReadOnOpen', v)} />
              <Toggle label="Display channel badges in conversation list" checked={prefs.showChannelBadges} onChange={v => updatePref('showChannelBadges', v)} />
              <Toggle label="Group conversations by lead when possible" checked={prefs.groupByLeadWhenPossible} onChange={v => updatePref('groupByLeadWhenPossible', v)} />
              <Toggle label="Show archived conversations" checked={prefs.showArchivedConversations} onChange={v => updatePref('showArchivedConversations', v)} />
              <Toggle label="Show call events in timeline" checked={prefs.showCallEvents} onChange={v => updatePref('showCallEvents', v)} />
              <Toggle label="Show system events in timeline" checked={prefs.showSystemEvents} onChange={v => updatePref('showSystemEvents', v)} />
            </div>
          </section>

          {/* ═══ Section 6: Business Numbers ═══ */}
          <section>
            <SectionHeader title="Connected Business Numbers" subtitle="Communication numbers available from connected providers" />
            {phoneNumbers.length > 0 ? (
              <div className="bg-white rounded-xl border border-[var(--sf-border-light)] overflow-hidden divide-y divide-[var(--sf-border-light)]">
                {phoneNumbers.map((pn, i) => (
                  <div key={i} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-[var(--sf-text-primary)]">{pn.number || pn.phoneNumber || pn}</div>
                      <div className="text-xs text-[var(--sf-text-muted)]">via OpenPhone {pn.name ? `· ${pn.name}` : ''}</div>
                    </div>
                    <div className="flex gap-1.5">
                      {(Array.isArray(pn.capabilities)
                        ? pn.capabilities.map(c => typeof c === 'string' ? c : c.type || 'SMS')
                        : typeof pn.capabilities === 'object' && pn.capabilities
                          ? Object.keys(pn.capabilities).filter(k => pn.capabilities[k])
                          : ['SMS', 'Voice']
                      ).map(cap => (
                        <span key={cap} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--sf-blue-50)] text-[var(--sf-blue-500)] font-medium uppercase">{cap}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-[var(--sf-border-light)] p-6 text-center text-[var(--sf-text-muted)] text-sm">
                No business numbers connected. Connect a provider above to see available numbers.
              </div>
            )}
          </section>

          {/* ═══ Section 7: Coming Soon ═══ */}
          <section className="opacity-60">
            <SectionHeader title="Coming Soon" subtitle="Features planned for future releases" />
            <div className="bg-white rounded-xl border border-dashed border-[var(--sf-border)] p-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[{ icon: Zap, label: 'Channel-specific routing' }, { icon: Shield, label: 'Assignment rules' }, { icon: Clock, label: 'SLA rules' }, { icon: MessageSquare, label: 'AI reply behavior' }, { icon: Mail, label: 'Templates by channel' }, { icon: Settings, label: 'Shared inbox permissions' }].map(f => (
                  <div key={f.label} className="flex items-center gap-2 text-xs text-[var(--sf-text-muted)] p-2"><f.icon size={14} /> {f.label}</div>
                ))}
              </div>
            </div>
          </section>

        </div>
        )}
      </div>

      {/* Connect Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-[var(--sf-text-primary)] mb-2">Connect OpenPhone</h3>
            <p className="text-sm text-[var(--sf-text-muted)] mb-4">Enter your OpenPhone API key. You can find it in OpenPhone Settings → API.</p>
            {connectError && <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">{connectError}</div>}
            <input type="password" value={apiKeyInput} onChange={e => setApiKeyInput(e.target.value)} placeholder="Enter OpenPhone API key"
              className="w-full border border-[var(--sf-border-light)] rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-1 focus:ring-[var(--sf-blue-500)]" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowConnectModal(false)} className="px-4 py-2 text-sm text-[var(--sf-text-secondary)] hover:text-[var(--sf-text-primary)]">Cancel</button>
              <button onClick={handleConnect} disabled={connecting}
                className="px-4 py-2 text-sm bg-[var(--sf-blue-500)] text-white rounded-lg hover:bg-[var(--sf-blue-600)] disabled:opacity-50 flex items-center gap-2">
                {connecting && <Loader2 size={14} className="animate-spin" />} {connecting ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CommunicationHub
