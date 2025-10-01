export default function FeaturesGrid() {
  const features = [
    {
      category: "Service Modifiers",
      title: "Price services dynamically.",
      description:
        "Provide customers with upfront, accurate pricing for services and extras. Serviceflow lets you add custom questions to the booking flow, which affect the price estimate presented to customers.",
      image: "/images/dynamic-pricing-2-good.avif",
      bgColor: "bg-green-50",
    },
    {
      category: "Intake Questions",
      title: "Capture job details up front.",
      description: "Add checkboxes, dropdowns, text fields—or even image uploads—to collect the info you need.",
      image: "/images/credit-card-capture-4-minimal.svg",
      bgColor: "bg-green-50",
    },
    {
      category: "Recurring Bookings",
      title: "Lock in repeat business.",
      description:
        "Let customers book recurring service plans right from the start—weekly, bi-weekly, monthly, or any frequency you define. You can even offer discounts for specific plans to encourage repeat business.",
      image: "/images/intake-questions.svg.svg",
      bgColor: "bg-green-50",
    },
    {
      category: "Credit Card Capture",
      title: "Collect payment details at checkout.",
      description:
        "Integrate secure payment processing by connecting your Stripe account. Collect and securely store customer payment details for payments.",
      image: "/images/sms-customer-notifications.svg",
      bgColor: "bg-green-50",
    },
    {
      category: "SMS & Email Notifications",
      title: "Automatic appointment notifications and reminders.",
      description:
        "Make a professional impression with automated email and text message notifications. Customize the notifications with your choice of text, language and colors to make it match your brand.",
      image: "/images/recurring-invoices.avif",
      bgColor: "bg-green-50",
    },
    {
      category: "Feedback & Reviews",
      title: "Collect feedback and reviews.",
      description:
        "Send automatic follow-ups after jobs to gather feedback and ask satisfied customers to review your business on popular platforms.",
      image: "/images/feedback-and-reviews-6.svg",
      bgColor: "bg-green-50",
    },
  ]

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <div key={index} className={`${feature.bgColor} rounded-3xl p-8 space-y-6`}>
              <div className="space-y-4">
                <span className="text-xs font-bold text-green-600 uppercase tracking-wide">{feature.category}</span>
                <h3 className="text-2xl font-bold text-gray-900">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>

              <div className="relative">
                <img
                  src={feature.image || "/placeholder.svg"}
                  alt={feature.title}
                  className="w-full h-auto rounded-xl shadow-sm"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
