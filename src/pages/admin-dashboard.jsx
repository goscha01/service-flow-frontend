"use client"

import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import api from "../services/api"
import { useAuth } from "../context/AuthContext"
import {
  Users, Radio, Server, Key, Check, X, Loader2, RefreshCw,
  Shield, ChevronLeft, Eye, EyeOff, Database, Zap, Clock
} from "lucide-react"

// ═══════════════════════════════════════════════════════════════
// Admin Dashboard — platform-level management
// ═══════════════════════════════════════════════════════════════

const AdminDashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Global settings
  const [sigcoreUrl, setSigcoreUrl] = useState('')
  const [sigcoreWorkspaceKey, setSigcoreWorkspaceKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [globalLoading, setGlobalLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [sigcoreStatus, setSigcoreStatus] = useState(null) // null | 'connected' | 'error'

  // Users
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(true)

  // Load on mount
  useEffect(() => {
    loadGlobalSettings()
    loadUsers()
  }, [])

  const loadGlobalSettings = async () => {
    try {
      setGlobalLoading(true)
      const { data } = await api.get('/admin/global-settings')
      setSigcoreUrl(data.sigcoreUrl || '')
      setSigcoreWorkspaceKey(data.sigcoreWorkspaceKey || '')
      setSigcoreStatus(data.sigcoreConnected ? 'connected' : null)
    } catch (e) {
      console.error('Failed to load admin settings:', e)
    } finally {
      setGlobalLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      setUsersLoading(true)
      const { data } = await api.get('/admin/users')
      setUsers(data.users || [])
    } catch (e) {
      console.error('Failed to load users:', e)
    } finally {
      setUsersLoading(false)
    }
  }

  const handleSaveGlobal = async () => {
    setSaving(true)
    try {
      await api.put('/admin/global-settings', { sigcoreUrl, sigcoreWorkspaceKey })
      alert('Settings saved')
    } catch (e) {
      alert('Failed to save: ' + (e.response?.data?.error || e.message))
    } finally {
      setSaving(false)
    }
  }

  const handleTestSigcore = async () => {
    setTestingConnection(true)
    setSigcoreStatus(null)
    try {
      const { data } = await api.post('/admin/test-sigcore')
      setSigcoreStatus(data.connected ? 'connected' : 'error')
      if (!data.connected) alert('Connection failed: ' + (data.error || 'Unknown error'))
    } catch (e) {
      setSigcoreStatus('error')
      alert('Connection test failed: ' + (e.response?.data?.error || e.message))
    } finally {
      setTestingConnection(false)
    }
  }

  if (!user) {
    return <div className="min-h-screen bg-[var(--sf-bg-page)] flex items-center justify-center"><p>Please log in</p></div>
  }

  return (
    <div className="min-h-screen bg-[var(--sf-bg-page)]">
      {/* Header */}
      <div className="bg-white border-b border-[var(--sf-border-light)] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/settings')} className="text-[var(--sf-text-muted)] hover:text-[var(--sf-text-primary)]">
              <ChevronLeft size={20} />
            </button>
            <Shield size={24} className="text-[var(--sf-blue-500)]" />
            <div>
              <h1 className="text-xl font-bold text-[var(--sf-text-primary)]">Admin Dashboard</h1>
              <p className="text-xs text-[var(--sf-text-muted)]">Platform-level settings and user management</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-8">

        {/* ═══ Sigcore Connection ═══ */}
        <section className="bg-white rounded-xl border border-[var(--sf-border-light)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--sf-border-light)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg"><Server size={20} className="text-purple-600" /></div>
              <div>
                <h2 className="text-base font-semibold text-[var(--sf-text-primary)]">Sigcore Communication Platform</h2>
                <p className="text-xs text-[var(--sf-text-muted)]">Global connection — powers all user communications</p>
              </div>
            </div>
            {sigcoreStatus === 'connected' && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
                <Check size={14} /> Connected
              </span>
            )}
            {sigcoreStatus === 'error' && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 px-3 py-1 rounded-full">
                <X size={14} /> Connection Error
              </span>
            )}
          </div>

          {globalLoading ? (
            <div className="p-8 text-center"><Loader2 size={24} className="animate-spin mx-auto text-[var(--sf-text-muted)]" /></div>
          ) : (
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-[var(--sf-text-primary)] block mb-1">Sigcore API URL</label>
                <input type="text" value={sigcoreUrl} onChange={e => setSigcoreUrl(e.target.value)}
                  placeholder="https://sigcore-production.up.railway.app/api"
                  className="w-full border border-[var(--sf-border-light)] rounded-lg px-3 py-2 text-sm bg-[var(--sf-bg-input)] focus:outline-none focus:ring-1 focus:ring-[var(--sf-blue-500)]" />
                <p className="text-xs text-[var(--sf-text-muted)] mt-1">The Sigcore backend URL (e.g., Railway production service)</p>
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--sf-text-primary)] block mb-1">Workspace API Key</label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input type={showKey ? 'text' : 'password'} value={sigcoreWorkspaceKey} onChange={e => setSigcoreWorkspaceKey(e.target.value)}
                      placeholder="sc_workspace_..."
                      className="w-full border border-[var(--sf-border-light)] rounded-lg px-3 py-2 pr-10 text-sm bg-[var(--sf-bg-input)] focus:outline-none focus:ring-1 focus:ring-[var(--sf-blue-500)] font-mono" />
                    <button onClick={() => setShowKey(!showKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--sf-text-muted)] hover:text-[var(--sf-text-primary)]">
                      {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-[var(--sf-text-muted)] mt-1">Provisioned from Sigcore admin — used to create tenant keys for each SF user</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={handleSaveGlobal} disabled={saving}
                  className="px-4 py-2 text-sm bg-[var(--sf-blue-500)] text-white rounded-lg hover:bg-[var(--sf-blue-600)] disabled:opacity-50 flex items-center gap-2">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />} Save
                </button>
                <button onClick={handleTestSigcore} disabled={testingConnection}
                  className="px-4 py-2 text-sm border border-[var(--sf-border-light)] text-[var(--sf-text-secondary)] rounded-lg hover:bg-[var(--sf-bg-hover)] disabled:opacity-50 flex items-center gap-2">
                  {testingConnection ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} Test Connection
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ═══ Users ═══ */}
        <section className="bg-white rounded-xl border border-[var(--sf-border-light)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--sf-border-light)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg"><Users size={20} className="text-[var(--sf-blue-500)]" /></div>
              <div>
                <h2 className="text-base font-semibold text-[var(--sf-text-primary)]">Service Flow Users</h2>
                <p className="text-xs text-[var(--sf-text-muted)]">{users.length} registered users</p>
              </div>
            </div>
            <button onClick={loadUsers} className="p-2 text-[var(--sf-text-muted)] hover:text-[var(--sf-text-primary)] hover:bg-[var(--sf-bg-hover)] rounded-lg">
              <RefreshCw size={16} />
            </button>
          </div>

          {usersLoading ? (
            <div className="p-8 text-center"><Loader2 size={24} className="animate-spin mx-auto text-[var(--sf-text-muted)]" /></div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-[var(--sf-text-muted)] text-sm">No users found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--sf-border-light)] bg-[var(--sf-bg-input)]">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--sf-text-muted)] uppercase">ID</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--sf-text-muted)] uppercase">User</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--sf-text-muted)] uppercase">Business</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--sf-text-muted)] uppercase">Plan</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--sf-text-muted)] uppercase">Sigcore</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--sf-text-muted)] uppercase">OpenPhone</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--sf-text-muted)] uppercase">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--sf-border-light)]">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-[var(--sf-bg-hover)]">
                      <td className="px-4 py-3 text-[var(--sf-text-muted)] font-mono text-xs">{u.id}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[var(--sf-text-primary)]">{u.name || 'No name'}</div>
                        <div className="text-xs text-[var(--sf-text-muted)]">{u.email}</div>
                      </td>
                      <td className="px-4 py-3 text-[var(--sf-text-secondary)]">{u.businessName || '—'}</td>
                      <td className="px-4 py-3">
                        {u.subscriptionStatus === 'active' ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">{u.planName || 'Active'}</span>
                        ) : u.subscriptionStatus === 'trialing' ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">Trial</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">{u.subscriptionStatus || 'Free'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {u.sigcoreConnected ? (
                          <span className="text-xs text-green-600 flex items-center gap-1"><Check size={12} /> Connected</span>
                        ) : (
                          <span className="text-xs text-[var(--sf-text-muted)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {u.openphoneConnected ? (
                          <span className="text-xs text-green-600 flex items-center gap-1"><Check size={12} /> {u.phoneNumberCount || 0} numbers</span>
                        ) : (
                          <span className="text-xs text-[var(--sf-text-muted)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--sf-text-muted)]">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ═══ System Info ═══ */}
        <section className="bg-white rounded-xl border border-[var(--sf-border-light)] p-6">
          <h2 className="text-base font-semibold text-[var(--sf-text-primary)] mb-3 flex items-center gap-2">
            <Database size={18} className="text-[var(--sf-text-muted)]" /> System Information
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-xs text-[var(--sf-text-muted)] uppercase">Environment</div>
              <div className="font-medium text-[var(--sf-text-primary)]">Staging</div>
            </div>
            <div>
              <div className="text-xs text-[var(--sf-text-muted)] uppercase">Backend</div>
              <div className="font-medium text-[var(--sf-text-primary)]">Railway</div>
            </div>
            <div>
              <div className="text-xs text-[var(--sf-text-muted)] uppercase">Database</div>
              <div className="font-medium text-[var(--sf-text-primary)]">Supabase</div>
            </div>
            <div>
              <div className="text-xs text-[var(--sf-text-muted)] uppercase">Comms Platform</div>
              <div className="font-medium text-[var(--sf-text-primary)]">Sigcore</div>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}

export default AdminDashboard
