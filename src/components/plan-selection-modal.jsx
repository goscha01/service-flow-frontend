"use client"

import { X, Check } from "lucide-react"
import { useState } from "react"

const PlanSelectionModal = ({ isOpen, onClose, onPlanSelect }) => {
  const [selectedPlan, setSelectedPlan] = useState("standard")

  if (!isOpen) return null

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const plans = [
    {
      id: "starter",
      name: "Starter",
      price: 19,
      period: "month",
      description: "Perfect for small businesses getting started",
      features: [
        "Up to 50 jobs per month",
        "Basic scheduling",
        "Customer management",
        "Email notifications",
        "Mobile app access"
      ],
      popular: false
    },
    {
      id: "standard",
      name: "Standard",
      price: 29,
      period: "month",
      description: "Most popular for growing businesses",
      features: [
        "Unlimited jobs",
        "Advanced scheduling",
        "Customer management",
        "SMS & email notifications",
        "Mobile app access",
        "Online booking",
        "Payment processing",
        "Basic reporting"
      ],
      popular: true
    },
    {
      id: "professional",
      name: "Professional",
      price: 49,
      period: "month",
      description: "For established businesses needing advanced features",
      features: [
        "Everything in Standard",
        "Advanced reporting & analytics",
        "Team management",
        "API access",
        "Custom branding",
        "Priority support",
        "Integrations"
      ],
      popular: false
    }
  ]

  const handlePlanSelect = (planId) => {
    setSelectedPlan(planId)
  }

  const handleConfirm = () => {
    const plan = plans.find(p => p.id === selectedPlan)
    if (plan && onPlanSelect) {
      onPlanSelect(plan)
    }
    onClose()
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl w-full max-w-5xl relative my-6">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Choose Your Plan</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 hover:bg-gray-100 p-1 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {plans.map((plan) => (
              <div
                key={plan.id}
                onClick={() => handlePlanSelect(plan.id)}
                className={`relative border-2 rounded-lg p-6 cursor-pointer transition-all ${
                  selectedPlan === plan.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white px-3 py-1 text-sm font-medium rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="mb-2">
                    <span className="text-3xl font-bold text-gray-900">${plan.price}</span>
                    <span className="text-gray-600">/{plan.period}</span>
                  </div>
                  <p className="text-sm text-gray-600">{plan.description}</p>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {selectedPlan === plan.id && (
                  <div className="absolute top-4 right-4">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Select Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PlanSelectionModal