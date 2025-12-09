"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../../components/sidebar"
import CreateSkillTagModal from "../../components/create-skill-tag-modal"
import { ChevronLeft } from "lucide-react"

const JobAssignment = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const [isSkillTagModalOpen, setIsSkillTagModalOpen] = useState(false)
  const [skillTags, setSkillTags] = useState([])
  const [settings, setSettings] = useState({
    autoAssignmentMethod: "balanced",
    allowViewClaimOutsideHours: false,
    allowViewClaimOverlapping: false,
    showJobNotes: false,
    showCustomerNotes: false,
    showIntakeQuestions: true,
  })

  const handleSaveSkillTag = (skillTag) => {
    setSkillTags(prev => [...prev, skillTag])
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate("/settings")}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Settings</span>
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">Job Assignment</h1>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-6 space-y-8">
            {/* Skill Tags */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Skill Tags</h2>
              <p className="text-gray-600 mb-4">
                Skill tags can be used to make sure workers meet specific service-related skills, certifications,
                equipment and licensing requirements.
              </p>
              <button className="text-blue-600 hover:text-blue-700 font-medium text-sm mb-6">
                Learn more about skill tags
              </button>

              {skillTags.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                  <p className="text-gray-500 mb-4">No skill tags created yet</p>
                  <button 
                    onClick={() => setIsSkillTagModalOpen(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
                  >
                    Create Skill
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Skill Tags</h3>
                    <button 
                      onClick={() => setIsSkillTagModalOpen(true)}
                      className="bg-blue-600 text-white px-3 py-1.5 text-sm rounded-lg hover:bg-blue-700"
                    >
                      Create Skill
                    </button>
                  </div>
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex flex-wrap gap-2">
                      {skillTags.map((tag) => (
                        <div key={tag.id} className="inline-flex items-center bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                          {tag.name}
                          <button 
                            onClick={() => setSkillTags(prev => prev.filter(t => t.id !== tag.id))}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Auto-Assignment */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Auto-Assignment</h2>
              <p className="text-gray-600 mb-6">
                When auto-assignment is turned on for a service, and multiple providers are available for the same
                timeframe, you can choose how jobs should be automatically assigned.
              </p>
              <button className="text-blue-600 hover:text-blue-700 font-medium text-sm mb-6">
                Learn more about auto-assigning jobs
              </button>

              <div>
                <h3 className="font-medium text-gray-900 mb-4">Auto-assignment method</h3>

                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <input type="radio" name="assignment" className="mt-1" />
                      <div>
                        <h4 className="font-medium text-gray-900">Prioritized</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Jobs are assigned to available service providers who meet the job requirements in prioritized
                          order.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <input type="radio" name="assignment" defaultChecked className="mt-1" />
                      <div>
                        <h4 className="font-medium text-gray-900">Balanced</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Jobs are randomly assigned to available service providers who meet the job requirements.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <input type="radio" name="assignment" className="mt-1" />
                      <div className="flex items-center justify-between w-full">
                        <div>
                          <h4 className="font-medium text-gray-900">Based on drive time and distance</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Jobs are assigned to the closest available service providers who meet the job requirements.
                          </p>
                        </div>
                        <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded font-medium">
                          Get feature
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Job Offers */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Job Offers</h2>
              <p className="text-gray-600 mb-6">
                When job offers are turned on for a service or job, providers who meet the required skills and are
                located in the job's service territory, can claim the job and be assigned.{" "}
                <button className="text-blue-600 hover:text-blue-700">Learn more about offering jobs</button>
              </p>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Allow providers to view/claim jobs outside of their work hours
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      When enabled, providers will be able to see and claim available jobs that are scheduled for
                      day/times outside of their recurring work hours.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setSettings({ ...settings, allowViewClaimOutsideHours: !settings.allowViewClaimOutsideHours })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.allowViewClaimOutsideHours ? "bg-blue-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.allowViewClaimOutsideHours ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Allow providers to view/claim jobs that overlap with existing assignments
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      When enabled, the available jobs that providers can see / claim will include ones that overlap
                      with existing jobs that have been assigned to them.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setSettings({ ...settings, allowViewClaimOverlapping: !settings.allowViewClaimOverlapping })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.allowViewClaimOverlapping ? "bg-blue-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.allowViewClaimOverlapping ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">Show job notes when a provider views an available job</h4>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, showJobNotes: !settings.showJobNotes })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.showJobNotes ? "bg-blue-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.showJobNotes ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Show customer notes when a provider views an available job
                    </h4>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, showCustomerNotes: !settings.showCustomerNotes })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.showCustomerNotes ? "bg-blue-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.showCustomerNotes ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Show intake questions when a provider views an available job
                    </h4>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, showIntakeQuestions: !settings.showIntakeQuestions })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.showIntakeQuestions ? "bg-blue-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.showIntakeQuestions ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <CreateSkillTagModal
        isOpen={isSkillTagModalOpen}
        onClose={() => setIsSkillTagModalOpen(false)}
        onSave={handleSaveSkillTag}
      />
    </div>
  )
}

export default JobAssignment
