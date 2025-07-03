import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Music, Users, Clock, Shield, CheckCircle, ArrowRight, Phone } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export const metadata: Metadata = {
  title: 'Entertainment & Events Staffing | Hands On Labor',
  description: 'Professional stage crews, load-in/load-out teams, and event staffing for concerts, festivals, and special events in San Diego. Experienced entertainment industry workers.',
  keywords: 'San Diego event staffing, concert crew, stage hands, load-in crew, entertainment staffing, festival workers',
}

const services = [
  {
    title: 'Load-In/Load-Out Crews',
    description: 'Experienced teams for efficient equipment setup and breakdown',
    features: ['Equipment handling', 'Time-sensitive operations', 'Safety protocols', 'Team coordination']
  },
  {
    title: 'Stage Hands & General Crew',
    description: 'Reliable workers familiar with venue operations and event requirements',
    features: ['Stage setup/breakdown', 'Equipment moving', 'Venue preparation', 'General labor']
  },
  {
    title: 'Equipment Movers',
    description: 'Skilled workers for safe handling of expensive audio/visual equipment',
    features: ['Heavy equipment', 'Careful handling', 'Proper techniques', 'Insurance coverage']
  },
  {
    title: 'Event Setup & Breakdown',
    description: 'Complete event support from initial setup to final cleanup',
    features: ['Pre-event setup', 'During-event support', 'Post-event cleanup', 'Flexible scheduling']
  }
]

const venues = [
  'San Diego Convention Center',
  'Balboa Theatre',
  'Copley Symphony Hall',
  'Pechanga Arena',
  'Petco Park',
  'Del Mar Fairgrounds',
  'Humphreys Concerts by the Bay',
  'The Observatory North Park'
]

export default function EntertainmentPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-24 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-secondary-900/90 via-secondary-900/70 to-secondary-900/90 z-10" />
          <Image
            src="https://img1.wsimg.com/isteam/ip/c5ad71c6-23e4-46f8-b587-2a12fbde04f5/blob-66b96a8.png"
            alt="Event crew setting up stage equipment"
            fill
            className="object-cover"
            priority
          />
        </div>
        
        <div className="relative z-20 container-custom">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 bg-primary-600/20 backdrop-blur-sm border border-primary-400/30 rounded-full px-4 py-2 mb-8">
              <Music className="h-4 w-4 text-primary-400" />
              <span className="text-primary-100 text-sm font-medium">Our Specialty Since 1990</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Concert & Event
              <span className="block text-gradient bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
                Crew People
              </span>
            </h1>

            <p className="text-xl text-secondary-200 mb-8 max-w-3xl leading-relaxed">
              Need a crew for load-in? Stage hands for your show? We've been doing this since 1990.
              Our people know venues, they know equipment, and they show up ready to work.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/request-staff">
                <Button size="xl" className="group">
                  Get a Crew
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <a href="tel:619-299-5991">
                <Button variant="secondary" size="xl" className="bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20">
                  <Phone className="mr-2 h-5 w-5" />
                  Call for Emergency Help
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">
              What We Do for Events
            </h2>
            <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
              Whether it's a small club show or a major festival, we've got the people you need to make it happen.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {services.map((service, index) => (
              <div key={service.title} className="bg-secondary-50 rounded-2xl p-8">
                <h3 className="text-xl font-semibold text-secondary-900 mb-4">
                  {service.title}
                </h3>
                <p className="text-secondary-600 mb-6">
                  {service.description}
                </p>
                <ul className="space-y-2">
                  {service.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center text-sm text-secondary-700">
                      <CheckCircle className="h-4 w-4 text-primary-500 mr-3 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="section-padding bg-secondary-50">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-6">
                Why Entertainment Companies Choose Us
              </h2>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-secondary-900 mb-2">
                      Understanding of Event Timelines
                    </h3>
                    <p className="text-secondary-600">
                      We know that events run on tight schedules. Our crews are experienced with 
                      the urgency and precision required for successful productions.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-secondary-900 mb-2">
                      Experienced Crews
                    </h3>
                    <p className="text-secondary-600">
                      Our workers are familiar with venue requirements, safety protocols, 
                      and the equipment commonly used in entertainment productions.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-secondary-900 mb-2">
                      Safety & Insurance
                    </h3>
                    <p className="text-secondary-600">
                      All workers are covered by comprehensive insurance and trained in 
                      industry-specific safety protocols to protect your venue and equipment.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <Image
                src="https://img1.wsimg.com/isteam/ip/c5ad71c6-23e4-46f8-b587-2a12fbde04f5/blob-ddf6564.png"
                alt="Construction and event crew at work"
                width={600}
                height={400}
                className="rounded-2xl shadow-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Venues Section */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">
              Trusted by San Diego's Premier Venues
            </h2>
            <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
              We've provided reliable staffing for events at San Diego's most prestigious venues and events.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {venues.map((venue, index) => (
              <div key={venue} className="bg-secondary-50 rounded-lg p-4 text-center">
                <span className="text-secondary-700 font-medium text-sm">{venue}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-primary-600">
        <div className="container-custom text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Staff Your Next Event?
          </h2>
          <p className="text-xl text-primary-100 mb-8 max-w-3xl mx-auto">
            Whether you need a full crew for a major production or additional hands for a last-minute event, 
            we're here to help. Contact us today for a custom staffing solution.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/request-staff">
              <Button variant="secondary" size="lg" className="bg-white text-primary-600 hover:bg-primary-50">
                Request Event Crew
              </Button>
            </Link>
            <a href="tel:619-299-5991">
              <Button variant="ghost" size="lg" className="text-white border-white hover:bg-white/10">
                Call (619) 299-5991
              </Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
