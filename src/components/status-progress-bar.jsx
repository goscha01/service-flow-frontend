import React from 'react';

const StatusProgressBar = ({ currentStatus, onStatusChange }) => {
  const statuses = [
    { key: 'scheduled', label: 'Scheduled', color: 'bg-green-500' },
    { key: 'en_route', label: 'En Route', color: 'bg-blue-500' },
    { key: 'started', label: 'Started', color: 'bg-orange-500' },
    { key: 'completed', label: 'Complete', color: 'bg-purple-500' },
    { key: 'paid', label: 'Paid', color: 'bg-gray-500' }
  ];

  // Map status to index
  const statusMap = {
    'pending': 0,
    'confirmed': 0,
    'scheduled': 0,
    'en_route': 1,
    'in_progress': 2,
    'started': 2,
    'completed': 3,
    'paid': 4,
    'cancelled': -1
  };

  const currentIndex = statusMap[currentStatus] ?? 0;

  return (
    <div className="flex items-center w-full">
      {statuses.map((status, index) => {
        const isActive = index <= currentIndex;
        const isCurrent = index === currentIndex;
        
        return (
          <button
            key={status.key}
            onClick={() => onStatusChange && onStatusChange(status.key)}
            className={`
              flex-1 relative px-6 py-2.5 text-sm font-semibold transition-all
              ${isActive 
                ? `${status.color} text-white` 
                : 'bg-gray-200 text-gray-500'}
              ${isCurrent ? 'shadow-md' : ''}
              ${index === 0 ? 'rounded-l-lg' : ''}
              ${index === statuses.length - 1 ? 'rounded-r-lg' : ''}
              hover:opacity-90
            `}
            style={{ 
              fontFamily: 'ProximaNova-Semibold',
              clipPath: index > 0 && index < statuses.length - 1
                ? 'polygon(12px 0%, 100% 0%, calc(100% - 12px) 50%, 100% 100%, 12px 100%, 0% 50%)'
                : index === 0
                ? 'polygon(0% 0%, 100% 0%, calc(100% - 12px) 50%, 100% 100%, 0% 100%)'
                : 'polygon(12px 0%, 100% 0%, 100% 100%, 12px 100%, 0% 50%)',
              marginLeft: index > 0 ? '-12px' : '0',
              zIndex: isCurrent ? 10 : isActive ? 5 : 1
            }}
          >
            {status.label}
          </button>
        );
      })}
    </div>
  );
};

export default StatusProgressBar;

