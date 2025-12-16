import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Settings, 
  User, 
  Mail, 
  Phone, 
  Building, 
  DollarSign,
  MoreVertical,
  Edit,
  Trash2,
  X,
  Save,
  GripVertical,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { leadsAPI, teamAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatPhoneNumber } from '../utils/phoneFormatter';
import Notification, { useNotification } from '../components/notification';
import TaskCard from '../components/task-card';
import CreateTaskModal from '../components/create-task-modal';
import ConvertLeadModal from '../components/convert-lead-modal';

const LeadsPipeline = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notification, showNotification, hideNotification } = useNotification();
  const [pipeline, setPipeline] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskFilter, setTaskFilter] = useState('all'); // 'all', 'pending', 'completed', 'overdue'
  const [showConvertLeadModal, setShowConvertLeadModal] = useState(false);
  
  // Modal states
  const [showCreateLeadModal, setShowCreateLeadModal] = useState(false);
  const [showEditStageModal, setShowEditStageModal] = useState(false);
  const [showLeadDetailsModal, setShowLeadDetailsModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [editingStage, setEditingStage] = useState(null);
  
  // Form states
  const [leadFormData, setLeadFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    source: '',
    notes: '',
    value: ''
  });
  
  // Lead sources - customizable list (load from localStorage or use defaults)
  const [leadSources, setLeadSources] = useState(() => {
    const saved = localStorage.getItem('leadSources');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return ['Website', 'Referral', 'Cold Call', 'Social Media', 'Email Campaign', 'Trade Show', 'Partner', 'Other'];
      }
    }
    return ['Website', 'Referral', 'Cold Call', 'Social Media', 'Email Campaign', 'Trade Show', 'Partner', 'Other'];
  });
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);
  const [customSource, setCustomSource] = useState('');
  
  // Name autocomplete state
  const [nameSuggestions, setNameSuggestions] = useState([]);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  
  // Save lead sources to localStorage when they change
  useEffect(() => {
    localStorage.setItem('leadSources', JSON.stringify(leadSources));
  }, [leadSources]);
  
  const [stageFormData, setStageFormData] = useState({
    name: '',
    color: '#3B82F6'
  });
  
  // Drag and drop state
  const [draggedLead, setDraggedLead] = useState(null);
  const [draggedStage, setDraggedStage] = useState(null);
  
  // Load pipeline, leads, and team members
  useEffect(() => {
    loadPipeline();
    loadLeads();
    loadTeamMembers();
  }, []);
  
  // Load tasks when a lead is selected
  useEffect(() => {
    if (selectedLead?.id) {
      loadTasks(selectedLead.id);
    }
  }, [selectedLead?.id]);
  
  const loadTeamMembers = async () => {
    try {
      if (user?.id) {
        const response = await teamAPI.getAll(user.id, { page: 1, limit: 1000 });
        const members = response.teamMembers || response || [];
        setTeamMembers(members);
      }
    } catch (err) {
      console.error('Error loading team members:', err);
    }
  };
  
  const loadTasks = async (leadId) => {
    try {
      const data = await leadsAPI.getTasks(leadId);
      setTasks(data);
    } catch (err) {
      console.error('Error loading tasks:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to load tasks';
      showNotification(errorMessage, 'error', 5000);
    }
  };
  
  const loadPipeline = async () => {
    try {
      setLoading(true);
      const data = await leadsAPI.getPipeline();
      setPipeline(data);
    } catch (err) {
      console.error('Error loading pipeline:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to load pipeline';
      showNotification(errorMessage, 'error', 5000);
    } finally {
      setLoading(false);
    }
  };
  
  const loadLeads = async () => {
    try {
      const data = await leadsAPI.getAll();
      setLeads(data);
    } catch (err) {
      console.error('Error loading leads:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to load leads';
      showNotification(errorMessage, 'error', 5000);
    }
  };
  
  // Handle create lead
  const handleCreateLead = async (e) => {
    e.preventDefault();
    try {
      await leadsAPI.create({
        ...leadFormData,
        stageId: pipeline?.stages?.[0]?.id // Add to first stage
      });
      showNotification('Lead created successfully!', 'success', 3000);
      setShowCreateLeadModal(false);
      setLeadFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        company: '',
        source: '',
        notes: '',
        value: ''
      });
      loadLeads();
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to create lead';
      showNotification(errorMessage, 'error', 5000);
      console.error('Error creating lead:', err);
    }
  };
  
  // Handle update stages
  const handleUpdateStages = async (updatedStages) => {
    try {
      await leadsAPI.updateStages(updatedStages);
      loadPipeline();
    } catch (err) {
      console.error('Error updating stages:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to update stages';
      showNotification(errorMessage, 'error', 5000);
    }
  };
  
  // Handle add stage
  const handleAddStage = async (e) => {
    e.preventDefault();
    try {
      const newStage = {
        name: stageFormData.name,
        color: stageFormData.color,
        position: pipeline.stages.length
      };
      
      const updatedStages = [...pipeline.stages, newStage];
      await handleUpdateStages(updatedStages);
      
      showNotification('Stage added successfully!', 'success', 3000);
      setShowEditStageModal(false);
      setStageFormData({ name: '', color: '#3B82F6' });
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to add stage';
      showNotification(errorMessage, 'error', 5000);
      console.error('Error adding stage:', err);
    }
  };
  
  // Handle delete stage
  const handleDeleteStage = async (stageId) => {
    if (!window.confirm('Are you sure you want to delete this stage? Leads in this stage will need to be moved first.')) {
      return;
    }
    
    try {
      await leadsAPI.deleteStage(stageId);
      showNotification('Stage deleted successfully!', 'success', 3000);
      loadPipeline();
      loadLeads();
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to delete stage';
      showNotification(errorMessage, 'error', 5000);
      console.error('Error deleting stage:', err);
    }
  };
  
  // Handle drag start
  const handleDragStart = (lead, stage) => {
    setDraggedLead(lead);
    setDraggedStage(stage);
  };
  
  // Handle drag over
  const handleDragOver = (e) => {
    e.preventDefault();
  };
  
  // Handle drop
  const handleDrop = async (targetStageId) => {
    if (!draggedLead || draggedLead.stage_id === targetStageId) {
      return;
    }
    
    try {
      await leadsAPI.moveToStage(draggedLead.id, targetStageId);
      loadLeads();
      setDraggedLead(null);
      setDraggedStage(null);
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to move lead';
      showNotification(errorMessage, 'error', 5000);
      console.error('Error moving lead:', err);
    }
  };
  
  // Handle convert lead to customer (called from modal)
  const handleConvertLead = async (leadId) => {
    try {
      const result = await leadsAPI.convertToCustomer(leadId);
      showNotification('Lead converted to customer successfully!', 'success', 3000);
      loadLeads();
      setShowLeadDetailsModal(false);
      setShowConvertLeadModal(false);
      return result;
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to convert lead';
      showNotification(errorMessage, 'error', 5000);
      console.error('Error converting lead:', err);
      throw err;
    }
  };
  
  
  // Handle create task
  const handleCreateTask = async (taskData) => {
    try {
      if (editingTask) {
        await leadsAPI.updateTask(editingTask.id, taskData);
        showNotification('Task updated successfully!', 'success', 3000);
      } else {
        await leadsAPI.createTask(selectedLead.id, taskData);
        showNotification('Task created successfully!', 'success', 3000);
      }
      setShowCreateTaskModal(false);
      setEditingTask(null);
      loadTasks(selectedLead.id);
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to save task';
      showNotification(errorMessage, 'error', 5000);
      console.error('Error saving task:', err);
    }
  };
  
  // Handle edit task
  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowCreateTaskModal(true);
  };
  
  // Handle delete task
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }
    
    try {
      await leadsAPI.deleteTask(taskId);
      showNotification('Task deleted successfully!', 'success', 3000);
      loadTasks(selectedLead.id);
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to delete task';
      showNotification(errorMessage, 'error', 5000);
      console.error('Error deleting task:', err);
    }
  };
  
  // Handle task status change
  const handleTaskStatusChange = async (taskId, newStatus) => {
    try {
      await leadsAPI.updateTask(taskId, { status: newStatus });
      loadTasks(selectedLead.id);
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to update task status';
      showNotification(errorMessage, 'error', 5000);
      console.error('Error updating task status:', err);
    }
  };
  
  // Filter tasks
  const getFilteredTasks = () => {
    if (taskFilter === 'all') return tasks;
    if (taskFilter === 'overdue') {
      const now = new Date();
      return tasks.filter(task => 
        task.due_date && 
        new Date(task.due_date) < now && 
        task.status !== 'completed'
      );
    }
    return tasks.filter(task => task.status === taskFilter);
  };
  
  // Get overdue tasks count
  const getOverdueTasksCount = () => {
    const now = new Date();
    return tasks.filter(task => 
      task.due_date && 
      new Date(task.due_date) < now && 
      task.status !== 'completed'
    ).length;
  };
  
  // Get leads for a stage
  const getLeadsForStage = (stageId) => {
    return leads.filter(lead => lead.stage_id === stageId);
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pipeline...</p>
        </div>
      </div>
    );
  }
  
  if (!pipeline) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load pipeline</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast Notification */}
      <Notification
        show={notification.show}
        message={notification.message}
        type={notification.type}
        onClose={hideNotification}
        duration={5000}
      />
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="w-full px-2 sm:px-3 lg:px-4 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Leads Pipeline</h1>
              <p className="text-xs text-gray-600 mt-0.5">Manage your sales pipeline</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:space-x-2 flex-shrink-0">
              <button
                onClick={() => setShowEditStageModal(true)}
                className="flex items-center justify-center space-x-1.5 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Manage Stages</span>
              </button>
              <button
                onClick={() => setShowCreateLeadModal(true)}
                className="flex items-center justify-center space-x-1.5 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Lead</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Pipeline Board */}
      <div className="w-full px-2 sm:px-3 lg:px-4 py-4 sm:py-6 overflow-x-hidden">
        <div className="flex space-x-1.5 sm:space-x-2 pb-4" style={{ minHeight: '400px' }}>
          {pipeline.stages && pipeline.stages.map((stage) => {
            const stageLeads = getLeadsForStage(stage.id);
            
            return (
              <div
                key={stage.id}
                className="flex-shrink-0 w-[160px] sm:w-[170px] lg:w-[180px] bg-gray-100 rounded-lg p-2"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(stage.id)}
              >
                {/* Stage Header */}
                <div 
                  className="flex items-center justify-between mb-2 p-2 rounded-lg text-white font-semibold text-sm"
                  style={{ backgroundColor: stage.color }}
                >
                  <div className="flex items-center space-x-1.5 min-w-0 flex-1">
                    <span className="truncate">{stage.name}</span>
                    <span className="bg-white bg-opacity-30 px-1.5 py-0.5 rounded text-xs flex-shrink-0 font-semibold">
                      {stageLeads.length}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteStage(stage.id)}
                    className="text-white hover:text-gray-200 flex-shrink-0 ml-1"
                    title="Delete stage"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                
                {/* Leads in Stage */}
                <div className="space-y-2">
                  {stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={() => handleDragStart(lead, stage)}
                      onClick={() => {
                        setSelectedLead(lead);
                        setShowLeadDetailsModal(true);
                      }}
                      className="bg-white rounded-lg p-2 shadow-sm hover:shadow-md cursor-move transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-xs text-gray-900 truncate">
                            {lead.first_name} {lead.last_name}
                          </h3>
                          {lead.company && (
                            <p className="text-xs text-gray-600 flex items-center mt-0.5 truncate">
                              <Building className="w-3 h-3 mr-1 flex-shrink-0" />
                              <span className="truncate">{lead.company}</span>
                            </p>
                          )}
                        </div>
                        <GripVertical className="w-3 h-3 text-gray-400 flex-shrink-0 ml-1" />
                      </div>
                      
                      <div className="space-y-0.5 text-xs text-gray-600">
                        {lead.email && (
                          <div className="flex items-center truncate">
                            <Mail className="w-3 h-3 mr-1 flex-shrink-0" />
                            <span className="truncate">{lead.email}</span>
                          </div>
                        )}
                        {lead.phone && (
                          <div className="flex items-center truncate">
                            <Phone className="w-3 h-3 mr-1 flex-shrink-0" />
                            <span className="truncate">{formatPhoneNumber(lead.phone)}</span>
                          </div>
                        )}
                        {lead.value && (
                          <div className="flex items-center font-semibold text-green-600">
                            <DollarSign className="w-3 h-3 mr-1 flex-shrink-0" />
                            ${parseFloat(lead.value).toFixed(2)}
                          </div>
                        )}
                      </div>
                      
                      {lead.source && (
                        <div className="mt-1.5">
                          <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded truncate inline-block max-w-full">
                            {lead.source}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {stageLeads.length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      No leads in this stage
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Create Lead Modal */}
      {showCreateLeadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Add New Lead</h2>
              <button
                onClick={() => setShowCreateLeadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 p-4 sm:p-6">
              <form onSubmit={handleCreateLead} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={leadFormData.firstName}
                      onChange={(e) => setLeadFormData({ ...leadFormData, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={leadFormData.lastName}
                      onChange={(e) => setLeadFormData({ ...leadFormData, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={leadFormData.email}
                      onChange={async (e) => {
                        const email = e.target.value;
                        setLeadFormData({ ...leadFormData, email: email });
                        
                        // Search for existing customer/lead by email to auto-populate name
                        if (email && email.includes('@')) {
                          try {
                            // Search in existing leads
                            const existingLeads = leads.filter(lead => 
                              lead.email && lead.email.toLowerCase() === email.toLowerCase()
                            );
                            
                            if (existingLeads.length > 0) {
                              const foundLead = existingLeads[0];
                              setNameSuggestions([{
                                firstName: foundLead.first_name || '',
                                lastName: foundLead.last_name || '',
                                email: foundLead.email || ''
                              }]);
                              setShowNameSuggestions(true);
                            } else {
                              // Try searching customers API if available
                              try {
                                const apiModule = await import('../services/api');
                                if (apiModule.customersAPI) {
                                  const customers = await apiModule.customersAPI.getAll();
                                  const foundCustomer = customers.find(c => 
                                    c.email && c.email.toLowerCase() === email.toLowerCase()
                                  );
                                  
                                  if (foundCustomer) {
                                    setNameSuggestions([{
                                      firstName: foundCustomer.firstName || foundCustomer.first_name || '',
                                      lastName: foundCustomer.lastName || foundCustomer.last_name || '',
                                      email: foundCustomer.email || ''
                                    }]);
                                    setShowNameSuggestions(true);
                                  } else {
                                    setNameSuggestions([]);
                                    setShowNameSuggestions(false);
                                  }
                                } else {
                                  setNameSuggestions([]);
                                  setShowNameSuggestions(false);
                                }
                              } catch (err) {
                                // customersAPI might not be available, that's okay
                                setNameSuggestions([]);
                                setShowNameSuggestions(false);
                              }
                            }
                          } catch (err) {
                            setNameSuggestions([]);
                            setShowNameSuggestions(false);
                          }
                        } else {
                          setNameSuggestions([]);
                          setShowNameSuggestions(false);
                        }
                      }}
                      onBlur={() => {
                        // Delay hiding suggestions to allow click
                        setTimeout(() => setShowNameSuggestions(false), 200);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {showNameSuggestions && nameSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {nameSuggestions.map((suggestion, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              setLeadFormData({
                                ...leadFormData,
                                firstName: suggestion.firstName,
                                lastName: suggestion.lastName,
                                email: suggestion.email
                              });
                              setNameSuggestions([]);
                              setShowNameSuggestions(false);
                            }}
                            className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          >
                            <div className="text-sm font-medium text-gray-900">
                              {suggestion.firstName} {suggestion.lastName}
                            </div>
                            <div className="text-xs text-gray-500">{suggestion.email}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={leadFormData.phone}
                    onChange={(e) => setLeadFormData({ ...leadFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company
                  </label>
                  <input
                    type="text"
                    value={leadFormData.company}
                    onChange={(e) => setLeadFormData({ ...leadFormData, company: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Source
                  </label>
                  <div className="relative">
                    <div className="flex gap-2">
                      <select
                        value={leadFormData.source}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '__custom__') {
                            setCustomSource('');
                            setShowSourceDropdown(true);
                          } else {
                            setLeadFormData({ ...leadFormData, source: value });
                            setShowSourceDropdown(false);
                          }
                        }}
                        onFocus={() => setShowSourceDropdown(true)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select a source...</option>
                        {leadSources.map((source) => (
                          <option key={source} value={source}>
                            {source}
                          </option>
                        ))}
                        <option value="__custom__">+ Add Custom Source</option>
                      </select>
                    </div>
                    
                    {showSourceDropdown && leadFormData.source === '__custom__' && (
                      <div className="mt-2 p-3 bg-gray-50 border border-gray-300 rounded-lg">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Custom Source Name
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={customSource}
                            onChange={(e) => setCustomSource(e.target.value)}
                            placeholder="Enter custom source name"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && customSource.trim()) {
                                e.preventDefault();
                                const newSource = customSource.trim();
                                if (!leadSources.includes(newSource)) {
                                  const updatedSources = [...leadSources, newSource];
                                  setLeadSources(updatedSources);
                                  localStorage.setItem('leadSources', JSON.stringify(updatedSources));
                                }
                                setLeadFormData({ ...leadFormData, source: newSource });
                                setCustomSource('');
                                setShowSourceDropdown(false);
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (customSource.trim()) {
                                const newSource = customSource.trim();
                                if (!leadSources.includes(newSource)) {
                                  const updatedSources = [...leadSources, newSource];
                                  setLeadSources(updatedSources);
                                  localStorage.setItem('leadSources', JSON.stringify(updatedSources));
                                }
                                setLeadFormData({ ...leadFormData, source: newSource });
                                setCustomSource('');
                                setShowSourceDropdown(false);
                              }
                            }}
                            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomSource('');
                              setShowSourceDropdown(false);
                              setLeadFormData({ ...leadFormData, source: '' });
                            }}
                            className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Allow typing custom source directly if not in dropdown */}
                    {leadFormData.source && !leadSources.includes(leadFormData.source) && leadFormData.source !== '__custom__' && (
                      <div className="mt-1 text-xs text-gray-500">
                        Press Enter or click outside to save as custom source
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Value ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={leadFormData.value}
                    onChange={(e) => setLeadFormData({ ...leadFormData, value: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={leadFormData.notes}
                    onChange={(e) => setLeadFormData({ ...leadFormData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200 mt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateLeadModal(false)}
                    className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create Lead
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Stage Modal */}
      {showEditStageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Manage Stages</h2>
              <button
                onClick={() => setShowEditStageModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 p-4 sm:p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Add New Stage</h3>
                  <form onSubmit={handleAddStage} className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Stage Name
                      </label>
                      <input
                        type="text"
                        required
                        value={stageFormData.name}
                        onChange={(e) => setStageFormData({ ...stageFormData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Color
                      </label>
                      <input
                        type="color"
                        value={stageFormData.color}
                        onChange={(e) => setStageFormData({ ...stageFormData, color: e.target.value })}
                        className="w-full h-10 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add Stage
                    </button>
                  </form>
                </div>
                
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Existing Stages</h3>
                  <div className="space-y-2">
                    {pipeline.stages && pipeline.stages.map((stage) => (
                      <div
                        key={stage.id}
                        className="flex items-center justify-between p-3 rounded-lg"
                        style={{ backgroundColor: `${stage.color}20` }}
                      >
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <div
                            className="w-4 h-4 rounded flex-shrink-0"
                            style={{ backgroundColor: stage.color }}
                          />
                          <span className="font-medium truncate">{stage.name}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteStage(stage.id)}
                          className="text-red-600 hover:text-red-700 flex-shrink-0 ml-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Lead Details Modal */}
      {showLeadDetailsModal && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Lead Details</h2>
              <button
                onClick={() => setShowLeadDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 p-4 sm:p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedLead.first_name} {selectedLead.last_name}
                  </h3>
                  {selectedLead.company && (
                    <p className="text-gray-600 flex items-center mt-1">
                      <Building className="w-4 h-4 mr-2" />
                      {selectedLead.company}
                    </p>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {selectedLead.email && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Email</label>
                      <p className="text-gray-900 flex items-center mt-1 break-words">
                        <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="break-all">{selectedLead.email}</span>
                      </p>
                    </div>
                  )}
                  {selectedLead.phone && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Phone</label>
                      <p className="text-gray-900 flex items-center mt-1">
                        <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                        {formatPhoneNumber(selectedLead.phone)}
                      </p>
                    </div>
                  )}
                  {selectedLead.source && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Source</label>
                      <p className="text-gray-900 mt-1">{selectedLead.source}</p>
                    </div>
                  )}
                  {selectedLead.value && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Estimated Value</label>
                      <p className="text-gray-900 font-semibold text-green-600 mt-1">
                        ${parseFloat(selectedLead.value).toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
                
                {selectedLead.notes && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Notes</label>
                    <p className="text-gray-900 mt-1 whitespace-pre-wrap">{selectedLead.notes}</p>
                  </div>
                )}
                
                {/* Tasks Section */}
                <div className="pt-4 border-t border-gray-200 mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Tasks</h3>
                    <button
                      onClick={() => {
                        setEditingTask(null);
                        setShowCreateTaskModal(true);
                      }}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      + Add Task
                    </button>
                  </div>
                  
                  {/* Task Filters */}
                  {tasks.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      <button
                        onClick={() => setTaskFilter('all')}
                        className={`px-3 py-1 text-xs rounded-lg ${
                          taskFilter === 'all'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        All ({tasks.length})
                      </button>
                      <button
                        onClick={() => setTaskFilter('pending')}
                        className={`px-3 py-1 text-xs rounded-lg ${
                          taskFilter === 'pending'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Pending ({tasks.filter(t => t.status === 'pending').length})
                      </button>
                      {getOverdueTasksCount() > 0 && (
                        <button
                          onClick={() => setTaskFilter('overdue')}
                          className={`px-3 py-1 text-xs rounded-lg ${
                            taskFilter === 'overdue'
                              ? 'bg-red-600 text-white'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          Overdue ({getOverdueTasksCount()})
                        </button>
                      )}
                      <button
                        onClick={() => setTaskFilter('completed')}
                        className={`px-3 py-1 text-xs rounded-lg ${
                          taskFilter === 'completed'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Completed ({tasks.filter(t => t.status === 'completed').length})
                      </button>
                    </div>
                  )}
                  
                  {/* Tasks List */}
                  {getFilteredTasks().length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="mb-2">No tasks {taskFilter !== 'all' ? `(${taskFilter})` : ''}</p>
                      {taskFilter === 'all' && (
                        <button
                          onClick={() => {
                            setEditingTask(null);
                            setShowCreateTaskModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Create your first task
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                      {getFilteredTasks().map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onEdit={handleEditTask}
                          onDelete={handleDeleteTask}
                          onStatusChange={handleTaskStatusChange}
                          showLeadInfo={false}
                        />
                      ))}
                    </div>
                  )}
                </div>
                
                {selectedLead.converted_customer_id ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 text-green-700">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-semibold">This lead has been converted to a customer</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end pt-4 border-t border-gray-200 mt-4">
                    <button
                      onClick={() => setShowConvertLeadModal(true)}
                      className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Convert to Customer
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Create/Edit Task Modal */}
      <CreateTaskModal
        isOpen={showCreateTaskModal}
        onClose={() => {
          setShowCreateTaskModal(false);
          setEditingTask(null);
        }}
        onSubmit={handleCreateTask}
        leadId={selectedLead?.id}
        teamMembers={teamMembers}
        initialData={editingTask}
        isEditing={!!editingTask}
      />
      
      {/* Convert Lead Modal */}
      {selectedLead && (
        <ConvertLeadModal
          isOpen={showConvertLeadModal}
          onClose={() => setShowConvertLeadModal(false)}
          lead={selectedLead}
          onConvert={handleConvertLead}
        />
      )}
    </div>
  );
};

export default LeadsPipeline;

