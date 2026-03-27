import React, { useState } from 'react';
import { 
  Search, 
  Plus,
  LayoutDashboard,
  FileText,
  Calendar,
  Briefcase,
  Receipt,
  CreditCard,
  Users,
  UsersRound,
  Wrench,
  Tag,
  MapPin,
  Globe,
  Settings,
  Zap
} from 'lucide-react';
import Sidebar from '../components/sidebar';

const ServiceFlowEstimatePage = () => {
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(false); 

  const sidebarItems = [
    { icon: LayoutDashboard, label: 'Dashboard', active: false },
    { icon: FileText, label: 'Requests', active: false },
    { icon: Calendar, label: 'Schedule', active: false },
    { icon: Briefcase, label: 'Jobs', active: false },
    { icon: Receipt, label: 'Estimates', active: true },
    { icon: Calendar, label: 'Recurring', active: false },
    { icon: CreditCard, label: 'Payments', active: false },
    { icon: Users, label: 'Customers', active: false },
    { icon: UsersRound, label: 'Team', active: false },
    { icon: Wrench, label: 'Services', active: false },
    { icon: Tag, label: 'Coupons', active: false },
    { icon: MapPin, label: 'Territories', active: false },
    { icon: Globe, label: 'Online Booking', active: false },
    { icon: Settings, label: 'Settings', active: false },
  ];

  return (
    <div className="flex h-screen bg-[var(--sf-bg-page)] overflow-hidden">
          {/* Sidebar */}
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    
          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Mobile Header */}
      {/* Main Content */}
      <div className="flex-1 flex flex-col  h-screen overflow-scroll">
        {/* Header */}
        <div className="bg-white border-b border-[var(--sf-border-light)] px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-[var(--sf-text-primary)]">Create Bookable Estimate</h1>
            <div className="flex space-x-3">
              <button className="px-4 py-2 text-[var(--sf-text-primary)] border border-[var(--sf-border-light)] rounded-lg hover:bg-[var(--sf-bg-page)] transition-colors">
                Cancel
              </button>
              <button className="px-4 py-2 bg-[var(--sf-blue-500)] text-white rounded-lg hover:bg-[var(--sf-blue-500)] transition-colors">
                Save Booking Link
              </button>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 p-6 space-y-8">
          {/* Customer Section */}
          <div className="bg-white rounded-lg shadow-sm border border-[var(--sf-border-light)] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--sf-text-primary)]">Customer</h2>
              <button className="text-blue-500 hover:text-[var(--sf-blue-500)] font-medium text-sm flex items-center space-x-1">
                <Plus className="w-4 h-4" />
                <span>New Customer</span>
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--sf-text-muted)] w-5 h-5" />
              <input
                type="text"
                placeholder="Search customers"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-[var(--sf-border-light)] rounded-lg focus:ring-2 focus:ring-[var(--sf-blue-500)] focus:border-transparent"
              />
            </div>
          </div>

          {/* Services Section */}
          <div className="bg-white rounded-lg shadow-sm border border-[var(--sf-border-light)] p-6">
            <h2 className="text-lg font-semibold text-[var(--sf-text-primary)] mb-4">Services</h2>
            <div className="text-center py-12 text-[var(--sf-text-muted)]">
              <Wrench className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No services selected</p>
              <button className="mt-4 text-blue-500 hover:text-[var(--sf-blue-500)] font-medium">
                Add Service
              </button>
            </div>
          </div>

          {/* Schedule Section */}
          <div className="bg-white rounded-lg shadow-sm border border-[var(--sf-border-light)] p-6">
            <h2 className="text-lg font-semibold text-[var(--sf-text-primary)] mb-4">Schedule</h2>
            <div className="text-center py-12 text-[var(--sf-text-muted)]">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No schedule set</p>
              <button className="mt-4 text-blue-500 hover:text-[var(--sf-blue-500)] font-medium">
                Set Schedule
              </button>
            </div>
          </div>

          {/* Quote Options Section */}
          <div className="bg-white rounded-lg shadow-sm border border-[var(--sf-border-light)] p-6">
            <h2 className="text-lg font-semibold text-[var(--sf-text-primary)] mb-4">Quote Options</h2>
            <div className="text-center py-12 text-[var(--sf-text-muted)]">
              <Receipt className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No quote options configured</p>
              <button className="mt-4 text-blue-500 hover:text-[var(--sf-blue-500)] font-medium">
                Configure Options
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default ServiceFlowEstimatePage;