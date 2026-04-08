"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../../components/sidebar"
import { leadAutomationAPI } from "../../services/api"
import { ChevronLeft, Zap, Loader2 } from "lucide-react"

const EVENT_DEFS = [
  { event: 'lead_received', label: 'Lead Received', desc: 'New lead arrives from Thumbtack or Yelp' },
  { event: 'first_reply_sent', label: 'First Reply Sent', desc: 'You send the first message to the lead' },
  { event: 'conversation_ongoing', label: 'Conversation Ongoing', desc: 'Further messages exchanged before proposal' },
  { event: 'proposal_sent', label: 'Proposal / Quote Sent', desc: 'Quote or proposal sent to the customer' },
  { event: 'job_created', label: 'Job Created', desc: 'Job created for this lead — converts to customer' },
]

const LeadsSettings = () => {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null) // event being saved
  const [rules, setRules] = useState([])
  const [stages, setStages] = useState([])

  useEffect(() => {
    loadRules()
  }, [])

  const loadRules = async () => {
    setLoading(true)
    try {
      const data = await leadAutomationAPI.getRules()
      setRules(data.rules || [])
      setStages(data.stages || [])

      // Auto-seed defaults if no rules exist
      if ((data.rules || []).length === 0) {
        await leadAutomationAPI.seedDefaults()
        const refreshed = await leadAutomationAPI.getRules()
        setRules(refreshed.rules || [])
        setStages(refreshed.stages || [])
      }
    } catch (e) {
      console.error('Failed to load rules:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleStageChange = async (eventType, stageId) => {
    if (!stageId) return
    setSaving(eventType)
    try {
      for (const ch of ['thumbtack', 'yelp']) {
        await leadAutomationAPI.saveRule({
          channel: ch,
          eventType,
          targetStageId: parseInt(stageId),
          enabled: true,
          autoConvertToCustomer: eventType === 'job_created',
        })
      }
      const data = await leadAutomationAPI.getRules()
      setRules(data.rules || [])
    } catch (e) {
      alert('Failed to save: ' + (e.response?.data?.error || e.message))
    } finally {
      setSaving(null)
    }
  }

  const getRuleForEvent = (eventType) => {
    return rules.find(r => r.eventType === eventType && r.channel === 'thumbtack')
      || rules.find(r => r.eventType === eventType)
  }

  return (
    <div className="min-h-screen bg-[var(--sf-bg-page)]">
      <div>
        <div className="bg-white border-b border-[var(--sf-border-light)] px-6 py-4 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/settings')} className="p-1.5 rounded-lg hover:bg-[var(--sf-bg-hover)] text-[var(--sf-text-muted)]">
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              <Zap size={20} className="text-[var(--sf-blue-500)]" />
              <h1 className="text-lg font-bold text-[var(--sf-text-primary)]">Leads Settings</h1>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
          {/* Lead Stage Automation */}
          <section>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-[var(--sf-text-primary)]">Lead Stage Automation</h2>
              <p className="text-sm text-[var(--sf-text-muted)] mt-0.5">
                Configure how leads from Thumbtack and Yelp automatically progress through your pipeline stages.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-[var(--sf-border-light)] overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-[var(--sf-text-muted)]" />
                </div>
              ) : (
                <div className="divide-y divide-[var(--sf-border-light)]">
                  {EVENT_DEFS.map((evt, i) => {
                    const rule = getRuleForEvent(evt.event)
                    const isSaving = saving === evt.event
                    return (
                      <div key={evt.event} className="flex items-center justify-between px-5 py-4">
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-[var(--sf-blue-50)] text-[var(--sf-blue-500)] text-xs font-bold flex items-center justify-center flex-shrink-0">
                              {i + 1}
                            </span>
                            <span className="text-sm font-medium text-[var(--sf-text-primary)]">{evt.label}</span>
                          </div>
                          <p className="text-xs text-[var(--sf-text-muted)] mt-0.5 ml-8">{evt.desc}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isSaving && <Loader2 size={14} className="animate-spin text-[var(--sf-text-muted)]" />}
                          <span className="text-xs text-[var(--sf-text-muted)]">→</span>
                          <select
                            value={rule?.targetStageId || ''}
                            onChange={e => handleStageChange(evt.event, e.target.value)}
                            className="text-sm border border-[var(--sf-border-light)] rounded-lg px-3 py-1.5 bg-white min-w-[160px] focus:outline-none focus:ring-1 focus:ring-[var(--sf-blue-500)]">
                            <option value="">Select stage...</option>
                            {stages.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <p className="text-xs text-[var(--sf-text-muted)] mt-3">
              Leads only advance forward through stages — they never move backwards automatically.
              These rules apply to both Thumbtack and Yelp leads.
            </p>
          </section>

          {/* Apply to existing leads */}
          <section>
            <div className="bg-white rounded-xl border border-[var(--sf-border-light)] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--sf-text-primary)]">Apply Rules to Existing Leads</h3>
                  <p className="text-xs text-[var(--sf-text-muted)] mt-0.5">
                    Update existing leads based on their conversation history. Only advances forward.
                  </p>
                </div>
                <button onClick={async () => {
                  try {
                    const result = await leadAutomationAPI.backfill()
                    alert(`Updated ${result.updated} of ${result.total} leads`)
                  } catch (e) { alert('Failed: ' + (e.response?.data?.error || e.message)) }
                }} className="px-4 py-2 text-sm border border-[var(--sf-border-light)] rounded-lg hover:bg-[var(--sf-bg-hover)] text-[var(--sf-text-secondary)]">
                  Apply Now
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default LeadsSettings
