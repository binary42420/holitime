'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import Link from 'next/link'
import { Phone, MessageSquare, Clock, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CTASection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="section-padding bg-secondary-900 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="container-custom relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Need Workers?
            <span className="block text-gradient bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
              Let's Talk
            </span>
          </h2>
          <p className="text-xl text-secondary-300 max-w-3xl mx-auto">
            Hundreds of San Diego businesses call us when they need good people.
            Give us a try - what's the worst that could happen?
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {/* Phone CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-center"
          >
            <div className="bg-primary-600 rounded-2xl p-8 h-full">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Phone className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Just Call Us</h3>
              <p className="text-primary-100 mb-6">
                Talk to a real person who can actually help. We answer 24/7 for emergencies.
              </p>
              <a href="tel:619-299-5991">
                <Button variant="secondary" className="w-full bg-white text-primary-600 hover:bg-primary-50">
                  (619) 299-5991
                </Button>
              </a>
            </div>
          </motion.div>

          {/* Request Staff CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-center"
          >
            <div className="bg-accent-600 rounded-2xl p-8 h-full">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Tell Us What You Need</h3>
              <p className="text-accent-100 mb-6">
                Fill out our form and we'll get back to you fast with a plan that works.
              </p>
              <Link href="/request-staff">
                <Button variant="secondary" className="w-full bg-white text-accent-600 hover:bg-accent-50">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Emergency CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-center"
          >
            <div className="bg-secondary-700 border border-secondary-600 rounded-2xl p-8 h-full">
              <div className="w-16 h-16 bg-red-500/20 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Clock className="h-8 w-8 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Oh Crap Moments</h3>
              <p className="text-secondary-300 mb-6">
                Crew didn't show? Equipment broke? Call us. We've seen it all before.
              </p>
              <a href="tel:619-299-5991">
                <Button variant="accent" className="w-full bg-red-600 hover:bg-red-700">
                  Emergency Line
                </Button>
              </a>
            </div>
          </motion.div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="text-center"
        >
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 md:p-12">
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Need a Job?
            </h3>
            <p className="text-secondary-300 text-lg mb-8 max-w-2xl mx-auto">
              We've got work. Good pay, flexible hours, and you get to work with
              different companies around San Diego.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/client-portal">
                <Button size="lg" className="bg-primary-600 hover:bg-primary-700">
                  Client Portal
                </Button>
              </Link>
              <Link href="/apply">
                <Button variant="secondary" size="lg" className="bg-white/10 border-white text-white hover:bg-white/20">
                  Apply Now
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, delay: 1.0 }}
          className="mt-16 flex flex-wrap justify-center items-center gap-8 text-secondary-400"
        >
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-sm">Licensed & Insured</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-sm">BBB Accredited</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-sm">OSHA Compliant</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-sm">35+ Years Experience</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
