"use client"

import { Info } from "lucide-react"

const EstimatesFeature = () => {
  return (
    <div className="text-center max-w-2xl mx-auto">
      {/* Professional plan notice */}
      <div className="flex items-center justify-center space-x-2 mb-8">
        <div className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center">
          <Info className="w-3 h-3 text-purple-600" />
        </div>
        <span className="text-sm text-gray-600">Available on the Professional plan</span>
      </div>

      {/* Feature description */}
      <div className="space-y-4">
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">Send Bookable Estimates to Customers</h2>
        <p className="text-lg text-gray-600 leading-relaxed">
          Create custom quotes that customers can easily review and book with just a few clicks.
        </p>
        <button className="text-blue-600 hover:text-blue-700 font-medium">Learn more...</button>
      </div>
    </div>
  )
}

export default EstimatesFeature
