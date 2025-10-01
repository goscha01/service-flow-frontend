export default function DispatchSection() {
  return (
    <section className="py-20 bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Column - Video/Demo */}
          <div className="relative bg-white rounded-3xl overflow-hidden shadow-xl">
            <div className="aspect-video">
             <video
  src="/images/team-requirements-simple-demo.mp4"
  className="w-full h-full object-cover"
  autoPlay
  muted
  loop
  playsInline
/>

            </div>
          </div>

          {/* Right Column - Content */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">Schedule and dispatch with ease.</h2>
              <p className="text-xl text-gray-600 leading-relaxed">
                Assign new jobs to teams with just a click. Add your employees to your account to quickly see their work
                schedules, and dispatch new jobs as they come in.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Auto-assign new bookings</h3>
                <p className="text-gray-600">
                  Let Serviceflow automatically assign new jobs to available and qualified techs.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Skill tags</h3>
                <p className="text-gray-600">Match the right service tech to the job by adding skill requirements.</p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Job offers</h3>
                <p className="text-gray-600">
                  Automatically offer new jobs to your available field techs and let them claim the jobs that work best
                  for their schedule.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
