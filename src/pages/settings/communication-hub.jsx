"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../../components/sidebar"
import {
  ChevronLeft, Phone, PhoneCall, Star, ThumbsUp, Mail,
  MessageSquare, MessageCircle, Info, Check, X, ExternalLink,
  Radio, Settings, Zap, Shield, Clock
} from "lucide-react"

// ═══════════════════════════════════════════════════════════════
// Mock data — replace with API calls when backend is ready
// ═══════════════════════════════════════════════════════════════

const PROVIDERS = [
  { key: 'leadbridge', name: 'LeadBridge', description: 'Import Yelp and Thumbtack conversations into CRM', status: 'connected', connectedLabel: 'Connected via API key', Icon: Zap },
  { key: 'openphone', name: 'OpenPhone', description: 'Sync texts, calls, and contacts from your OpenPhone workspace', status: 'connected', connectedLabel: 'Workspace: My Business', Icon: Phone },
  { key: 'callio', name: 'Callio', description: 'Connect your native communication workspace and business number', status: 'not_connected', connectedLabel: null, Icon: PhoneCall },
  { key: 'twilio', name: 'Twilio', description: 'Connect a Twilio account for advanced communication workflows', status: 'not_connected', connectedLabel: null, Icon: Settings },
  { key: 'whatsapp', name: 'WhatsApp', description: 'Connect WhatsApp business messaging when available', status: 'coming_soon', connectedLabel: null, Icon: MessageCircle },
  { key: 'messenger', name: 'Messenger', description: 'Connect Facebook Messenger when available', status: 'coming_soon', connectedLabel: null, Icon: MessageSquare },
]

const CHANNELS = [
  { channel: 'yelp', name: 'Yelp', provider: 'LeadBridge', enabled: true, statusLabel: 'Active' },
  { channel: 'thumbtack', name: 'Thumbtack', provider: 'LeadBridge', enabled: true, statusLabel: 'Active' },
  { channel: 'openphone_sms', name: 'OpenPhone SMS', provider: 'OpenPhone', enabled: true, statusLabel: 'Active' },
  { channel: 'calls', name: 'Calls', provider: 'Callio / Twilio', enabled: false, statusLabel: 'Not configured' },
  { channel: 'email', name: 'Email', provider: 'Direct', enabled: false, statusLabel: 'Coming soon' },
  { channel: 'whatsapp', name: 'WhatsApp', provider: 'WhatsApp Business', enabled: false, statusLabel: 'Coming soon' },
  { channel: 'messenger', name: 'Messenger', provider: 'Facebook', enabled: false, statusLabel: 'Coming soon' },
]

const BUSINESS_NUMBERS = [
  { number: '(555) 100-2000', owner: 'OpenPhone', capabilities: ['SMS', 'Voice'], role: 'Main inbox' },
  { number: '(555) 200-3000', owner: 'LeadBridge', capabilities: ['SMS'], role: 'Lead response' },
]

