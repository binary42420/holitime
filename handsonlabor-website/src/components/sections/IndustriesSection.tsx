'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Music, HardHat, Package, Users, ArrowRight } from 'lucide-react'

const industries = [
  {
    icon: Music,
    title: 'Entertainment & Events',
    description: 'Concert venues, festivals, corporate events, and special productions',
    services: ['Load-in/Load-out crews', 'Stage hands', 'Equipment movers', 'Event setup/breakdown'],
    image: 'https://img1.wsimg.com/isteam/ip/c5ad71c6-23e4-46f8-b587-2a12fbde04f5/blob-66b96a8.png',
    href: '/industries/entertainment',
    featured: true
  },
  {
    icon: HardHat,
    title: 'Construction',
    description: 'Residential, commercial, and infrastructure construction projects',
    services: ['General laborers', 'Flaggers', 'Cleanup crews', 'Equipment operators'],
    image: 'https://img1.wsimg.com/isteam/ip/c5ad71c6-23e4-46f8-b587-2a12fbde04f5/blob-ddf6564.png',
    href: '/industries/construction'
  },
  {
    icon: Package,
    title: 'Warehouse & Logistics',
    description: 'Distribution centers, shipping facilities, and inventory management',
    services: ['Forklift operators', 'Shipping/receiving', 'Inventory clerks', 'Order pickers'],
    image: 'https://img1.wsimg.com/isteam/ip/c5ad71c6-23e4-46f8-b587-2a12fbde04f5/PETER%20SHOOT%204-23-19.jpg',
    href: '/industries/warehouse'
  },
  {
    icon: Users,
    title: 'General Labor',
    description: 'Flexible workforce solutions for various business needs',
    services: ['Day laborers', 'Maintenance crews', 'Cleaning staff', 'Administrative support'],
    image: 'https://img1.wsimg.com/isteam/ip/c5ad71c6-23e4-46f8-b587-2a12fbde04f5/blob-84b7fd6.png',
    href: '/industries/general'
  }
]

export default function IndustriesSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

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
            Industries We Serve
          </h2>
          <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
            From entertainment venues to construction sites, we provide specialized workforce solutions 
            across San Diego's diverse business landscape.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {industries.map((industry, index) => (
            <motion.div
              key={industry.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              className={`group relative overflow-hidden rounded-2xl ${
                industry.featured ? 'lg:col-span-2' : ''
              }`}
            >
              <Link href={industry.href} className="block">
                <div className="relative h-80 lg:h-96">
                  <Image
                    src={industry.image}
                    alt={industry.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-secondary-900/90 via-secondary-900/50 to-transparent" />
                  
                  <div className="absolute inset-0 p-8 flex flex-col justify-end">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center">
                        <industry.icon className="h-6 w-6 text-white" />
                      </div>
                      {industry.featured && (
                        <span className="bg-accent-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                          Our Specialty
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
                      {industry.title}
                    </h3>
                    
                    <p className="text-secondary-200 mb-4 max-w-2xl">
                      {industry.description}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-2 mb-6">
                      {industry.services.map((service, serviceIndex) => (
                        <div key={serviceIndex} className="flex items-center text-sm text-secondary-300">
                          <div className="w-1.5 h-1.5 bg-primary-400 rounded-full mr-2" />
                          {service}
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex items-center text-primary-400 font-semibold group-hover:translate-x-2 transition-transform">
                      Learn more about {industry.title.toLowerCase()}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Additional Industries */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-16 text-center"
        >
          <div className="bg-secondary-50 rounded-2xl p-8">
            <h3 className="text-xl font-semibold text-secondary-900 mb-4">
              Don't See Your Industry?
            </h3>
            <p className="text-secondary-600 mb-6 max-w-2xl mx-auto">
              We work with businesses across many industries. Our flexible staffing solutions 
              can be customized to meet your specific workforce needs.
            </p>
            <Link 
              href="/contact"
              className="inline-flex items-center text-primary-600 font-semibold hover:text-primary-700 transition-colors"
            >
              Contact us to discuss your needs
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
