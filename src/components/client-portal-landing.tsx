"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Hand, LogIn, Calendar, Users, FileText, Clock, Shield, Phone } from "lucide-react"

export function ClientPortalLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Hand className="h-8 w-8 text-primary mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Hands On Labor</h1>
            </div>
            <Link href="/login">
              <Button>
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
            Welcome to Your <span className="text-primary">Client Portal</span>
          </h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Manage your workforce, schedule shifts, and track timecards all in one place. 
            Our client portal makes it easy to stay on top of your staffing needs.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <Link href="/login">
              <Button size="lg" className="w-full sm:w-auto text-base md:text-lg px-8 py-3">
                Access Your Portal
                <LogIn className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <a href="tel:619-299-5991">
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-base md:text-lg px-8 py-3">
                <Phone className="mr-2 h-5 w-5" />
                Call (619) 299-5991
              </Button>
            </a>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 max-w-md mx-auto">
            <p className="text-blue-800 font-medium">
              🔒 Secure Login Required
            </p>
            <p className="text-blue-700 text-sm mt-1">
              Contact us at (619) 299-5991 to set up your client portal access or if you need login assistance.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-16">
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What You Can Do
            </h3>
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
              Our client portal gives you complete control over your staffing operations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            <Card className="text-center p-6">
              <Calendar className="h-10 w-10 text-primary mx-auto mb-4" />
              <CardTitle className="text-xl mb-2">Schedule Shifts</CardTitle>
              <CardDescription>
                Create and manage work shifts for your projects and events.
              </CardDescription>
            </Card>

            <Card className="text-center p-6">
              <Users className="h-10 w-10 text-primary mx-auto mb-4" />
              <CardTitle className="text-xl mb-2">Manage Staff</CardTitle>
              <CardDescription>
                Assign workers, track attendance, and manage your workforce.
              </CardDescription>
            </Card>

            <Card className="text-center p-6">
              <FileText className="h-10 w-10 text-primary mx-auto mb-4" />
              <CardTitle className="text-xl mb-2">Approve Timesheets</CardTitle>
              <CardDescription>
                Review and approve employee timesheets with digital signatures.
              </CardDescription>
            </Card>

            <Card className="text-center p-6">
              <Clock className="h-10 w-10 text-primary mx-auto mb-4" />
              <CardTitle className="text-xl mb-2">Real-time Tracking</CardTitle>
              <CardDescription>
                Monitor clock-ins, breaks, and shift progress in real-time.
              </CardDescription>
            </Card>

            <Card className="text-center p-6">
              <Shield className="h-10 w-10 text-primary mx-auto mb-4" />
              <CardTitle className="text-xl mb-2">Secure Access</CardTitle>
              <CardDescription>
                Enterprise-grade security with role-based access controls.
              </CardDescription>
            </Card>

            <Card className="text-center p-6">
              <Phone className="h-10 w-10 text-primary mx-auto mb-4" />
              <CardTitle className="text-xl mb-2">24/7 Support</CardTitle>
              <CardDescription>
                Get help when you need it with our dedicated support team.
              </CardDescription>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Get Started?
          </h3>
          <p className="text-lg md:text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Contact us today to set up your client portal access and start managing 
            your workforce more efficiently.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="tel:619-299-5991">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto bg-white text-primary hover:bg-blue-50 text-base md:text-lg px-8 py-3">
                Call (619) 299-5991
              </Button>
            </a>
            <Link href="/login">
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-white border-white hover:bg-white/10 text-base md:text-lg px-8 py-3">
                Sign In to Portal
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <Hand className="h-5 w-5 mr-2" />
            <span className="text-base font-semibold">Hands On Labor</span>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            Professional staffing solutions for your business needs.
          </p>
          <p className="text-gray-500 text-xs">
            © {new Date().getFullYear()} Hands On Labor. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
