'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import Link from 'next/link'
import { Clock, Users, Briefcase, CreditCard, ArrowRight } from 'lucide-react'
import { Button } from '@mantine/core'

const services = [
  {
    icon: Clock,
    title: 'Need People Today?',
    description: 'Got a project starting tomorrow? Equipment showing up Monday? We can usually get you workers same-day.',
    features: ['Same-day placement', 'Already background checked', 'Show up ready to work', 'Any skill level'],
    href: '/services/temporary',
    color: 'primary'
  },
  {
    icon: Users,
    title: 'Try Before You Hire',
    description: 'Not sure if someone\'s a good fit? Let them work temp first. If you like them, keep them. No pressure.',
    features: ['Test them out first', 'Less hiring risk', 'See how they work', 'Make sure they fit in'],
    href: '/services/temp-to-hire',
    color: 'accent'
  },
  {
    icon: Briefcase,
    title: 'Emergency Help',
    description: 'Someone called in sick? Equipment broke down? We\'re available 24/7 for those "oh crap" moments.',
    features: ['Call anytime', 'Emergency response', 'Get people fast', 'Experienced workers'],
    href: '/services/on-demand',
    color: 'secondary'
  },
  {
    icon: CreditCard,
    title: 'We Handle the Paperwork',
    description: 'Taxes, insurance, workers comp - all that headache stuff. You just tell us who worked and we handle the rest.',
    features: ['Tax stuff handled', 'Workers comp included', 'Payroll done for you', 'Less paperwork for you'],
    href: '/services/payroll',
    color: 'primary'
  }
]

export default function ServicesOverview() {
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
            How We Can Help
          </h2>
          <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
            Whether you need someone for a day or looking to hire full-time,
            we've got different ways to get you the help you need.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {services.map((service, index) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 group"
            >
              <div className="flex items-start space-x-4">
                <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                  service.color === 'primary' ? 'bg-primary-100' :
                  service.color === 'accent' ? 'bg-accent-100' :
                  'bg-secondary-100'
                }`}>
                  <service.icon className={`h-6 w-6 ${
                    service.color === 'primary' ? 'text-primary-600' :
                    service.color === 'accent' ? 'text-accent-600' :
                    'text-secondary-600'
                  }`} />
                </div>
                
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-secondary-900 mb-3">
                    {service.title}
                  </h3>
                  <p className="text-secondary-600 mb-4">
                    {service.description}
                  </p>
                  
                  <ul className="space-y-2 mb-6">
                    {service.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center text-sm text-secondary-600">
                        <div className={`w-1.5 h-1.5 rounded-full mr-3 ${
                          service.color === 'primary' ? 'bg-primary-500' :
                          service.color === 'accent' ? 'bg-accent-500' :
                          'bg-secondary-500'
                        }`} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  <Link 
                    href={service.href}
                    className={`inline-flex items-center text-sm font-semibold group-hover:translate-x-1 transition-transform ${
                      service.color === 'primary' ? 'text-primary-600 hover:text-primary-700' :
                      service.color === 'accent' ? 'text-accent-600 hover:text-accent-700' :
                      'text-secondary-600 hover:text-secondary-700'
                    }`}
                  >
                    Learn more
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-center bg-primary-600 rounded-2xl p-8 md:p-12"
        >
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Need People Right Now?
          </h3>
          <p className="text-primary-100 text-lg mb-8 max-w-2xl mx-auto">
            Don't stress - we've got this. Give us a call and we'll figure out
            how to get you the help you need.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/request-staff">
              <Button variant="secondary" size="lg" className="bg-white text-primary-600 hover:bg-primary-50">
                Request Staff Now
              </Button>
            </Link>
            <a href="tel:619-299-5991">
              <Button variant="ghost" size="lg" className="text-white border-white hover:bg-white/10">
                Call (619) 299-5991
              </Button>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
