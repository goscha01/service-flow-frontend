import React from 'react';
import { 
  Calendar, 
  User, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  XCircle,
  MoreVertical,
  Edit,
  Trash2,
  X
} from 'lucide-react';
import { formatDateLocal } from '../utils/dateUtils';

const TaskCard = ({ 
  task, 
  onEdit, 
  onDelete, 
  onStatusChange,
  showLeadInfo = false 
}) => {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'in_progress':
        return <Clock className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const isOverdue = () => {
    if (!task.due_date || task.status === 'completed') return false;
    return new Date(task.due_date) < new Date();
  };

  const formatDueDate = (dateString) => {
    if (!dateString) return 'No due date';
    
    // Handle both Date objects and date strings
    let date;
    if (dateString instanceof Date) {
      date = dateString;
    } else {
      date = new Date(dateString);
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const diffTime = taskDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays <= 7) return `In ${diffDays} days`;
    
    // formatDateLocal expects a Date object, not a string
    return formatDateLocal(date);
  };

  return (
    <div className={`bg-white rounded-lg border-2 p-4 shadow-sm hover:shadow-md transition-shadow ${
      isOverdue() ? 'border-red-300 bg-red-50' : 'border-gray-200'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
              {task.title}
            </h3>
            <span className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(task.priority)}`}>
              {task.priority}
            </span>
          </div>
          
          {task.description && (
            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
              {task.description}
            </p>
          )}
          
          {showLeadInfo && task.leads && (
            <div className="text-xs text-gray-500 mb-2">
              Lead: {task.leads.first_name} {task.leads.last_name}
              {task.leads.company && ` • ${task.leads.company}`}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-1 ml-2">
          <button
            onClick={() => onEdit(task)}
            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
            title="Edit task"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
            title="Delete task"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-600">
        {task.due_date && (
          <div className={`flex items-center space-x-1 ${
            isOverdue() ? 'text-red-600 font-semibold' : ''
          }`}>
            <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>{formatDueDate(task.due_date)}</span>
          </div>
        )}
        
        {task.assigned_to && task.team_members && (
          <div className="flex items-center space-x-1">
            <User className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>
              {task.team_members.first_name} {task.team_members.last_name}
            </span>
          </div>
        )}
        
        <div className={`flex items-center space-x-1 px-2 py-1 rounded ${getStatusColor(task.status)}`}>
          {getStatusIcon(task.status)}
          <span className="capitalize">{task.status.replace('_', ' ')}</span>
        </div>
      </div>
      
      {isOverdue() && (
        <div className="mt-2 text-xs text-red-600 font-medium">
          ⚠️ This task is overdue
        </div>
      )}
    </div>
  );
};

export default TaskCard;

