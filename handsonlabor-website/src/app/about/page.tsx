import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Shield, Award, Users, Clock, MapPin, Phone } from 'lucide-react'
import { Button } from '@mantine/core'

export const metadata: Metadata = {
  title: 'About Hands On Labor | San Diego Staffing Agency Since 1990',
  description: 'Learn about Hands On Labor, San Diego\'s trusted staffing agency since 1990. Our story, values, and commitment to connecting businesses with reliable workers.',
  keywords: 'Hands On Labor history, San Diego staffing agency, about us, company story, staffing experience',
}

const milestones = [
  {
    year: '1990',
    title: 'Company Founded',
    description: 'Started as a small local staffing agency focused on serving San Diego businesses.'
  },
  {
    year: '1995',
    title: 'Entertainment Specialization',
    description: 'Began specializing in entertainment industry staffing for concerts and events.'
  },
  {
    year: '2000',
    title: 'Expanded Services',
    description: 'Added construction and warehouse staffing to serve diverse business needs.'
  },
  {
    year: '2010',
    title: 'Technology Integration',
    description: 'Implemented modern systems for faster placement and better service.'
  },
  {
    year: '2020',
    title: 'Continued Growth',
    description: 'Adapted to changing workforce needs while maintaining our core values.'
  },
  {
    year: '2024',
    title: '35+ Years Strong',
    description: 'Celebrating over three decades of reliable staffing solutions.'
  }
]

const values = [
  {
    icon: Shield,
    title: 'Reliability',
    description: 'We show up when we say we will, with the workers you need to get the job done.'
  },
  {
    icon: Users,
    title: 'People First',
    description: 'Both our clients and workers are treated with respect, fairness, and professionalism.'
  },
  {
    icon: Award,
    title: 'Quality',
    description: 'We maintain high standards in everything we do, from worker screening to customer service.'
  },
  {
    icon: Clock,
    title: 'Responsiveness',
    description: 'Quick response times and flexible solutions for your changing business needs.'
  }
]

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-24 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-secondary-900/90 via-secondary-900/70 to-secondary-900/90 z-10" />
          <Image
            src="https://img1.wsimg.com/isteam/ip/c5ad71c6-23e4-46f8-b587-2a12fbde04f5/blob-84b7fd6.png"
            alt="Hands On Labor team and workers"
            fill
            className="object-cover"
            priority
          />
        </div>
        
        <div className="relative z-20 container-custom">
          <div className="max-w-4xl">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              We've Been Around
              <span className="block text-gradient bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
                Since 1990
              </span>
            </h1>

            <p className="text-xl text-secondary-200 mb-8 max-w-3xl leading-relaxed">
              That's over 35 years of helping San Diego businesses find good workers.
              From concert venues to construction sites, we know people who know how to work.
            </p>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-6">
                How We Got Started
              </h2>
              <div className="space-y-4 text-secondary-600 leading-relaxed">
                <p>
                  Back in 1990, we started this company with a pretty simple idea: help San Diego
                  businesses find good workers when they need them. What started as a small operation
                  has grown into something we're pretty proud of.
                </p>
                <p>
                  We got really good at working with the entertainment industry - concert venues,
                  festivals, event companies. Turns out, when you need a crew to load in a stage
                  at 6 AM and everything has to be perfect by showtime, you want people who've done it before.
                </p>
                <p>
                  These days we help all kinds of businesses, but we still keep that same approach:
                  know your people, know your clients, and don't promise what you can't deliver.
                </p>
              </div>
            </div>
            
            <div className="relative">
              <Image
                src="https://img1.wsimg.com/isteam/ip/c5ad71c6-23e4-46f8-b587-2a12fbde04f5/PETER%20SHOOT%204-23-19.jpg"
                alt="Hands On Labor crew at work"
                width={600}
                height={400}
                className="rounded-2xl shadow-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="section-padding bg-secondary-50">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">
              Our Journey
            </h2>
            <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
              Key milestones in our 35+ year history of serving San Diego businesses.
            </p>
          </div>

          <div className="relative">
            <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-primary-200"></div>
            
            <div className="space-y-12">
              {milestones.map((milestone, index) => (
                <div key={milestone.year} className={`flex items-center ${
                  index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'
                }`}>
                  <div className={`w-1/2 ${index % 2 === 0 ? 'pr-8 text-right' : 'pl-8'}`}>
                    <div className="bg-white rounded-xl p-6 shadow-sm">
                      <div className="text-2xl font-bold text-primary-600 mb-2">
                        {milestone.year}
                      </div>
                      <h3 className="text-lg font-semibold text-secondary-900 mb-2">
                        {milestone.title}
                      </h3>
                      <p className="text-secondary-600">
                        {milestone.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="relative z-10 w-4 h-4 bg-primary-600 rounded-full border-4 border-white shadow-lg"></div>
                  
                  <div className="w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">
              Our Values
            </h2>
            <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
              The principles that guide everything we do and have made us San Diego's 
              most trusted staffing partner.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div key={value.title} className="text-center">
                <div className="w-16 h-16 bg-primary-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                  <value.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-secondary-900 mb-4">
                  {value.title}
                </h3>
                <p className="text-secondary-600">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="section-padding bg-primary-600">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              By the Numbers
            </h2>
            <p className="text-xl text-primary-100 max-w-3xl mx-auto">
              Our track record speaks for itself.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">35+</div>
              <div className="text-primary-200">Years in Business</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">10K+</div>
              <div className="text-primary-200">Workers Placed Annually</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">500+</div>
              <div className="text-primary-200">Happy Clients</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">98%</div>
              <div className="text-primary-200">Client Satisfaction</div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="section-padding bg-secondary-50">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">
              Ready to Work Together?
            </h2>
            <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
              Experience the difference that 35+ years of expertise makes. 
              Contact us today to discuss your staffing needs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Phone className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-secondary-900 mb-2">Call Us</h3>
              <a href="tel:619-299-5991" className="text-primary-600 hover:text-primary-700">
                (619) 299-5991
              </a>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-secondary-900 mb-2">Location</h3>
              <p className="text-secondary-600">San Diego, California</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-secondary-900 mb-2">Availability</h3>
              <p className="text-secondary-600">24/7 Emergency Staffing</p>
            </div>
          </div>

          <div className="text-center">
            <Link href="/request-staff">
              <Button size="lg" className="mr-4">
                Request Staff
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" size="lg">
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
