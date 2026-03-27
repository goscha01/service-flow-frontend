"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../components/sidebar"
import { Tag, Edit, Trash2, Copy, CheckCircle, XCircle, Calendar, Users } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import axios from "axios"

const ServiceFlowCoupons = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [copiedCode, setCopiedCode] = useState("")
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, couponId: null })

  // Load coupons on component mount
  useEffect(() => {
    loadCoupons()
  }, [])

  const loadCoupons = async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      setError("")
      
      const api = axios.create({
        baseURL: process.env.REACT_APP_API_URL || 'https://service-flow-backend-production-4568.up.railway.app/api',
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const token = localStorage.getItem('authToken');
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }

      const response = await api.get('/coupons')
      setCoupons(response.data.coupons || [])
    } catch (error) {
      console.error('Error loading coupons:', error)
      setError('Failed to load coupons')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (code) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(""), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const deleteCoupon = async (couponId) => {
    setDeleteConfirm({ show: true, couponId })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm.couponId) return
    
    try {
      const api = axios.create({
        baseURL: process.env.REACT_APP_API_URL || 'https://service-flow-backend-production-4568.up.railway.app/api',
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const token = localStorage.getItem('authToken');
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }

      await api.delete(`/coupons/${deleteConfirm.couponId}`)
      await loadCoupons() // Reload the list
      setDeleteConfirm({ show: false, couponId: null })
    } catch (error) {
      console.error('Error deleting coupon:', error)
      setError('Failed to delete coupon')
      setDeleteConfirm({ show: false, couponId: null })
    }
  }

  const cancelDelete = () => {
    setDeleteConfirm({ show: false, couponId: null })
  }

  const formatDiscount = (type, amount) => {
    if (type === 'percentage') {
      return `${amount}% off`
    } else {
      return `$${amount} off`
    }
  }

  const isExpired = (expirationDate) => {
    if (!expirationDate) return false
    return new Date(expirationDate) < new Date()
  }

  const isActive = (coupon) => {
    if (!coupon.is_active) return false
    if (coupon.doesnt_expire) return true
    return !isExpired(coupon.expiration_date)
  }

  return (
    <div className="flex h-screen bg-[var(--sf-bg-page)] overflow-hidden">
      {/* Main Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} activePage="coupons" />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 lg:mx-44 xl:mx-48">
        {/* Mobile Header */}

        {/* Desktop Header */}
        <div className="hidden lg:flex bg-white border-b border-[var(--sf-border-light)] px-6 py-4 items-center justify-between">
          <h1 className="text-2xl font-semibold text-[var(--sf-text-primary)]">Coupons</h1>
          <button
            onClick={() => navigate("/coupons/create")}
            className="bg-[var(--sf-blue-500)] text-white px-4 py-2 rounded-lg font-medium hover:bg-[var(--sf-blue-600)] transition-colors"
          >
            Create Coupon
          </button>
        </div>

        {/* Mobile Header Content */}
        <div className="lg:hidden bg-white border-b border-[var(--sf-border-light)] px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-[var(--sf-text-primary)]">Coupons</h1>
            <button
              onClick={() => navigate("/coupons/create")}
              className="bg-[var(--sf-blue-500)] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-[var(--sf-blue-600)] transition-colors"
            >
              Create Coupon
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-[var(--sf-text-secondary)]">Loading coupons...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-600 mb-4">{error}</div>
              <button 
                onClick={loadCoupons}
                className="bg-[var(--sf-blue-500)] text-white px-4 py-2 rounded-lg hover:bg-[var(--sf-blue-600)]"
              >
                Try Again
              </button>
            </div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-[var(--sf-bg-page)] rounded-full flex items-center justify-center mx-auto mb-6">
                <Tag className="w-8 h-8 text-[var(--sf-text-muted)]" />
              </div>
              <h3 className="text-2xl font-semibold text-[var(--sf-text-primary)] mb-4">Create your first coupon</h3>
              <p className="text-[var(--sf-text-secondary)] mb-8 leading-relaxed">
                Boost sales and reward your loyal customers with shareable coupon codes.
              </p>
              <button 
                onClick={() => navigate("/coupons/create")}
                className="bg-[var(--sf-blue-500)] text-white px-6 py-3 rounded-lg font-medium hover:bg-[var(--sf-blue-600)] transition-colors"
              >
                Create Coupon
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-[var(--sf-text-primary)]">
                  {coupons.length} coupon{coupons.length !== 1 ? 's' : ''}
                </h2>
              </div>
              
              <div className="grid gap-4">
                {coupons.map((coupon) => (
                  <div key={coupon.id} className="bg-white rounded-lg border border-[var(--sf-border-light)] p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg font-semibold text-[var(--sf-text-primary)]">{coupon.code}</span>
                            {isActive(coupon) ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-500" />
                            )}
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            isActive(coupon) 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {isActive(coupon) ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <span className="text-sm font-medium text-[var(--sf-text-muted)]">Discount</span>
                            <p className="text-lg font-semibold text-[var(--sf-text-primary)]">
                              {formatDiscount(coupon.discount_type, coupon.discount_amount)}
                            </p>
                          </div>
                          
                          <div>
                            <span className="text-sm font-medium text-[var(--sf-text-muted)]">Applies to</span>
                            <p className="text-sm text-[var(--sf-text-primary)]">
                              {coupon.application_type === 'all' ? 'All services' : 'Specific services'}
                            </p>
                          </div>
                          
                          <div>
                            <span className="text-sm font-medium text-[var(--sf-text-muted)]">Usage</span>
                            <p className="text-sm text-[var(--sf-text-primary)]">
                              {coupon.current_uses || 0} used
                              {coupon.limit_total_uses && coupon.total_uses_limit && (
                                <span className="text-[var(--sf-text-muted)]"> / {coupon.total_uses_limit}</span>
                              )}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-[var(--sf-text-muted)]">
                          {coupon.expiration_date && (
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>Expires {new Date(coupon.expiration_date).toLocaleDateString()}</span>
                            </div>
                          )}
                          {coupon.doesnt_expire && (
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>Never expires</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-1">
                            <Users className="w-4 h-4" />
                            <span>Created {new Date(coupon.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => copyToClipboard(coupon.code)}
                          className="p-2 text-[var(--sf-text-muted)] hover:text-[var(--sf-text-secondary)] transition-colors"
                          title="Copy code"
                        >
                          {copiedCode === coupon.code ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => navigate(`/coupons/edit/${coupon.id}`)}
                          className="p-2 text-[var(--sf-text-muted)] hover:text-[var(--sf-blue-500)] transition-colors"
                          title="Edit coupon"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteCoupon(coupon.id)}
                          className="p-2 text-[var(--sf-text-muted)] hover:text-red-600 transition-colors"
                          title="Delete coupon"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-[var(--sf-text-primary)] mb-4">Delete Coupon</h3>
            <p className="text-[var(--sf-text-secondary)] mb-6">
              Are you sure you want to delete this coupon? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={cancelDelete}
                className="flex-1 px-4 py-2 border border-[var(--sf-border-light)] rounded-lg text-[var(--sf-text-primary)] hover:bg-[var(--sf-bg-page)]"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ServiceFlowCoupons
