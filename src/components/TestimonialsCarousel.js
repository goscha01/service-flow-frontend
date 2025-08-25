"use client"

import { useState } from "react"

export default function TestimonialsCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0)

  const testimonials = [
    {
      id: 1,
      company: "Balcony Cleaners",
      logo: "/images/balcony-cleaners-logo-testimonial.avif",
      quote:
        "We've tried a lot of scheduling tools over the years, but Zenbooker is hands down the best. It's helped us manage a fast-growing team of workers with ease, and the zones feature has been a game-changer in allowing us to expand into new markets.",
      author: "Matty",
      website: "https://balconycleaners.com/",
      image: "/images/balcony-cleaners-headshot-transp2.avif",
    },
    {
      id: 2,
      company: "The Mounting Man",
      logo: "/images/mounting-man-logo-testimonial.avif",
      quote:
        "After trying 15 different platforms over 4 years, Zenbooker became my perfect solution. It allows my contractors across the country to receive immediate job notifications based on their specific skillsets, while clients can see exact pricing based on their selected options.",
      author: "Marshall Wayne",
      website: "https://www.themountingman.tv/",
      image: "/images/mounting-man-headshot2.avif",
    },
    {
      id: 3,
      company: "Carole's House Cleaning",
      logo: "/images/caroles-housecleaning-logo-testimonial.avif",
      quote:
        "Zenbooker has completely changed the way we book services online. It's incredibly easy to use, fast, and super convenient.",
      author: "Shanti",
      website: "https://www.housecleaningbycarole.com/",
      image: "/images/caroles-house-cleaning-2.avif",
    },
  ]

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % testimonials.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }

  return (
    <section className="py-20 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative">
          {/* Navigation Buttons */}
          <button
            onClick={prevSlide}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={nextSlide}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Carousel Container */}
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {testimonials.map((testimonial) => (
                <div key={testimonial.id} className="w-full flex-shrink-0">
                  <div className="bg-orange-50 rounded-3xl p-8 lg:p-12 mx-4">
                    <div className="grid lg:grid-cols-2 gap-8 items-center">
                      {/* Content */}
                      <div className="space-y-6">
                        <img
                          src={testimonial.logo || "/images/placeholder.svg"}
                          alt={`${testimonial.company} Logo`}
                          className="h-8 w-auto"
                        />

                        <blockquote className="text-xl lg:text-2xl text-orange-900 leading-relaxed">
                          "{testimonial.quote}"
                        </blockquote>

                        <div className="space-y-2">
                          <div className="text-xl font-medium text-orange-900">{testimonial.author}</div>
                          <a
                            href={testimonial.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-orange-700 hover:text-orange-800 font-medium"
                          >
                            {testimonial.company}
                          </a>
                        </div>
                      </div>

                      {/* Image */}
                      <div className="relative">
                        <img
                          src={testimonial.image || "/images/placeholder.svg"}
                          alt={testimonial.author}
                          className="w-full h-64 lg:h-80 object-contain rounded-2xl"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
