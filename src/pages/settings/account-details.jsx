"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import PageLayout from "../../components/PageLayout"
import Card from "../../components/Card"
import Button from "../../components/Button"
import Input from "../../components/Input"
import { Camera, Eye, EyeOff, Check, X, Trash2, Download, FileSpreadsheet, Calendar, AlertTriangle } from "lucide-react"
import { userProfileAPI, authAPI, teamAPI, jobsAPI, customersAPI, invoicesAPI, sheetsAPI } from "../../services/api"
import { useAuth } from "../../context/AuthContext"
import Sidebar from "../../components/sidebar"
import { isWorker } from "../../utils/roleUtils"

const AccountDetails = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState('')
  const [message, setMessage] = useState({ type: '', text: '' })
  
  const [formData, setFormData] = useState({
    fullName: "",
    businessName: "",
    phone: "",
    email: "",
    emailNotifications: true,
    smsNotifications: false,
    profilePicture: null
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })

  const [emailData, setEmailData] = useState({
    newEmail: "",
    password: ""
  })

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })

  const [showEmailPassword, setShowEmailPassword] = useState(false)

  // Get current user
  const currentUser = authAPI.getCurrentUser()
  const { updateUserProfile, refreshUserProfile } = useAuth()

  useEffect(() => {
    let isMounted = true;
    
    console.log('AccountDetails useEffect running, currentUser:', currentUser);
    
    if (currentUser) {
      console.log('Loading user profile for user:', currentUser.id);
      // Add a timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        if (isMounted && loading) {
          console.log('Request timed out, setting default data');
          setLoading(false);
          setMessage({ 
            type: 'error', 
            text: 'Request timed out. Please check your connection and try again.' 
          });
                  // Set default data
          setFormData({
            fullName: currentUser.firstName ? `${currentUser.firstName} ${currentUser.lastName || ''}` : 'User',
            phone: "",
            email: currentUser.email || "",
            emailNotifications: true,
            smsNotifications: false,
            profilePicture: null
          });
        }
      }, 20000); // 20 second timeout

      loadUserProfile().finally(() => {
        clearTimeout(timeoutId);
      });
    } else {
      console.log('No current user, redirecting to signin');
      navigate('/signin')
    }

    return () => {
      console.log('AccountDetails useEffect cleanup');
      isMounted = false;
    };
  }, []) // Remove currentUser from dependency array to prevent infinite re-renders

  const loadUserProfile = async () => {
    try {
      console.log('loadUserProfile called');
      setLoading(true)
      const user = authAPI.getCurrentUser() // Get fresh user data
      if (!user) {
        console.log('No user found in loadUserProfile');
        navigate('/signin')
        return
      }
      
      console.log('Fetching profile for user:', user.id, 'teamMemberId:', user.teamMemberId);
      const profile = await userProfileAPI.getProfile(user.id)
      console.log('Profile loaded:', profile);
      
      // Handle both account owners and team members
      const fullName = profile.firstName || profile.lastName 
        ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim()
        : user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.firstName || 'User';
      
      setFormData({
        fullName: fullName,
        businessName: profile.businessName || profile.business_name || "",
        phone: profile.phone || "",
        email: profile.email,
        emailNotifications: profile.emailNotifications || false,
        smsNotifications: profile.smsNotifications || false,
        profilePicture: profile.profilePicture
      })
    } catch (error) {
      console.error('Error loading profile:', error)
      // If it's a database schema error, show a helpful message
      if (error.response?.data?.error?.includes('Unknown column')) {
        setMessage({ 
          type: 'error', 
          text: 'Database schema needs to be updated. Please run the migration script.' 
        })
        // Set default data so the page doesn't keep loading
        const user = authAPI.getCurrentUser()
        setFormData({
          fullName: user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'User',
          businessName: "",
          phone: "",
          email: user?.email || "",
          emailNotifications: true,
          smsNotifications: false,
          profilePicture: null
        })
      } else {
        setMessage({ type: 'error', text: 'Failed to load profile data' })
        // Set default data so the page doesn't keep loading
        const user = authAPI.getCurrentUser()
        setFormData({
          fullName: user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'User',
          businessName: "",
          phone: "",
          email: user?.email || "",
          emailNotifications: true,
          smsNotifications: false,
          profilePicture: null
        })
      }
    } finally {
      console.log('loadUserProfile finally block, setting loading to false');
      setLoading(false)
    }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleToggle = (field) => {
    setFormData(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  const handleSaveProfile = async () => {
    try {
      setSaving(true)
      const user = authAPI.getCurrentUser()
      if (!user) {
        navigate('/signin')
        return
      }
      
      const [firstName, ...lastNameParts] = formData.fullName.split(' ')
      const lastName = lastNameParts.join(' ') || ''
      
      // If user is a team member, use team member API
      if (user.teamMemberId) {
        const result = await teamAPI.update(user.teamMemberId, {
          firstName,
          lastName,
          phone: formData.phone,
          email: formData.email // Team members can update their email
        })
        
        // Update the user data in AuthContext and localStorage
        const updatedUser = {
          ...user,
          firstName,
          lastName,
          phone: formData.phone,
          email: formData.email
        }
        
        // Update localStorage
        localStorage.setItem('user', JSON.stringify(updatedUser))
        
        // Update AuthContext
        updateUserProfile(updatedUser)
      } else {
        // Account owner update
        const result = await userProfileAPI.updateProfile({
          userId: user.id,
          firstName,
          lastName,
          businessName: formData.businessName,
          phone: formData.phone,
          emailNotifications: formData.emailNotifications,
          smsNotifications: formData.smsNotifications
        })
        
        // Update the user data in AuthContext and localStorage
        const updatedUser = {
          ...user,
          firstName,
          lastName,
          businessName: formData.businessName,
          business_name: formData.businessName,
          phone: formData.phone,
          emailNotifications: formData.emailNotifications,
          smsNotifications: formData.smsNotifications
        }
        
        // Update localStorage
        localStorage.setItem('user', JSON.stringify(updatedUser))
        
        // Update AuthContext
        updateUserProfile(updatedUser)
      }
      
      // Refresh user profile to ensure all data is synced
      try {
        await refreshUserProfile()
        console.log('🔍 Profile refreshed after update')
      } catch (error) {
        console.error('Error refreshing profile:', error)
      }
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      console.error('Error updating profile:', error)
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to update profile' })
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' })
      return
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' })
      return
    }

    try {
      setSaving(true)
      const user = authAPI.getCurrentUser()
      if (!user) {
        navigate('/signin')
        return
      }
      
      await userProfileAPI.updatePassword({
        userId: user.id,
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      })
      
      setMessage({ type: 'success', text: 'Password updated successfully!' })
      setShowPasswordModal(false)
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      console.error('Error updating password:', error)
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to update password' })
    } finally {
      setSaving(false)
    }
  }

  const handleEmailChange = async () => {
    if (!emailData.newEmail.includes('@')) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' })
      return
    }

    try {
      setSaving(true)
      const user = authAPI.getCurrentUser()
      if (!user) {
        navigate('/signin')
        return
      }
      
      await userProfileAPI.updateEmail({
        userId: user.id,
        newEmail: emailData.newEmail,
        password: emailData.password
      })
      
      setMessage({ type: 'success', text: 'Email updated successfully!' })
      setShowEmailModal(false)
      setEmailData({ newEmail: "", password: "" })
      setFormData(prev => ({ ...prev, email: emailData.newEmail }))
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      console.error('Error updating email:', error)
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to update email' })
    } finally {
      setSaving(false)
    }
  }

  const handleProfilePictureUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select an image file' });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'File size must be less than 5MB' });
      return;
    }

    try {
      setSaving(true);
      const user = authAPI.getCurrentUser();
      if (!user) {
        navigate('/signin');
        return;
      }

      // Use teamMemberId if it's a team member, otherwise use user.id
      const userIdToUse = user.teamMemberId ? user.teamMemberId : user.id;
      const isTeamMember = !!user.teamMemberId;
      
      console.log('🔍 Uploading profile picture for:', isTeamMember ? 'team member' : 'account owner', userIdToUse);
      const result = await userProfileAPI.updateProfilePicture(userIdToUse, file, isTeamMember);
      
      setFormData(prev => ({
        ...prev,
        profilePicture: result.profilePicture
      }));
      
      // Update the user profile in AuthContext
      const updatedProfile = {
        ...currentUser,
        profilePicture: result.profilePicture
      };
      updateUserProfile(updatedProfile);
      
      setMessage({ type: 'success', text: 'Profile picture updated successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to upload profile picture' });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    authAPI.signout()
    navigate('/signin')
  }

  // Check if user is authenticated
  if (!currentUser) {
    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Redirecting to sign in...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading profile...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Determine back navigation based on user type
  const handleBack = () => {
    const user = authAPI.getCurrentUser()
    if (isWorker(user) && user?.teamMemberId) {
      // Workers should go to availability page
      navigate("/availability")
    } else {
      // Account owners/managers go to settings
      navigate("/settings")
    }
  }

  return (
    <PageLayout
      title="Account Details"
      subtitle="Manage your account settings and preferences"
      showBackButton={true}
      onBack={handleBack}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      maxWidth="max-w-4xl"
    >
        {/* Message */}
        {message.text && (
        <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center">
              {message.type === 'success' ? (
              <Check className="w-5 h-5 text-green-500 mr-2" />
              ) : (
              <X className="w-5 h-5 text-red-500 mr-2" />
              )}
            <span className={`text-sm font-medium ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                {message.text}
              </span>
            </div>
          </div>
        )}

      <Card>
              {/* Profile Picture */}
              <div className="flex items-center space-x-4 mb-8">
                <div className="relative w-20 h-20 flex-shrink-0">
                  {formData.profilePicture ? (
                    <img 
                      src={formData.profilePicture} 
                      alt="Profile" 
                      className="w-20 h-20 rounded-lg object-cover"
                      onError={(e) => {
                        console.error('Failed to load profile picture:', formData.profilePicture);
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-20 h-20 bg-blue-500 rounded-lg flex items-center justify-center">
                      <span className="text-white font-medium text-2xl">
                        {formData.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </span>
                    </div>
                  )}
                  {saving && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col space-y-2">
                  <label className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium cursor-pointer">
                    <Camera className="w-4 h-4" />
                    <span>{formData.profilePicture ? 'Change Profile Picture' : 'Add Profile Picture'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureUpload}
                      className="hidden"
                      disabled={saving}
                    />
                  </label>
                  {formData.profilePicture && (
                    <button 
                      onClick={async () => {
                        try {
                          setSaving(true);
                          // Use teamMemberId if it's a team member, otherwise use user.id
                          const userIdToUse = currentUser.teamMemberId ? currentUser.teamMemberId : currentUser.id;
                          const isTeamMember = !!currentUser.teamMemberId;
                          await userProfileAPI.removeProfilePicture(userIdToUse, isTeamMember);
                          
                          setFormData(prev => ({ ...prev, profilePicture: null }));
                          
                          // Update the user profile in AuthContext
                          const updatedProfile = {
                            ...currentUser,
                            profilePicture: null
                          };
                          updateUserProfile(updatedProfile);
                          
                          setMessage({ type: 'success', text: 'Profile picture removed' });
                          setTimeout(() => setMessage({ type: '', text: '' }), 3000);
                        } catch (error) {
                          console.error('Error removing profile picture:', error);
                          setMessage({ type: 'error', text: 'Failed to remove profile picture' });
                        } finally {
                          setSaving(false);
                        }
                      }}
                      className="text-red-600 hover:text-red-700 text-sm"
                      disabled={saving}
                    >
                      Remove Picture
                    </button>
                  )}
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Input
                  label="Full Name"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                />
                
                {/* Only show Company Name for account owners */}
                {!currentUser?.teamMemberId && (
                  <Input
                    label="Company Name"
                    type="text"
                    value={formData.businessName}
                    onChange={(e) => handleInputChange('businessName', e.target.value)}
                    placeholder="Your Company Name"
                  />
                )}
                
                <Input
                  label="Phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="Mobile Phone Number"
                />
              </div>

              {/* Email */}
              <div className="mb-8">
                {currentUser?.teamMemberId ? (
                  // Team members can edit email directly
                  <Input
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="your.email@example.com"
                  />
                ) : (
                  // Account owners use modal to change email
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <button 
                        onClick={() => setShowEmailModal(true)}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                      >
                        Change Email
                      </button>
                    </div>
                    <div className="text-gray-900">
                      {formData.email}
                    </div>
                  </>
                )}
              </div>

              {/* Password */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">Password</h3>
                    <p className="text-sm text-gray-500">Change the password you use to login to your account</p>
                  </div>
                  <button 
                    onClick={() => setShowPasswordModal(true)}
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                  >
                    Change Password
                  </button>
                </div>
              </div>

              {/* Notification Preferences - Only for account owners */}
              {!currentUser?.teamMemberId && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">NOTIFICATION PREFERENCES</h3>
                <p className="text-gray-600 mb-6">How would you like to be notified when you are assigned to a job?</p>

                <div className="space-y-6">
                  {/* Email Notifications */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                        <span className="text-sm">📧</span>
                      </div>
                      <span className="text-gray-900 font-medium">Emails</span>
                    </div>
                    <button
                      onClick={() => handleToggle('emailNotifications')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData.emailNotifications ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* SMS Notifications */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                        <span className="text-sm">💬</span>
                      </div>
                      <span className="text-gray-900 font-medium">Text Messages (SMS)</span>
                    </div>
                    <button
                      onClick={() => handleToggle('smsNotifications')}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData.smsNotifications ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.smsNotifications ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
              )}

              {/* Save Button */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <Button
                  onClick={handleSaveProfile}
                  loading={saving}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>

              {/* Sign Out Button */}
              <div className="mt-6">
                <Button 
                  variant="ghost"
                  onClick={handleSignOut}
                  className="text-red-600 hover:text-red-700"
                >
                  Sign Out
                </Button>
              </div>

              {/* Delete Account Section */}
              {!currentUser?.teamMemberId && (
                <div className="mt-8 pt-8 border-t border-red-200">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <div className="flex items-start space-x-3 mb-4">
                      <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-red-900 mb-2">Delete Account</h3>
                        <p className="text-sm text-red-800 mb-4">
                          Once you delete your account, there is no going back. This will permanently delete:
                        </p>
                        <ul className="text-sm text-red-800 list-disc list-inside space-y-1 mb-4">
                          <li>All your jobs and job history</li>
                          <li>All customer information</li>
                          <li>All invoices and payment records</li>
                          <li>All team members and their data</li>
                          <li>All settings and preferences</li>
                          <li>All calendar and Google Sheets integrations</li>
                        </ul>
                        <p className="text-sm font-medium text-red-900 mb-4">
                          We recommend exporting your data before deleting your account.
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => setShowDeleteAccountModal(true)}
                      className="text-red-600 hover:text-red-700 border border-red-300 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Account
                    </Button>
                  </div>
                </div>
              )}
            </Card>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Change Password</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordChange}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start space-x-3 mb-6">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-red-900 mb-2">Delete Your Account</h3>
                <p className="text-sm text-gray-700 mb-4">
                  This action cannot be undone. All your data will be permanently deleted.
                </p>
              </div>
            </div>

            {/* Export Options */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-900 mb-3">Save Your Data Before Deleting</h4>
              <p className="text-xs text-blue-800 mb-4">
                We strongly recommend exporting your data before deleting your account. Choose one or more options:
              </p>
              
              <div className="space-y-3">
                {/* CSV Export */}
                <button
                  onClick={async () => {
                    setIsExporting(true)
                    setExportProgress('Exporting jobs to CSV...')
                    try {
                      const csvData = await jobsAPI.export({})
                      const blob = new Blob([csvData], { type: 'text/csv' })
                      const url = window.URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `jobs_export_${new Date().toISOString().split('T')[0]}.csv`
                      document.body.appendChild(a)
                      a.click()
                      window.URL.revokeObjectURL(url)
                      document.body.removeChild(a)
                      
                      setExportProgress('Exporting customers to CSV...')
                      const customersCsv = await customersAPI.export('csv')
                      const blob2 = new Blob([customersCsv], { type: 'text/csv' })
                      const url2 = window.URL.createObjectURL(blob2)
                      const a2 = document.createElement('a')
                      a2.href = url2
                      a2.download = `customers_export_${new Date().toISOString().split('T')[0]}.csv`
                      document.body.appendChild(a2)
                      a2.click()
                      window.URL.revokeObjectURL(url2)
                      document.body.removeChild(a2)
                      
                      setMessage({ type: 'success', text: 'Data exported to CSV files successfully!' })
                      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
                    } catch (error) {
                      console.error('Export error:', error)
                      setMessage({ type: 'error', text: 'Failed to export data. Please try again.' })
                    } finally {
                      setIsExporting(false)
                      setExportProgress('')
                    }
                  }}
                  disabled={isExporting || isDeleting}
                  className="w-full flex items-center justify-between p-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center space-x-3">
                    <Download className="w-5 h-5 text-blue-600" />
                    <div className="text-left">
                      <div className="text-sm font-medium text-gray-900">Export as CSV</div>
                      <div className="text-xs text-gray-500">Download jobs and customers as CSV files</div>
                    </div>
                  </div>
                </button>

                {/* Google Sheets Export */}
                <button
                  onClick={async () => {
                    setIsExporting(true)
                    setExportProgress('Exporting to Google Sheets...')
                    try {
                      const user = authAPI.getCurrentUser()
                      await sheetsAPI.exportJobs(user.id)
                      setExportProgress('Exporting customers to Google Sheets...')
                      await sheetsAPI.exportCustomers(user.id)
                      setMessage({ type: 'success', text: 'Data exported to Google Sheets successfully!' })
                      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
                    } catch (error) {
                      console.error('Google Sheets export error:', error)
                      if (error.response?.status === 401 || error.message?.includes('Google')) {
                        setMessage({ 
                          type: 'error', 
                          text: 'Please connect your Google account in Settings > Google Sheets to export data.' 
                        })
                      } else {
                        setMessage({ type: 'error', text: 'Failed to export to Google Sheets. Please try again.' })
                      }
                    } finally {
                      setIsExporting(false)
                      setExportProgress('')
                    }
                  }}
                  disabled={isExporting || isDeleting}
                  className="w-full flex items-center justify-between p-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center space-x-3">
                    <FileSpreadsheet className="w-5 h-5 text-green-600" />
                    <div className="text-left">
                      <div className="text-sm font-medium text-gray-900">Sync with Google Sheets</div>
                      <div className="text-xs text-gray-500">Export data to a new Google Spreadsheet</div>
                    </div>
                  </div>
                </button>

                {/* Calendar Sync Note */}
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <Calendar className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                    <div className="text-left">
                      <div className="text-sm font-medium text-gray-900">Google Calendar</div>
                      <div className="text-xs text-gray-500">
                        If you have calendar sync enabled, your events are already in your Google Calendar and will remain there after account deletion.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {exportProgress && (
                <div className="mt-4 p-3 bg-blue-100 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">{exportProgress}</p>
                </div>
              )}
            </div>

            {/* Delete Confirmation */}
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-medium text-red-900 mb-3">
                To confirm deletion, type <strong>DELETE</strong> in the box below:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="w-full border border-red-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                disabled={isDeleting || isExporting}
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDeleteAccountModal(false)
                  setDeleteConfirmText('')
                  setExportProgress('')
                }}
                disabled={isDeleting || isExporting}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (deleteConfirmText !== 'DELETE') {
                    setMessage({ type: 'error', text: 'Please type DELETE to confirm' })
                    return
                  }

                  setIsDeleting(true)
                  try {
                    const user = authAPI.getCurrentUser()
                    if (!user) {
                      navigate('/signin')
                      return
                    }

                    // Call delete account API
                    const response = await authAPI.deleteAccount(user.id)
                    
                    // Clear local storage
                    localStorage.removeItem('authToken')
                    localStorage.removeItem('user')
                    
                    // Show success message briefly
                    setMessage({ type: 'success', text: 'Account deleted successfully' })
                    
                    // Redirect to signin after a short delay
                    setTimeout(() => {
                      navigate('/signin')
                    }, 2000)
                  } catch (error) {
                    console.error('Error deleting account:', error)
                    setMessage({ 
                      type: 'error', 
                      text: error.response?.data?.error || 'Failed to delete account. Please try again.' 
                    })
                    setIsDeleting(false)
                  }
                }}
                disabled={isDeleting || isExporting || deleteConfirmText !== 'DELETE'}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Deleting Account...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Permanently Delete Account</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Change Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Change Email</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Email Address
                </label>
                <input
                  type="email"
                  value={emailData.newEmail}
                  onChange={(e) => setEmailData(prev => ({ ...prev, newEmail: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter new email address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showEmailPassword ? "text" : "password"}
                    value={emailData.password}
                    onChange={(e) => setEmailData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your current password"
                  />
                  <button
                    onClick={() => setShowEmailPassword(!showEmailPassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {showEmailPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowEmailModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEmailChange}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Updating...' : 'Update Email'}
              </button>
            </div>
          </div>
        </div>
      )}
          </PageLayout>
  )
}

export default AccountDetails