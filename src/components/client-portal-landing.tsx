'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Hand, LogIn, Calendar, Users, FileText, Clock, Shield, Phone } from 'lucide-react';

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
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Welcome to Your
            <span className="text-primary block">Client Portal</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Manage your workforce, schedule shifts, and track timecards all in one place. 
            Our client portal makes it easy to stay on top of your staffing needs.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/login">
              <Button size="lg" className="text-lg px-8 py-3">
                Access Your Portal
                <LogIn className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <a href="tel:619-299-5991">
              <Button variant="outline" size="lg" className="text-lg px-8 py-3">
                <Phone className="mr-2 h-5 w-5" />
                Call (619) 299-5991
              </Button>
            </a>
          </div>

          <div className="bg-blue-50 rounded-2xl p-6 max-w-2xl mx-auto">
            <p className="text-blue-800 font-medium mb-2">
              🔒 Secure Login Required
            </p>
            <p className="text-blue-700 text-sm">
              Contact us at (619) 299-5991 to set up your client portal access or if you need login assistance.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What You Can Do
            </h3>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our client portal gives you complete control over your staffing operations.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <Calendar className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Schedule Shifts</CardTitle>
                <CardDescription>
                  Create and manage work shifts for your projects and events.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Manage Staff</CardTitle>
                <CardDescription>
                  Assign workers, track attendance, and manage your workforce.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <FileText className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Approve Timesheets</CardTitle>
                <CardDescription>
                  Review and approve employee timesheets with digital signatures.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Clock className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Real-time Tracking</CardTitle>
                <CardDescription>
                  Monitor clock-ins, breaks, and shift progress in real-time.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Secure Access</CardTitle>
                <CardDescription>
                  Enterprise-grade security with role-based access controls.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Phone className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>24/7 Support</CardTitle>
                <CardDescription>
                  Get help when you need it with our dedicated support team.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Get Started?
          </h3>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Contact us today to set up your client portal access and start managing 
            your workforce more efficiently.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="tel:619-299-5991">
              <Button variant="secondary" size="lg" className="bg-white text-primary hover:bg-blue-50">
                Call (619) 299-5991
              </Button>
            </a>
            <Link href="/login">
              <Button variant="ghost" size="lg" className="text-white border-white hover:bg-white/10">
                Sign In to Portal
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <Hand className="h-6 w-6 mr-2" />
            <span className="text-lg font-semibold">Hands On Labor</span>
          </div>
          <p className="text-gray-400 mb-4">
            Professional staffing solutions for your business needs.
          </p>
          <p className="text-gray-400 text-sm">
            © 2024 Hands On Labor. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
