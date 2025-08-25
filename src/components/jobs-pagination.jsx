"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

const JobsPagination = () => {
  return (
    <div className="bg-white border-t border-gray-200 px-4 lg:px-6 py-4">
      <div className="flex items-center justify-center space-x-4">
        <button disabled className="p-2 rounded-lg border border-gray-300 text-gray-400 cursor-not-allowed">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button disabled className="p-2 rounded-lg border border-gray-300 text-gray-400 cursor-not-allowed">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

export default JobsPagination
