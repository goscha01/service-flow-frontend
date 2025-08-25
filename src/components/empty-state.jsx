import React, { useState } from 'react'
import { Mail, X, Calendar, DollarSign, BookOpen } from 'lucide-react'

const RequestsEmptyState = () => {
  const [showModal, setShowModal] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)

  const handleHowRequestsWork = () => {
    setShowModal(true)
    setCurrentStep(1)
  }

  const handleClose = () => {
    setShowModal(false)
    setCurrentStep(1)
  }

  const handleContinue = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    } else {
      handleClose()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Requests Yet</h3>
          <p className="text-gray-600 mb-6 leading-relaxed">
            You haven't received any requests yet. Once customers start submitting booking or quote requests, they'll
            appear here
          </p>
          <button 
            onClick={handleHowRequestsWork}
            className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
          >
            How Requests Work
          </button>
        </div>
      </div>

      {/* Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg relative shadow-2xl">
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Modal Content */}
            <div className="px-8 py-8">
              {/* Step 1: Set Up Your Requestable Services */}
              {currentStep === 1 && (
                <div className="text-center">
                  {/* Illustration */}
                  <div className="mb-8">
                    <div className="w-64 h-48 bg-gray-100 rounded-2xl mx-auto relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50"></div>
                      
                      {/* Service Card Mockup */}
                      <div className="absolute top-8 left-1/2 transform -translate-x-1/2">
                        <div className="bg-white rounded-lg shadow-lg p-4 w-48">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <div className="w-6 h-6 bg-blue-500 rounded"></div>
                            </div>
                            <span className="text-sm font-medium text-gray-700">Refrigerator Repair</span>
                          </div>
                          
                          <div className="mb-4">
                            <p className="text-xs text-gray-500 mb-2">Booking page behavior</p>
                            <div className="flex gap-2">
                              <div className="flex-1 border border-gray-200 rounded-lg p-2 text-center">
                                <Calendar className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                                <span className="text-xs text-gray-600">Bookable</span>
                              </div>
                              <div className="flex-1 border-2 border-blue-500 bg-blue-50 rounded-lg p-2 text-center">
                                <BookOpen className="w-4 h-4 mx-auto mb-1 text-blue-500" />
                                <span className="text-xs text-blue-600 font-medium">Booking Request</span>
                              </div>
                              <div className="flex-1 border border-gray-200 rounded-lg p-2 text-center">
                                <DollarSign className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                                <span className="text-xs text-gray-600">Quote Request</span>
                              </div>
                            </div>
                          </div>
                          
                          <button className="w-full bg-green-500 text-white text-xs py-2 rounded-lg font-medium">
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Set Up Your Requestable Services</h2>
                  <p className="text-gray-600 mb-8 leading-relaxed">
                    To start using requests, edit a service and change its booking flow to either "Booking Request" or "Quote Request."
                  </p>

                  {/* Progress Dots */}
                  <div className="flex justify-center gap-2 mb-8">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                  </div>

                  <button
                    onClick={handleContinue}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
                  >
                    Continue
                  </button>
                </div>
              )}

              {/* Step 2: Customers Submit Requests */}
              {currentStep === 2 && (
                <div className="text-center">
                  {/* Illustration */}
                  <div className="mb-8">
                    <div className="w-64 h-48 bg-gray-100 rounded-2xl mx-auto relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-blue-50"></div>
                      
                      {/* Customer Interface Mockup */}
                      <div className="absolute top-6 left-1/2 transform -translate-x-1/2">
                        <div className="bg-white rounded-lg shadow-lg p-4 w-52">
                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-800 mb-3">Is your refrigerator running?</p>
                            <div className="space-y-2">
                              <button className="w-full border-2 border-green-500 bg-green-50 text-green-700 py-2 px-3 rounded-lg text-sm font-medium">
                                Not Running
                              </button>
                              <button className="w-full border border-gray-200 text-gray-600 py-2 px-3 rounded-lg text-sm">
                                Running
                              </button>
                            </div>
                          </div>
                          
                          <button className="w-full bg-green-500 text-white py-2 rounded-lg text-sm font-medium mb-3">
                            Continue
                          </button>
                        </div>
                      </div>

                      {/* Service Request Card */}
                      <div className="absolute bottom-4 right-4">
                        <div className="bg-white rounded-lg shadow-md p-3 w-32">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-bold">R</span>
                            </div>
                            <span className="text-xs font-medium text-gray-700">Refrigerator Repair</span>
                          </div>
                          <div className="text-xs text-gray-500">Service Request</div>
                          <div className="mt-2 space-y-1">
                            <div className="h-1 bg-gray-200 rounded"></div>
                            <div className="h-1 bg-gray-200 rounded w-3/4"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Customers Submit Requests</h2>
                  <p className="text-gray-600 mb-8 leading-relaxed">
                    Once a service is set to "Requestable" or "Quote Request," customers will be prompted to select their preferred dates and times on your booking page. They'll submit a request instead of confirming an immediate booking.
                  </p>

                  {/* Progress Dots */}
                  <div className="flex justify-center gap-2 mb-8">
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handlePrevious}
                      className="flex-1 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      Previous
                    </button>
                    <button
                      onClick={handleContinue}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Review and Respond */}
              {currentStep === 3 && (
                <div className="text-center">
                  {/* Illustration */}
                  <div className="mb-8">
                    <div className="w-64 h-48 bg-gray-100 rounded-2xl mx-auto relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50"></div>
                      
                      {/* Request Card */}
                      <div className="absolute top-6 left-1/2 transform -translate-x-1/2">
                        <div className="bg-white rounded-lg shadow-lg p-4 w-52">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm font-bold">EM</span>
                            </div>
                            <div className="flex-1 text-left">
                              <p className="text-sm font-medium text-gray-800">Edgar Minnows</p>
                              <p className="text-xs text-gray-500">Chevy Chase, MD</p>
                            </div>
                          </div>
                          
                          <div className="text-left mb-4">
                            <p className="text-xs text-gray-500 mb-1">Request for Refrigerator Repair</p>
                            <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Booking</span>
                          </div>

                          <div className="text-left">
                            <p className="text-sm font-medium text-gray-800 mb-2">Preferred Timeslots</p>
                            <p className="text-sm font-medium text-gray-700 mb-2">Tue, Oct 2</p>
                            <div className="flex gap-2 mb-3">
                              <span className="border-2 border-blue-500 text-blue-600 text-xs px-2 py-1 rounded">12 PM - 1 PM</span>
                              <span className="border border-gray-300 text-gray-600 text-xs px-2 py-1 rounded">3 PM - 4 PM</span>
                            </div>
                            <p className="text-sm font-medium text-gray-700">Thu, Oct 4</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Review and Respond</h2>
                  <p className="text-gray-600 mb-8 leading-relaxed">
                    All customer requests will appear here in the Requests tab. Review each request, provide a quote if needed, or choose a specific time to schedule the service.
                  </p>

                  {/* Progress Dots */}
                  <div className="flex justify-center gap-2 mb-8">
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handlePrevious}
                      className="flex-1 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      Previous
                    </button>
                    <button
                      onClick={handleContinue}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default RequestsEmptyState