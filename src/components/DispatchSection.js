export default function DispatchSection() {
  return (
    <section className="py-20 bg-[var(--sf-bg-page)]">
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
              <h2 className="text-3xl lg:text-4xl font-bold text-[var(--sf-text-primary)]">Schedule and dispatch with ease.</h2>
              <p className="text-xl text-[var(--sf-text-secondary)] leading-relaxed">
                Assign new jobs to teams with just a click. Add your employees to your account to quickly see their work
                schedules, and dispatch new jobs as they come in.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-[var(--sf-text-primary)] mb-2">Auto-assign new bookings</h3>
                <p className="text-[var(--sf-text-secondary)]">
                  Let Serviceflow automatically assign new jobs to available and qualified techs.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-[var(--sf-text-primary)] mb-2">Skill tags</h3>
                <p className="text-[var(--sf-text-secondary)]">Match the right service tech to the job by adding skill requirements.</p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-[var(--sf-text-primary)] mb-2">Job offers</h3>
                <p className="text-[var(--sf-text-secondary)]">
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
