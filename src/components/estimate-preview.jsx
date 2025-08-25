"use client"

const EstimatePreview = () => {
  return (
    <div className="relative max-w-sm mx-auto">
      {/* Phone mockup background */}
      <div className="bg-gray-200 rounded-3xl p-2 shadow-2xl">
        <div className="bg-white rounded-2xl overflow-hidden">
          {/* Estimate content */}
          <div className="p-6 space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Refrigerator Repair Estimate</h3>

              {/* Placeholder lines */}
              <div className="space-y-2 mb-6">
                <div className="h-2 bg-gray-200 rounded w-full"></div>
                <div className="h-2 bg-gray-200 rounded w-3/4 mx-auto"></div>
                <div className="h-2 bg-gray-200 rounded w-5/6 mx-auto"></div>
              </div>

              {/* Pricing section */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Subtotal</span>
                  <div className="h-2 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Discount</span>
                  <div className="h-2 bg-gray-200 rounded w-12"></div>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Estimated</span>
                    <span className="font-bold text-green-600 text-lg">$170.00</span>
                  </div>
                </div>
              </div>

              {/* Book Now button */}
              <button className="w-full bg-black text-white py-3 rounded-lg font-medium mb-3">Book Now</button>

              {/* Next available time */}
              <p className="text-xs text-gray-500">Next available time: Fri, Sep 13th</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EstimatePreview
