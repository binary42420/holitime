'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { Users, Clock, Shield, Award, TrendingUp, MapPin } from 'lucide-react'

const stats = [
  {
    icon: Users,
    number: '10,000+',
    label: 'People We Place Each Year',
    description: 'Good workers finding good jobs'
  },
  {
    icon: Clock,
    number: '2 Hours',
    label: 'We Call You Back',
    description: 'Usually faster, but we promise 2 hours'
  },
  {
    icon: Shield,
    number: '100%',
    label: 'Covered & Legal',
    description: 'Insurance, taxes, all that boring stuff handled'
  },
  {
    icon: Award,
    number: '35+',
    label: 'Years in Business',
    description: 'Started in 1990, still going strong'
  },
  {
    icon: TrendingUp,
    number: '98%',
    label: 'Happy Customers',
    description: 'Most folks come back when they need help again'
  },
  {
    icon: MapPin,
    number: '24/7',
    label: 'Always Available',
    description: 'Emergencies don\'t wait for business hours'
  }
]

export default function StatsSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="py-16 lg:py-24 bg-white">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">
            We Know What We're Doing
          </h2>
          <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
            After 35+ years in business, we've learned a thing or two about finding good people for tough jobs.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              className="text-center group"
            >
              <div className="bg-primary-50 rounded-2xl p-8 hover:bg-primary-100 transition-colors duration-300">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-xl mb-6 group-hover:scale-110 transition-transform duration-300">
                  <stat.icon className="h-8 w-8 text-white" />
                </div>
                
                <div className="text-4xl md:text-5xl font-bold text-secondary-900 mb-2">
                  {stat.number}
                </div>
                
                <h3 className="text-lg font-semibold text-secondary-900 mb-2">
                  {stat.label}
                </h3>
                
                <p className="text-secondary-600">
                  {stat.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Additional Trust Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-16 bg-secondary-50 rounded-2xl p-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <h4 className="text-lg font-semibold text-secondary-900 mb-2">Licensed & Certified</h4>
              <p className="text-secondary-600">
                Fully licensed staffing agency with all required certifications and compliance standards.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-secondary-900 mb-2">Safety First</h4>
              <p className="text-secondary-600">
                OSHA-compliant workers with industry-specific safety training and equipment.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-secondary-900 mb-2">Local Expertise</h4>
              <p className="text-secondary-600">
                Deep understanding of San Diego's business community and workforce needs.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
