import React from 'react';
import Sidebar from './sidebar';
import MobileHeader from './mobile-header';

const PageLayout = ({ 
  children, 
  title, 
  subtitle, 
  showBackButton = false, 
  onBack, 
  headerActions,
  maxWidth = "max-w-7xl",
  showSidebar = true 
}) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Layout */}
      <div className="hidden lg:flex h-screen">
        {showSidebar && <Sidebar />}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className={`mx-auto ${maxWidth} px-4 sm:px-6 lg:px-8 py-8`}>
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {showBackButton && (
                      <button
                        onClick={onBack}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                    )}
                    <div>
                      {title && (
                        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                      )}
                      {subtitle && (
                        <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
                      )}
                    </div>
                  </div>
                  {headerActions && (
                    <div className="flex items-center space-x-3">
                      {headerActions}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Content */}
              {children}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden">
        <MobileHeader />
        <div className="px-4 py-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {showBackButton && (
                  <button
                    onClick={onBack}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                <div>
                  {title && (
                    <h1 className="text-xl font-bold text-gray-900">{title}</h1>
                  )}
                  {subtitle && (
                    <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
                  )}
                </div>
              </div>
              {headerActions && (
                <div className="flex items-center space-x-2">
                  {headerActions}
                </div>
              )}
            </div>
          </div>
          
          {/* Content */}
          {children}
        </div>
      </div>
    </div>
  );
};

export default PageLayout;
