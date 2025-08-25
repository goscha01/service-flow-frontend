export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <img src="/placeholder.svg?height=40&width=160" alt="Zenbooker" className="h-10 w-auto" />
            <p className="text-gray-600 text-sm">Online scheduling software for home service providers.</p>
            <div className="flex space-x-4">
              <a href="https://twitter.com/ZenbookerApp" className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.29 18.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0020 3.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.073 4.073 0 01.8 7.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 010 16.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a href="https://www.facebook.com/ZenbookerApp/" className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M20 10C20 4.477 15.523 0 10 0S0 4.477 0 10c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V10h2.54V7.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V10h2.773l-.443 2.89h-2.33v6.988C16.343 19.128 20 14.991 20 10z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
              <a href="https://www.youtube.com/@Zenbooker" className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Features</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/features" className="text-gray-600 hover:text-gray-900">
                  Overview
                </a>
              </li>
              <li>
                <a href="/online-booking-software" className="text-gray-600 hover:text-gray-900">
                  Online Booking
                </a>
              </li>
              <li>
                <a href="/service-request-software" className="text-gray-600 hover:text-gray-900">
                  Service Requests
                </a>
              </li>
              <li>
                <a href="/bookable-estimates" className="text-gray-600 hover:text-gray-900">
                  Bookable Estimates
                </a>
              </li>
              <li>
                <a href="/invoicing" className="text-gray-600 hover:text-gray-900">
                  Invoicing
                </a>
              </li>
              <li>
                <a href="/crm" className="text-gray-600 hover:text-gray-900">
                  Customer Manager (CRM)
                </a>
              </li>
              <li>
                <a href="/service-territories" className="text-gray-600 hover:text-gray-900">
                  Territories (Multi-Location)
                </a>
              </li>
            </ul>
          </div>

          {/* Industries */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Industries</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/mobile-auto-detailing-software" className="text-gray-600 hover:text-gray-900">
                  Auto Detailing
                </a>
              </li>
              <li>
                <a href="/appliance-repair-scheduling-software" className="text-gray-600 hover:text-gray-900">
                  Appliance Repair
                </a>
              </li>
              <li>
                <a href="/junk-removal-software" className="text-gray-600 hover:text-gray-900">
                  Junk Removal
                </a>
              </li>
              <li>
                <a href="/residential-cleaning-online-booking.html" className="text-gray-600 hover:text-gray-900">
                  Home Cleaning
                </a>
              </li>
              <li>
                <a href="/hvac-scheduling-software" className="text-gray-600 hover:text-gray-900">
                  HVAC
                </a>
              </li>
              <li>
                <a href="/carpet-cleaning-scheduling-software" className="text-gray-600 hover:text-gray-900">
                  Carpet Cleaning
                </a>
              </li>
              <li>
                <a href="/phone-repair-scheduling-software" className="text-gray-600 hover:text-gray-900">
                  Mobile Phone Repair
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/change-log" className="text-gray-600 hover:text-gray-900">
                  What's New ✨
                </a>
              </li>
              <li>
                <a href="/service-templates" className="text-gray-600 hover:text-gray-900">
                  Service Templates
                </a>
              </li>
              <li>
                <a href="https://help.zenbooker.com/en/" className="text-gray-600 hover:text-gray-900">
                  Help Center
                </a>
              </li>
              <li>
                <a href="https://developers.zenbooker.com/" className="text-gray-600 hover:text-gray-900">
                  API & Developers
                </a>
              </li>
              <li>
                <a href="/housecall-pro-alternative" className="text-gray-600 hover:text-gray-900">
                  Compare to Housecall Pro
                </a>
              </li>
              <li>
                <a href="/affiliates" className="text-gray-600 hover:text-gray-900">
                  Affiliates
                </a>
              </li>
              <li>
                <a href="/contact" className="text-gray-600 hover:text-gray-900">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex space-x-6 text-sm text-gray-600">
              <a href="/privacy" className="hover:text-gray-900">
                Privacy
              </a>
              <a href="/terms" className="hover:text-gray-900">
                Terms
              </a>
            </div>
            <div className="mt-4 md:mt-0 text-sm text-gray-600">© 2025 Zenbooker.</div>
          </div>
        </div>
      </div>
    </footer>
  )
}
