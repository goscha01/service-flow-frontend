import React, { useState, useRef, useEffect } from 'react';

const StatusHistoryTooltip = ({ statusHistory, status, children, isReached = false, jobCreatedAt = null }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef(null);
  const tooltipContentRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    // Calculate tooltip position
    if (tooltipRef.current) {
      const buttonRect = tooltipRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: buttonRect.bottom + 8,
        left: buttonRect.left + (buttonRect.width / 2)
      });
    }
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 200);
  };

  // Parse status history
  const parseStatusHistory = () => {
    if (!statusHistory) return [];
    
    try {
      if (typeof statusHistory === 'string') {
        return JSON.parse(statusHistory);
      }
      return Array.isArray(statusHistory) ? statusHistory : [];
    } catch (e) {
      console.error('Error parsing status history:', e);
      return [];
    }
  };

  const history = parseStatusHistory();
  
  // Check if this is a scheduled status (only pending and scheduled, NOT confirmed)
  // 'confirmed' is the en_route status and should show its own history entry
  const isScheduledStatus = status === 'pending' || status === 'scheduled';
  
  // For scheduled status, ALWAYS use job creation date
  // But try to get the actual creator from history first
  let currentStatusEntry;
  if (isScheduledStatus && jobCreatedAt) {
    // First check if there's a scheduled status entry in history (only pending or scheduled, not confirmed)
    const scheduledHistoryEntry = history
      .filter(entry => entry.status === 'pending' || entry.status === 'scheduled')
      .sort((a, b) => new Date(a.changed_at) - new Date(b.changed_at))[0]; // Get the earliest one (creation)
    
    if (scheduledHistoryEntry) {
      // Use the history entry which has the actual creator info
      currentStatusEntry = scheduledHistoryEntry;
    } else {
      // Fallback to creation date with a default name
      currentStatusEntry = {
        status: status,
        changed_at: jobCreatedAt,
        changed_by: 'Staff',
        previous_status: null
      };
    }
  } else {
    // For other statuses, find the most recent entry for the current status
    currentStatusEntry = history
      .filter(entry => entry.status === status)
      .sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at))[0];
  }

  // Format date like "Wed, Nov 26 at 2:12 PM"
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const day = date.getDate();
      const time = date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      return `${weekday}, ${month} ${day} at ${time}`;
    } catch (e) {
      return dateString;
    }
  };

  // Get status label
  const getStatusLabel = (statusValue) => {
    const statusMap = {
      'pending': 'Scheduled',
      'scheduled': 'Scheduled',
      'confirmed': 'En Route',
      'en_route': 'En Route',
      'enroute': 'En Route',
      'in-progress': 'Started',
      'in_progress': 'Started',
      'started': 'Started',
      'completed': 'Completed',
      'complete': 'Completed',
      'cancelled': 'Cancelled',
      'canceled': 'Cancelled'
    };
    return statusMap[statusValue?.toLowerCase()] || statusValue || 'Unknown';
  };

  // Get action description
  const getActionDescription = (entry) => {
    const statusLabel = getStatusLabel(entry.status);
    if (statusLabel.toLowerCase() === 'scheduled') {
      return `Job scheduled by ${entry.changed_by || 'staff'}`;
    }
    return `Job ${statusLabel.toLowerCase()} by ${entry.changed_by || 'staff'}`;
  };

  // Only show tooltip if status has been reached and has history
  if (!isReached || (!currentStatusEntry && history.length === 0)) {
    return children;
  }

  // Clone the child element and attach event handlers directly to it
  const childWithHandlers = React.cloneElement(children, {
    onMouseEnter: (e) => {
      handleMouseEnter();
      if (children.props.onMouseEnter) {
        children.props.onMouseEnter(e);
      }
    },
    onMouseLeave: (e) => {
      handleMouseLeave();
      if (children.props.onMouseLeave) {
        children.props.onMouseLeave(e);
      }
    },
    ref: (node) => {
      tooltipRef.current = node;
      if (typeof children.ref === 'function') {
        children.ref(node);
      } else if (children.ref) {
        children.ref.current = node;
      }
    }
  });

  return (
    <>
      {childWithHandlers}
      
      {isVisible && currentStatusEntry && (
        <div 
          ref={tooltipContentRef}
          className="fixed z-[100] bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-[280px] max-w-[320px]"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            transform: 'translateX(-50%)',
            fontFamily: 'Montserrat'
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Arrow pointing up */}
          <div 
            className="absolute bottom-full left-1/2 transform -translate-x-1/2 -mb-1"
            style={{
              width: 0,
              height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderBottom: '8px solid white'
            }}
          />
          
          {/* Content */}
          <div className="space-y-2">
            <div className="text-xs text-gray-500" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
              {formatDate(currentStatusEntry.changed_at)}
            </div>
            <div className="text-base font-bold text-gray-900" style={{ fontFamily: 'Montserrat', fontWeight: 700 }}>
              {getActionDescription(currentStatusEntry)}
            </div>
            {currentStatusEntry.changed_by && (
              <div className="text-sm text-gray-700" style={{ fontFamily: 'Montserrat', fontWeight: 400 }}>
                Via {currentStatusEntry.changed_by}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default StatusHistoryTooltip;

