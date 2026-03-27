import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Sidebar from "../components/sidebar"
import CreateCouponForm from "../components/create-coupon-form"
import { ChevronLeft } from "lucide-react"

const CreateCouponPage = () => {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-[var(--sf-bg-page)] overflow-hidden">
      {/* Main Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} activePage="coupons" />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}

        {/* Header */}
        <div className="bg-white border-b border-[var(--sf-border-light)] px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate("/coupons")}
              className="flex items-center text-[var(--sf-text-secondary)] hover:text-[var(--sf-text-primary)]"
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