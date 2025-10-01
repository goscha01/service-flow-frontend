export default function CRMSection() {
  return (
    <section className="py-20 bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h2 className="text-3xl lg:text-4xl font-bold text-white">Keep track of every customer.</h2>
              <p className="text-lg text-gray-300 leading-relaxed">
                Serviceflow automatically creates a profile for each of your customers. That means you can easily pull up
                past and upcoming jobs, unpaid invoices, and notes for any of your customers.
                <br />
                <br />
                And since everything is saved, Serviceflow automatically adds important details to new jobs when repeat
                customers call up to book again.
              </p>
            </div>
          </div>

          {/* Right Column - CRM Interface */}
          <div className="relative">
            <img
              src="/images/crm.webp"
              alt="Customer relationship management interface"
              className="w-full h-auto rounded-2xl shadow-xl"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
