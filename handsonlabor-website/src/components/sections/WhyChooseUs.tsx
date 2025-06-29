'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Shield, Clock, Users, Award, Phone, MapPin } from 'lucide-react'

const features = [
  {
    icon: Shield,
    title: 'We\'re Legit',
    description: 'Licensed, insured, bonded - all that legal stuff is covered so you don\'t have to worry about it.'
  },
  {
    icon: Clock,
    title: 'We Answer the Phone',
    description: 'Call us at 2 AM because your crew didn\'t show? We\'ll answer. Emergencies happen, we get it.'
  },
  {
    icon: Users,
    title: 'Good People',
    description: 'We actually check people out before sending them to you. Background checks, references, the works.'
  },
  {
    icon: Award,
    title: 'Been Around Forever',
    description: 'Started in 1990. We\'ve seen it all and we\'re still here. That\'s gotta count for something.'
  },
  {
    icon: Phone,
    title: 'We Call Back Fast',
    description: 'Usually within an hour, but we promise 2 hours max. None of this "we\'ll get back to you" nonsense.'
  },
  {
    icon: MapPin,
    title: 'We Know San Diego',
    description: 'Local company, local workers, local knowledge. We know the venues, the sites, the people.'
  }
]

const benefits = [
  'Real employees (W-2, not contractors)',
  'Workers comp is covered',
  'We handle all the tax stuff',
  'No contracts to lock you in',
  'Work with your schedule',
  'If someone doesn\'t work out, we\'ll replace them',
  'Safety training included',
  'Local San Diego company'
]

export default function WhyChooseUs() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="section-padding bg-secondary-50">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">
            Why Work With Us?
          </h2>
          <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
            Look, there are lots of staffing companies out there. Here's what makes us different
            and why San Diego businesses keep calling us back.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Features Grid */}
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  className="text-center md:text-left"
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-600 rounded-xl mb-4">
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-secondary-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-secondary-600 text-sm">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Benefits List */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="bg-white rounded-2xl p-8 shadow-sm"
          >
            <h3 className="text-2xl font-bold text-secondary-900 mb-6">
              What's Included (No Extra Charges)
            </h3>
            
            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={benefit}
                  initial={{ opacity: 0, x: 20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
                  transition={{ duration: 0.6, delay: 0.6 + (index * 0.05) }}
                  className="flex items-center space-x-3"
                >
                  <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0" />
                  <span className="text-secondary-700">{benefit}</span>
                </motion.div>
              ))}
            </div>

            <div className="mt-8 p-6 bg-primary-50 rounded-xl">
              <h4 className="font-semibold text-secondary-900 mb-2">
                Here's the Thing
              </h4>
              <p className="text-secondary-600 text-sm">
                We're not trying to be the biggest staffing company. We just want to be
                the one you call when you need good people who show up and do the work right.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          <div className="text-center">
            <div className="text-3xl font-bold text-primary-600 mb-2">500+</div>
            <div className="text-secondary-600">Satisfied Clients</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary-600 mb-2">98%</div>
            <div className="text-secondary-600">Client Retention Rate</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary-600 mb-2">A+</div>
            <div className="text-secondary-600">BBB Rating</div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
