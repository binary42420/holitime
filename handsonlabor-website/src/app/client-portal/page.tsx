import type { Metadata } from 'next'
import Link from 'next/link'
import { ExternalLink, Calendar, Users, FileText, Clock, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Client Portal | Hands On Labor',
  description: 'Access your client portal for shift scheduling, employee management, and timecard tracking.',
  keywords: 'client portal, shift scheduling, employee management, timecard tracking',
}

const features = [
  {
    icon: Calendar,
    title: 'Shift Scheduling',
    description: 'Create and manage shifts, assign workers, and track schedules in real-time.'
  },
  {
    icon: Users,
    title: 'Employee Management',
    description: 'View worker profiles, track assignments, and manage your team efficiently.'
  },
  {
    icon: FileText,
    title: 'Timecard Tracking',
    description: 'Monitor clock-in/out times, approve timesheets, and handle payroll processing.'
  },
  {
    icon: Clock,
    title: 'Real-Time Updates',
    description: 'Get instant notifications about shift changes, worker availability, and more.'
  },
  {
    icon: Shield,
    title: 'Secure Access',
    description: 'Your data is protected with enterprise-level security and user authentication.'
  }
]

export default function ClientPortalPage() {
  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Hero Section */}
      <section className="section-padding bg-white">
        <div className="container-custom text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-secondary-900 mb-6">
            Client Portal Access
          </h1>
          <p className="text-xl text-secondary-600 max-w-3xl mx-auto mb-8">
            Manage your workforce, schedule shifts, and track timecards all in one place. 
            Our client portal makes it easy to stay on top of your staffing needs.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <a
              href="https://holitime-369017734615.us-central1.run.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex"
            >
              <Button size="lg" className="group">
                Access Client Portal
                <ExternalLink className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </a>
            <Link href="/contact">
              <Button variant="outline" size="lg">
                Need Help?
              </Button>
            </Link>
          </div>

          <div className="bg-primary-50 rounded-2xl p-6 max-w-2xl mx-auto">
            <p className="text-primary-800 font-medium mb-2">
              🔒 Secure Login Required
            </p>
            <p className="text-primary-700 text-sm">
              Contact us at (619) 299-5991 to set up your client portal access or if you need login assistance.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">
              What You Can Do
            </h2>
            <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
              Our client portal gives you complete control over your staffing operations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={feature.title} className="bg-white rounded-2xl p-8 shadow-sm">
                <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center mb-6">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-secondary-900 mb-4">
                  {feature.title}
                </h3>
                <p className="text-secondary-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
              Simple steps to manage your workforce effectively.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white font-bold text-xl">1</span>
              </div>
              <h3 className="text-xl font-semibold text-secondary-900 mb-4">
                Create Your Shifts
              </h3>
              <p className="text-secondary-600">
                Set up shifts with specific requirements, dates, times, and worker types needed.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white font-bold text-xl">2</span>
              </div>
              <h3 className="text-xl font-semibold text-secondary-900 mb-4">
                We Assign Workers
              </h3>
              <p className="text-secondary-600">
                Our team assigns qualified workers to your shifts based on your requirements.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white font-bold text-xl">3</span>
              </div>
              <h3 className="text-xl font-semibold text-secondary-900 mb-4">
                Track & Approve
              </h3>
              <p className="text-secondary-600">
                Monitor attendance, approve timesheets, and manage your workforce in real-time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-primary-600">
        <div className="container-custom text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-primary-100 mb-8 max-w-3xl mx-auto">
            Contact us today to set up your client portal access and start managing 
            your workforce more efficiently.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="tel:619-299-5991">
              <Button variant="secondary" size="lg" className="bg-white text-primary-600 hover:bg-primary-50">
                Call (619) 299-5991
              </Button>
            </a>
            <Link href="/request-staff">
              <Button variant="ghost" size="lg" className="text-white border-white hover:bg-white/10">
                Request Access
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
