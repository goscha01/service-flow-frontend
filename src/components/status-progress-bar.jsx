import React from 'react';
import StatusHistoryTooltip from './status-history-tooltip';

const StatusProgressBar = ({ currentStatus, onStatusChange, statusHistory, isReached = false, jobCreatedAt = null }) => {
  const statuses = [
    { key: 'scheduled', label: 'Scheduled', color: 'bg-green-500' },
    { key: 'en_route', label: 'En Route', color: 'bg-blue-500' },
    { key: 'started', label: 'Started', color: 'bg-orange-500' },
    { key: 'completed', label: 'Complete', color: 'bg-purple-500' },
    { key: 'paid', label: 'Paid', color: 'bg-gray-500' }
  ];

  // Normalize status: pending=scheduled, en_route=confirmed, started=in-progress, complete=completed
  const normalizeStatus = (status) => {
    if (!status) return 'scheduled'
    const normalized = status.toLowerCase().trim()
    
    // Map to progress bar keys
    if (normalized === 'pending' || normalized === 'scheduled') {
      return 'scheduled'
    }
    if (normalized === 'confirmed' || normalized === 'enroute') {
      return 'en_route'
    }
    if (normalized === 'in-progress' || normalized === 'in_progress' || normalized === 'in_prog' || normalized === 'started') {
      return 'started'
    }
    if (normalized === 'completed' || normalized === 'complete' || normalized === 'done' || normalized === 'finished') {
      return 'completed'
    }
    if (normalized === 'paid') {
      return 'paid'
    }
    if (normalized === 'cancelled' || normalized === 'canceled') {
      return 'cancelled'
    }
    return normalized
  }

  // Map status to index
  const statusMap = {
    'scheduled': 0,
    'en_route': 1,
    'started': 2,
    'completed': 3,
    'paid': 4,
    'cancelled': -1
  };

  const normalizedStatus = normalizeStatus(currentStatus)
  const currentIndex = statusMap[normalizedStatus] ?? 0;

  // Map progress bar keys to backend status values
  const mapProgressBarKeyToBackendStatus = (key) => {
    const mapping = {
      'scheduled': 'confirmed', // Maps to en_route in backend
      'en_route': 'in-progress', // Maps to started in backend
      'started': 'completed', // Maps to complete in backend
      'completed': 'completed',
      'paid': 'paid'
    }
    return mapping[key] || key
  }

  // Map frontend status keys to backend status values for tooltip
  const mapStatusKeyToBackendStatus = (key) => {
    const mapping = {
      'scheduled': 'confirmed',
      'en_route': 'in-progress',
      'started': 'completed',
      'completed': 'completed',
      'paid': 'paid'
    };
    return mapping[key] || key;
  };

  return (
    <div className="flex items-center w-full justify-between gap-2">
      {statuses.map((status, index) => {
        const isActive = index <= currentIndex;
        const isCurrent = index === currentIndex;
        const backendStatus = mapStatusKeyToBackendStatus(status.key);
        // Only show tooltip for statuses that have been reached (passed or current)
        const isReached = isActive;
        
        return (
          <StatusHistoryTooltip
            key={status.key}
            statusHistory={statusHistory}
            status={backendStatus}
            isReached={isReached}
            jobCreatedAt={jobCreatedAt}
          >
            <button
              onClick={() => onStatusChange && onStatusChange(mapProgressBarKeyToBackendStatus(status.key))}
              className={`
                 w-full relative px-6 py-2.5 text-sm font-semibold whitespace-nowrap transition-all
                ${isActive 
                  ? `${status.color} text-white` 
                  : 'bg-gray-200 text-gray-500'}
                ${isCurrent ? 'shadow-md' : ''}
                ${index === 0 ? 'rounded-l-lg' : ''}
                ${index === statuses.length - 1 ? 'rounded-r-lg' : ''}
                hover:opacity-90
              `}
              style={{ 
                fontFamily: 'Montserrat', fontWeight: 600,
                clipPath: index > 0 && index < statuses.length - 1
                  ? 'polygon(0% 0%, calc(100% - 18px) 0%, 100% 50%, calc(100% - 18px) 100%, 0% 100%, 18px 50%)'
                  : index === 0
                  ? 'polygon(0% 0%, calc(100% - 18px) 0%, 100% 50%, calc(100% - 18px) 100%, 0% 100%)'
                  : 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 18px 50%)',
                marginLeft: index > 0 ? '-12px' : '0',
                zIndex: isCurrent ? 10 : isActive ? 5 : 1
              }}
            >
              {status.label}
            </button>
          </StatusHistoryTooltip>
        );
      })}
    </div>
  );
};

export default StatusProgressBar;

