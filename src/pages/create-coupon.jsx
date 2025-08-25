import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../components/sidebar"
import MobileHeader from "../components/mobile-header"
import CreateCouponForm from "../components/create-coupon-form"
import { ChevronLeft } from "lucide-react"

const CreateCouponPage = () => {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Main Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} activePage="coupons" />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <MobileHeader onMenuClick={() => setSidebarOpen(true)} />

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate("/coupons")}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="ml-1">Back to Coupons</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <CreateCouponForm />
        </div>
      </div>
    </div>
  )
}

export default CreateCouponPage 