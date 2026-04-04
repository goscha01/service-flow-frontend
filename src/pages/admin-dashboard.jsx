"use client"

import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import {
  Users, Server, Check, X, Loader2, RefreshCw,
  Shield, Eye, EyeOff, Database, Zap, LogIn, LogOut
} from "lucide-react"

// REACT_APP_API_URL already ends with /api, so admin paths should NOT include /api prefix
const API_BASE = process.env.REACT_APP_API_URL || 'https://service-flow-backend-staging-303f.up.railway.app/api'

// Admin-specific axios instance (separate from SF user auth)
function getAdminApi() {
  const token = localStorage.getItem('sf_admin_token')
  return axios.create({
    baseURL: API_BASE,
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  })
}

// ═══════════════════════════════════════════════════════════════
// Admin Login Screen
// ═══════════════════════════════════════════════════════════════

function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const { data } = await axios.post(`${API_BASE}/admin/login`, { email, password })
      localStorage.setItem('sf_admin_token', data.token)
      onLogin(data)
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 max-w-sm w-full p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-purple-50 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Shield size={28} className="text-purple-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Service Flow Platform Admin</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-purple-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Main Admin Dashboard
// ═══════════════════════════════════════════════════════════════

const AdminDashboard = () => {
  const [authed, setAuthed] = useState(!!localStorage.getItem('sf_admin_token'))
  const [adminEmail, setAdminEmail] = useState('')

  // Global settings
  const [sigcoreUrl, setSigcoreUrl] = useState('')
  const [sigcoreWorkspaceKey, setSigcoreWorkspaceKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [globalLoading, setGlobalLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [sigcoreStatus, setSigcoreStatus] = useState(null)

  // Users
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(true)

  useEffect(() => {
    if (authed) { loadGlobalSettings(); loadUsers() }
  }, [authed])

  const handleLogin = (data) => { setAuthed(true); setAdminEmail(data.email) }
  const handleLogout = () => { localStorage.removeItem('sf_admin_token'); setAuthed(false) }

  const loadGlobalSettings = async () => {
    try {
      setGlobalLoading(true)
      const { data } = await getAdminApi().get('/admin/global-settings')
      setSigcoreUrl(data.sigcoreUrl || '')
      setSigcoreWorkspaceKey(data.sigcoreWorkspaceKey || '')
      setSigcoreStatus(data.sigcoreConnected ? 'connected' : null)
    } catch (e) {
      if (e.response?.status === 401 || e.response?.status === 403) handleLogout()
    } finally { setGlobalLoading(false) }
  }

  const loadUsers = async () => {
    try {
      setUsersLoading(true)
      const { data } = await getAdminApi().get('/admin/users')
      setUsers(data.users || [])
    } catch (e) {
      if (e.response?.status === 401 || e.response?.status === 403) handleLogout()
    } finally { setUsersLoading(false) }
  }

  const handleSaveGlobal = async () => {
    setSaving(true)
    try {
      await getAdminApi().put('/admin/global-settings', { sigcoreUrl, sigcoreWorkspaceKey })
      alert('Settings saved')
    } catch (e) { alert('Failed to save: ' + (e.response?.data?.error || e.message)) }
    finally { setSaving(false) }
  }

  const handleTestSigcore = async () => {
    setTestingConnection(true); setSigcoreStatus(null)
    try {
      const { data } = await getAdminApi().post('/admin/test-sigcore')
      setSigcoreStatus(data.connected ? 'connected' : 'error')
      if (data.connected) alert(`Connected! ${data.tenants || 0} tenants found.`)
      else alert('Connection failed: ' + (data.error || 'Unknown error'))
    } catch (e) { setSigcoreStatus('error'); alert('Test failed: ' + (e.response?.data?.error || e.message)) }
    finally { setTestingConnection(false) }
  }

  if (!authed) return <AdminLogin onLogin={handleLogin} />

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield size={24} className="text-purple-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-xs text-gray-500">Service Flow Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">{adminEmail}</span>
            <button onClick={handleLogout} className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-8">

        {/* ═══ Sigcore Connection ═══ */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg"><Server size={20} className="text-purple-600" /></div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Sigcore Communication Platform</h2>
                <p className="text-xs text-gray-500">Global connection — powers all user communications</p>
              </div>
            </div>
            {sigcoreStatus === 'connected' && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full"><Check size={14} /> Connected</span>
            )}
            {sigcoreStatus === 'error' && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 px-3 py-1 rounded-full"><X size={14} /> Error</span>
            )}
          </div>
          {globalLoading ? (
            <div className="p-8 text-center"><Loader2 size={24} className="animate-spin mx-auto text-gray-400" /></div>
          ) : (
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Sigcore API URL</label>
                <input type="text" value={sigcoreUrl} onChange={e => setSigcoreUrl(e.target.value)}
                  placeholder="https://sigcore-production.up.railway.app/api"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Workspace API Key</label>
                <div className="relative">
                  <input type={showKey ? 'text' : 'password'} value={sigcoreWorkspaceKey} onChange={e => setSigcoreWorkspaceKey(e.target.value)}
                    placeholder="sc_workspace_..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-purple-500" />
                  <button onClick={() => setShowKey(!showKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">From Sigcore admin — used to provision tenants for SF users</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={handleSaveGlobal} disabled={saving}
                  className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />} Save
                </button>
                <button onClick={handleTestSigcore} disabled={testingConnection}
                  className="px-4 py-2 text-sm border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2">
                  {testingConnection ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} Test Connection
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ═══ Users ═══ */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg"><Users size={20} className="text-blue-600" /></div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Service Flow Users</h2>
                <p className="text-xs text-gray-500">{users.length} registered users</p>
              </div>
            </div>
            <button onClick={loadUsers} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg">
              <RefreshCw size={16} />
            </button>
          </div>
          {usersLoading ? (
            <div className="p-8 text-center"><Loader2 size={24} className="animate-spin mx-auto text-gray-400" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">ID</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">User</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Business</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Plan</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Sigcore</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">OpenPhone</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">{u.id}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{u.name || 'No name'}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{u.businessName || '—'}</td>
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
                        {u.sigcoreConnected ? <span className="text-xs text-green-600 flex items-center gap-1"><Check size={12} /> Yes</span> : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {u.openphoneConnected ? <span className="text-xs text-green-600 flex items-center gap-1"><Check size={12} /> {u.phoneNumberCount} nums</span> : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ═══ System Info ═══ */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2"><Database size={18} className="text-gray-400" /> System</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            {[['Environment', 'Staging'], ['Backend', 'Railway'], ['Database', 'Supabase'], ['Comms', 'Sigcore']].map(([k, v]) => (
              <div key={k}><div className="text-xs text-gray-400 uppercase">{k}</div><div className="font-medium text-gray-900">{v}</div></div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

export default AdminDashboard
