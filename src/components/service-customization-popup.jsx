import React from 'react';
import { X } from 'lucide-react';
import ServiceModifiersForm from './service-modifiers-form';
import IntakeQuestionsForm from './intake-questions-form';

const ServiceCustomizationPopup = ({ 
  isOpen, 
  onClose, 
  service, 
  modifiers = [], 
  intakeQuestions = [], 
  onModifiersChange, 
  onIntakeQuestionsChange,
  onSave,
  initialAnswers = {},
  selectedModifiers = {}
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Customize {service?.name || 'Service'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Select options and provide additional information for this service
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 hover:bg-gray-100 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-8">
            {/* Service Modifiers */}
            {modifiers && modifiers.length > 0 && (
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Service Options</h3>
                  <p className="text-sm text-gray-600">
                    Select any additional options to customize this service.
                  </p>
                </div>
                
                <ServiceModifiersForm 
                  modifiers={modifiers}
                  selectedModifiers={selectedModifiers}
                  onModifiersChange={onModifiersChange}
                />
              </div>
            )}

            {/* Intake Questions */}
            {intakeQuestions && intakeQuestions.length > 0 && (
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Customer Information</h3>
                  <p className="text-sm text-gray-600">
                    Please provide additional details for this job.
                  </p>
                </div>
                
                <IntakeQuestionsForm 
                  questions={intakeQuestions}
                  initialAnswers={initialAnswers}
                  onAnswersChange={onIntakeQuestionsChange}
                />
              </div>
            )}

            {/* No customization options */}
            {(!modifiers || modifiers.length === 0) && (!intakeQuestions || intakeQuestions.length === 0) && (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No Customization Options</h3>
                <p className="text-sm text-gray-600">
                  This service doesn't have any additional options or questions to configure.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Save & Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServiceCustomizationPopup;
