"use client"

import { useEffect, useMemo, useState } from "react"
import { X, MapPin, Loader2 } from "lucide-react"
import { teamAPI, territoriesAPI } from "../services/api"

// Parse the m:n column on either side. team_members.territories and
// territories.team_members are both jsonb arrays of ids stored either as a
// proper array or, due to legacy paths, as a JSON-encoded string. Tolerant.
const parseIdArray = (value) => {
  if (!value) return []
  if (Array.isArray(value)) return value.map(Number).filter(n => Number.isFinite(n))
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed.map(Number).filter(n => Number.isFinite(n))
    } catch {
      // Fallback: extract numeric ids from a plain text representation
      const matches = value.match(/\d+/g)
      if (matches) return matches.map(Number)
    }
  }
  return []
}

const AssignTerritoriesModal = ({ isOpen, onClose, member, userId, onSaved }) => {
  const [territories, setTerritories] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!isOpen || !member?.id || !userId) return
    let cancelled = false
    ;(async () => {
      setError("")
      setIsLoading(true)
      try {
        const [territoriesResp, memberResp] = await Promise.all([
          territoriesAPI.getAll(userId, { status: "active", page: 1, limit: 1000 }),
          teamAPI.getById(member.id),
        ])
        if (cancelled) return
        const list = territoriesResp.territories || territoriesResp || []
        setTerritories(list)
        const tm = memberResp?.teamMember || memberResp || {}
        setSelectedIds(parseIdArray(tm.territories))
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.error || err?.message || "Failed to load territories")
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isOpen, member?.id, userId])

  const toggle = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleSave = async () => {
    if (!member?.id) return
    setIsSaving(true)
    setError("")
    try {
      await teamAPI.update(member.id, { territories: selectedIds })
      onSaved?.(selectedIds)
      onClose?.()
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Save failed")
    } finally {
      setIsSaving(false)
    }
  }

  const memberName = useMemo(() => {
    if (!member) return ""
    return `${member.first_name || ""} ${member.last_name || ""}`.trim() || "team member"
  }, [member])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-[var(--sf-border-light)]">
          <div>
            <h3 className="text-lg font-semibold text-[var(--sf-text-primary)]">Assign Territories</h3>
            <p className="text-xs text-[var(--sf-text-muted)] mt-0.5">{memberName} can serve multiple territories</p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--sf-text-muted)] hover:text-[var(--sf-text-secondary)] p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {error && (
            <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-[var(--sf-text-muted)]">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Loading territories...
            </div>
          ) : territories.length === 0 ? (
            <div className="text-sm text-[var(--sf-text-muted)] text-center py-8">
              No territories yet. Create one in /territories first.
            </div>
          ) : (
            <ul className="space-y-1">
              {territories.map(t => {
                const checked = selectedIds.includes(t.id)
                return (
                  <li key={t.id}>
                    <label className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      checked
                        ? "bg-blue-50 border-blue-200"
                        : "bg-white border-[var(--sf-border-light)] hover:bg-[var(--sf-bg-hover)]"
                    }`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(t.id)}
                        className="h-4 w-4 text-[var(--sf-blue-500)] focus:ring-[var(--sf-blue-500)] border-[var(--sf-border-light)] rounded"
                      />
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-[var(--sf-text-primary)] truncate">
                          {t.name}
                        </div>
                        {t.location && (
                          <div className="text-xs text-[var(--sf-text-muted)] truncate">{t.location}</div>
                        )}
                      </div>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 p-5 border-t border-[var(--sf-border-light)]">
          <span className="text-xs text-[var(--sf-text-muted)]">
            {selectedIds.length} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 border border-[var(--sf-border-light)] rounded-md text-sm font-medium text-[var(--sf-text-primary)] bg-white hover:bg-[var(--sf-bg-page)] disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading || isSaving}
              className="px-4 py-2 rounded-md text-sm font-medium text-white bg-[var(--sf-blue-500)] hover:bg-[var(--sf-blue-600)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AssignTerritoriesModal