const DEFAULT_SETTINGS = {
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
  const styles = {
    connected: 'bg-green-100 text-green-700',
    not_connected: 'bg-gray-100 text-gray-600',
    coming_soon: 'bg-yellow-50 text-yellow-600',
  }
  const labels = {
    connected: 'Connected',
    not_connected: 'Not connected',
    coming_soon: 'Coming soon',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] || styles.not_connected}`}>
      {labels[status] || status}
    </span>
  )
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
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [hasChanges, setHasChanges] = useState(false)

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = () => {
    console.log('Saving communication settings:', settings)
    setHasChanges(false)
    // TODO: call PUT /communication-settings/preferences
  }

  return (
    <div className="min-h-screen bg-[var(--sf-bg-page)]">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-[260px]">
        {/* Header with back button */}
        <div className="bg-white border-b border-[var(--sf-border-light)] px-6 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button onClick={() => navigate("/settings")}
                className="flex items-center space-x-2 text-[var(--sf-text-secondary)] hover:text-[var(--sf-text-primary)]">
                <ChevronLeft className="w-5 h-5" />
                <span className="text-sm">Settings</span>
              </button>
              <h1 className="text-xl font-semibold text-[var(--sf-text-primary)]">Communication Hub</h1>
            </div>
            {hasChanges && (
              <button onClick={handleSave}
                className="px-4 py-2 bg-[var(--sf-blue-500)] text-white text-sm font-medium rounded-lg hover:bg-[var(--sf-blue-600)] transition-colors">
                Save Changes
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto p-6 space-y-8">

          {/* ═══ Section 1: Connected Providers ═══ */}
          <section>
            <SectionHeader title="Connected Communication Providers" subtitle="Manage the communication platforms connected to your CRM" />
            <div className="grid gap-3">
              {PROVIDERS.map(p => (
                <div key={p.key} className={`bg-white rounded-xl border border-[var(--sf-border-light)] p-4 flex items-center justify-between ${p.status === 'coming_soon' ? 'opacity-60' : ''}`}>
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-lg ${
                      p.status === 'connected' ? 'bg-green-50 text-green-600' :
                      p.status === 'coming_soon' ? 'bg-yellow-50 text-yellow-500' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      <p.Icon size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--sf-text-primary)]">{p.name}</span>
                        <StatusBadge status={p.status} />
                      </div>
                      <p className="text-xs text-[var(--sf-text-muted)] mt-0.5">{p.description}</p>
                      {p.connectedLabel && <p className="text-xs text-green-600 mt-0.5">{p.connectedLabel}</p>}
                    </div>
                  </div>
                  <div>
                    {p.status === 'connected' && (
                      <button className="px-3 py-1.5 text-xs font-medium border border-[var(--sf-border-light)] rounded-lg hover:bg-[var(--sf-bg-hover)] text-[var(--sf-text-secondary)]">
                        Manage
                      </button>
                    )}
                    {p.status === 'not_connected' && (
                      <button className="px-3 py-1.5 text-xs font-medium bg-[var(--sf-blue-500)] text-white rounded-lg hover:bg-[var(--sf-blue-600)]">
                        Connect
                      </button>
                    )}
                    {p.status === 'coming_soon' && (
                      <span className="text-xs text-[var(--sf-text-muted)]">Coming soon</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
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
                  {CHANNELS.map(ch => (
                    <tr key={ch.channel} className={ch.enabled ? '' : 'opacity-50'}>
                      <td className="px-4 py-3 font-medium text-[var(--sf-text-primary)]">{ch.name}</td>
                      <td className="px-4 py-3 text-[var(--sf-text-muted)]">{ch.provider}</td>
                      <td className="px-4 py-3">
                        {ch.enabled ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600"><Check size={14} /> {ch.statusLabel}</span>
                        ) : (
                          <span className="text-xs text-[var(--sf-text-muted)]">{ch.statusLabel}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ═══ Section 3: Default Communication Behavior ═══ */}
          <section>
            <SectionHeader title="Default Communication Behavior" subtitle="Control how CRM chooses communication methods in the unified inbox" />
            <div className="bg-white rounded-xl border border-[var(--sf-border-light)] p-5 space-y-1 divide-y divide-[var(--sf-border-light)]">
              <SelectControl
                label="Default send channel"
                helpText="The default channel selected in the conversation composer"
                value={settings.defaultSendChannel}
                onChange={v => updateSetting('defaultSendChannel', v)}
                options={[
                  { value: 'last_used', label: 'Last used channel' },
                  { value: 'openphone', label: 'OpenPhone' },
                  { value: 'leadbridge', label: 'LeadBridge channel (when available)' },
                  { value: 'callio', label: 'Callio (when available)' },
                ]}
              />
              <SelectControl
                label="Preferred outbound channel for ongoing conversations"
                helpText="How to choose the channel when continuing an existing conversation"
                value={settings.preferredOutboundBehavior}
                onChange={v => updateSetting('preferredOutboundBehavior', v)}
                options={[
                  { value: 'original_channel', label: 'Keep using original source channel when possible' },
                  { value: 'prefer_openphone', label: 'Prefer OpenPhone for direct messaging' },
                  { value: 'prefer_callio', label: 'Prefer Callio' },
                  { value: 'ask_each_time', label: 'Ask user each time' },
                ]}
              />
            </div>
          </section>

          {/* ═══ Section 4: Conversation Linking Rules ═══ */}
          <section>
            <SectionHeader title="Conversation Linking Rules" subtitle="How messages and calls from connected providers attach to CRM leads" />
            <div className="bg-white rounded-xl border border-[var(--sf-border-light)] p-5 divide-y divide-[var(--sf-border-light)]">
              <Toggle label="Auto-link by exact phone match" helpText="Automatically match conversations to leads with the same phone number" checked={settings.autoLinkByPhone} onChange={v => updateSetting('autoLinkByPhone', v)} />
              <Toggle label="Auto-link by exact email match" helpText="Automatically match conversations to leads with the same email" checked={settings.autoLinkByEmail} onChange={v => updateSetting('autoLinkByEmail', v)} />
              <Toggle label="Auto-link by existing source mapping" helpText="Match conversations using known provider IDs (e.g., Yelp lead ID)" checked={settings.autoLinkBySource} onChange={v => updateSetting('autoLinkBySource', v)} />
              <Toggle label="Show unlinked conversations in inbox" helpText="Display conversations that haven't been matched to a CRM lead" checked={settings.showUnlinkedConversations} onChange={v => updateSetting('showUnlinkedConversations', v)} />
            </div>
          </section>

          {/* ═══ Section 5: Inbox Preferences ═══ */}
          <section>
            <SectionHeader title="Inbox Preferences" subtitle="Configure how the Communications screen behaves" />
            <div className="bg-white rounded-xl border border-[var(--sf-border-light)] p-5 divide-y divide-[var(--sf-border-light)]">
              <SelectControl
                label="Default inbox filter on load"
                value={settings.defaultInboxFilter}
                onChange={v => updateSetting('defaultInboxFilter', v)}
                options={[
                  { value: 'unread', label: 'Unread' },
                  { value: 'recents', label: 'Recents' },
                  { value: 'all', label: 'All' },
                ]}
              />
              <Toggle label="Mark conversation as read when opened" checked={settings.markReadOnOpen} onChange={v => updateSetting('markReadOnOpen', v)} />
              <Toggle label="Display channel badges in conversation list" helpText="Show small icons for each channel on conversation rows" checked={settings.showChannelBadges} onChange={v => updateSetting('showChannelBadges', v)} />
              <Toggle label="Group conversations by lead when possible" helpText="Merge related conversations from different channels into one thread" checked={settings.groupByLeadWhenPossible} onChange={v => updateSetting('groupByLeadWhenPossible', v)} />
              <Toggle label="Show archived conversations" checked={settings.showArchivedConversations} onChange={v => updateSetting('showArchivedConversations', v)} />
              <Toggle label="Show call events in timeline" checked={settings.showCallEvents} onChange={v => updateSetting('showCallEvents', v)} />
              <Toggle label="Show system events in timeline" helpText="Display auto-replies, lead creation, and other system events" checked={settings.showSystemEvents} onChange={v => updateSetting('showSystemEvents', v)} />
            </div>
          </section>

          {/* ═══ Section 6: Business Numbers ═══ */}
          <section>
            <SectionHeader title="Connected Business Numbers" subtitle="Communication numbers available to your business from connected providers" />
            {BUSINESS_NUMBERS.length > 0 ? (
              <div className="bg-white rounded-xl border border-[var(--sf-border-light)] overflow-hidden">
                <div className="divide-y divide-[var(--sf-border-light)]">
                  {BUSINESS_NUMBERS.map((bn, i) => (
                    <div key={i} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-[var(--sf-text-primary)]">{bn.number}</div>
                        <div className="text-xs text-[var(--sf-text-muted)]">
                          via {bn.owner} &middot; {bn.role}
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        {bn.capabilities.map(cap => (
                          <span key={cap} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--sf-blue-50)] text-[var(--sf-blue-500)] font-medium">{cap}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
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
                {[
                  { icon: Zap, label: 'Channel-specific routing' },
                  { icon: Shield, label: 'Assignment rules' },
                  { icon: Clock, label: 'SLA rules' },
                  { icon: MessageSquare, label: 'AI reply behavior' },
                  { icon: Mail, label: 'Templates by channel' },
                  { icon: Settings, label: 'Shared inbox permissions' },
                ].map(f => (
                  <div key={f.label} className="flex items-center gap-2 text-xs text-[var(--sf-text-muted)] p-2">
                    <f.icon size={14} /> {f.label}
                  </div>
                ))}
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}

export default CommunicationHub
