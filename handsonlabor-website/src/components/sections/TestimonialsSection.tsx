'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react'

const testimonials = [
  {
    id: 1,
    name: 'Sarah Martinez',
    title: 'Production Manager',
    company: 'San Diego Convention Center',
    content: 'Hands On Labor has been our go-to staffing partner for major events. Their crews are professional, reliable, and understand the fast-paced nature of event production. They\'ve never let us down.',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 2,
    name: 'Mike Thompson',
    title: 'Construction Foreman',
    company: 'Pacific Coast Builders',
    content: 'We\'ve used several staffing agencies over the years, but Hands On Labor consistently provides the most reliable workers. Their people show up on time, work hard, and know what they\'re doing.',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 3,
    name: 'Jennifer Chen',
    title: 'Event Coordinator',
    company: 'Sunset Events',
    content: 'The team at Hands On Labor understands the entertainment industry. When we need crew for load-ins or event setup, they provide workers who are familiar with the equipment and safety requirements.',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 4,
    name: 'David Rodriguez',
    title: 'Warehouse Manager',
    company: 'San Diego Logistics',
    content: 'Their forklift operators are certified and experienced. We can count on Hands On Labor to provide skilled workers who can jump right in and be productive from day one.',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 5,
    name: 'Lisa Park',
    title: 'Operations Director',
    company: 'Balboa Theatre',
    content: 'For over 10 years, Hands On Labor has provided exceptional stage crew for our productions. They understand the technical requirements and work seamlessly with our permanent staff.',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80'
  }
]

export default function TestimonialsSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [currentIndex, setCurrentIndex] = useState(0)

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length)
  }

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }

  const currentTestimonial = testimonials[currentIndex]

  return (
    <section ref={ref} className="section-padding bg-white">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">
            What Our Clients Say
          </h2>
          <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
            Don't just take our word for it. Here's what San Diego businesses say about 
            working with Hands On Labor.
          </p>
        </motion.div>

        {/* Featured Testimonial */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-4xl mx-auto mb-16"
        >
          <div className="bg-primary-600 rounded-2xl p-8 md:p-12 text-center relative overflow-hidden">
            <div className="absolute top-4 left-4 opacity-20">
              <Quote className="h-16 w-16 text-white" />
            </div>
            
            <div className="relative z-10">
              <div className="flex justify-center mb-6">
                {[...Array(currentTestimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-6 w-6 text-accent-400 fill-current" />
                ))}
              </div>
              
              <blockquote className="text-xl md:text-2xl text-white mb-8 leading-relaxed">
                "{currentTestimonial.content}"
              </blockquote>
              
              <div className="flex items-center justify-center space-x-4">
                <img
                  src={currentTestimonial.image}
                  alt={currentTestimonial.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div className="text-left">
                  <div className="font-semibold text-white">{currentTestimonial.name}</div>
                  <div className="text-primary-200">{currentTestimonial.title}</div>
                  <div className="text-primary-300 text-sm">{currentTestimonial.company}</div>
                </div>
              </div>
            </div>
            
            {/* Navigation */}
            <div className="flex justify-center items-center space-x-4 mt-8">
              <button
                onClick={prevTestimonial}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-white" />
              </button>
              
              <div className="flex space-x-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentIndex ? 'bg-white' : 'bg-white/40'
                    }`}
                  />
                ))}
              </div>
              
              <button
                onClick={nextTestimonial}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <ChevronRight className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Testimonial Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.slice(0, 3).map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.8, delay: 0.4 + (index * 0.1) }}
              className="bg-secondary-50 rounded-xl p-6"
            >
              <div className="flex mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 text-accent-500 fill-current" />
                ))}
              </div>
              
              <blockquote className="text-secondary-700 mb-4 text-sm leading-relaxed">
                "{testimonial.content}"
              </blockquote>
              
              <div className="flex items-center space-x-3">
                <img
                  src={testimonial.image}
                  alt={testimonial.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <div className="font-semibold text-secondary-900 text-sm">{testimonial.name}</div>
                  <div className="text-secondary-600 text-xs">{testimonial.company}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-16 text-center"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="text-2xl font-bold text-primary-600 mb-1">4.9/5</div>
              <div className="text-secondary-600 text-sm">Average Rating</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary-600 mb-1">500+</div>
              <div className="text-secondary-600 text-sm">Client Reviews</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary-600 mb-1">98%</div>
              <div className="text-secondary-600 text-sm">Would Recommend</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary-600 mb-1">35+</div>
              <div className="text-secondary-600 text-sm">Years Trusted</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
