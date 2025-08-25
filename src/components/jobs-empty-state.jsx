"use client"

import { Plus } from "lucide-react"
import { useNavigate } from "react-router-dom"

const JobsEmptyState = ({ activeTab }) => {
  const navigate = useNavigate()

  const getEmptyMessage = () => {
    switch (activeTab) {
      case "upcoming":
        return "You have no upcoming jobs"
      case "past":
        return "You have no past jobs"
      case "complete":
        return "You have no completed jobs"
      case "incomplete":
        return "You have no incomplete jobs"
      case "canceled":
        return "You have no canceled jobs"
      default:
        return "You have no jobs"
    }
  }

  const handleAddJob = () => {
    navigate("/createjob")
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="text-center justify-center items-center">
        <center>
        <p className="text-lg text-gray-600 mb-6">{getEmptyMessage()}</p>
        <button 
          onClick={handleAddJob}
          className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center hover:bg-primary-700 transition-all duration-200 transform hover:scale-[1.02] focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          <Plus className="w-5 h-5" />
        </button>
        </center>
      </div>
    </div>
  )
}

export default JobsEmptyState
