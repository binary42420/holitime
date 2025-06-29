'use client'

import { useState } from 'react'
import type { Metadata } from 'next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Phone, Clock, Users, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

const requestSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  contactName: z.string().min(1, 'Contact name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  industry: z.string().min(1, 'Please select an industry'),
  workersNeeded: z.string().min(1, 'Number of workers is required'),
  startDate: z.string().min(1, 'Start date is required'),
  duration: z.string().min(1, 'Duration is required'),
  jobDescription: z.string().min(10, 'Please provide job details (minimum 10 characters)'),
  urgency: z.enum(['standard', 'urgent', 'emergency']),
  additionalRequirements: z.string().optional(),
})

type RequestFormData = z.infer<typeof requestSchema>

export default function RequestStaffPage() {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      urgency: 'standard',
    },
  })

  const urgency = watch('urgency')

  const onSubmit = async (data: RequestFormData) => {
    setIsSubmitting(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    console.log('Form submitted:', data)
    setIsSubmitted(true)
    setIsSubmitting(false)
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center shadow-xl">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-secondary-900 mb-4">
            Request Received!
          </h2>
          <p className="text-secondary-600 mb-6">
            Thank you for your staffing request. Our team will review your requirements and contact you within 2 hours.
          </p>
          <div className="space-y-4">
            <a href="tel:619-299-5991">
              <Button className="w-full">
                <Phone className="mr-2 h-4 w-4" />
                Call for Immediate Assistance
              </Button>
            </a>
            <Button variant="outline" className="w-full" onClick={() => setIsSubmitted(false)}>
              Submit Another Request
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary-50 py-12">
      <div className="container-custom">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-secondary-900 mb-4">
            Need People? Let's Talk
          </h1>
          <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
            Tell us what you need and we'll figure out how to help.
            We'll get back to you within 2 hours (usually way faster).
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Company Information */}
                <div>
                  <h3 className="text-lg font-semibold text-secondary-900 mb-4">
                    Company Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-2">
                        Company Name *
                      </label>
                      <input
                        {...register('companyName')}
                        className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Your company name"
                      />
                      {errors.companyName && (
                        <p className="mt-1 text-sm text-red-600">{errors.companyName.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-2">
                        Contact Name *
                      </label>
                      <input
                        {...register('contactName')}
                        className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Your full name"
                      />
                      {errors.contactName && (
                        <p className="mt-1 text-sm text-red-600">{errors.contactName.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        {...register('email')}
                        type="email"
                        className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="your@email.com"
                      />
                      {errors.email && (
                        <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-2">
                        Phone Number *
                      </label>
                      <input
                        {...register('phone')}
                        type="tel"
                        className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="(619) 555-0123"
                      />
                      {errors.phone && (
                        <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Job Details */}
                <div>
                  <h3 className="text-lg font-semibold text-secondary-900 mb-4">
                    Job Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-2">
                        Industry *
                      </label>
                      <select
                        {...register('industry')}
                        className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="">Select industry</option>
                        <option value="entertainment">Entertainment & Events</option>
                        <option value="construction">Construction</option>
                        <option value="warehouse">Warehouse & Logistics</option>
                        <option value="general">General Labor</option>
                        <option value="other">Other</option>
                      </select>
                      {errors.industry && (
                        <p className="mt-1 text-sm text-red-600">{errors.industry.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-2">
                        Workers Needed *
                      </label>
                      <select
                        {...register('workersNeeded')}
                        className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="">Select number</option>
                        <option value="1-5">1-5 workers</option>
                        <option value="6-10">6-10 workers</option>
                        <option value="11-25">11-25 workers</option>
                        <option value="26-50">26-50 workers</option>
                        <option value="50+">50+ workers</option>
                      </select>
                      {errors.workersNeeded && (
                        <p className="mt-1 text-sm text-red-600">{errors.workersNeeded.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-2">
                        Start Date *
                      </label>
                      <input
                        {...register('startDate')}
                        type="date"
                        className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      {errors.startDate && (
                        <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-2">
                        Duration *
                      </label>
                      <select
                        {...register('duration')}
                        className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="">Select duration</option>
                        <option value="1-day">1 day</option>
                        <option value="2-3-days">2-3 days</option>
                        <option value="1-week">1 week</option>
                        <option value="2-4-weeks">2-4 weeks</option>
                        <option value="1-3-months">1-3 months</option>
                        <option value="3-months+">3+ months</option>
                        <option value="ongoing">Ongoing</option>
                      </select>
                      {errors.duration && (
                        <p className="mt-1 text-sm text-red-600">{errors.duration.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Urgency */}
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-3">
                    Urgency Level *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label className="relative">
                      <input
                        {...register('urgency')}
                        type="radio"
                        value="standard"
                        className="sr-only"
                      />
                      <div className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        urgency === 'standard' 
                          ? 'border-primary-500 bg-primary-50' 
                          : 'border-secondary-300 hover:border-secondary-400'
                      }`}>
                        <div className="font-medium text-secondary-900">Standard</div>
                        <div className="text-sm text-secondary-600">2+ days notice</div>
                      </div>
                    </label>
                    
                    <label className="relative">
                      <input
                        {...register('urgency')}
                        type="radio"
                        value="urgent"
                        className="sr-only"
                      />
                      <div className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        urgency === 'urgent' 
                          ? 'border-accent-500 bg-accent-50' 
                          : 'border-secondary-300 hover:border-secondary-400'
                      }`}>
                        <div className="font-medium text-secondary-900">Urgent</div>
                        <div className="text-sm text-secondary-600">24-48 hours</div>
                      </div>
                    </label>
                    
                    <label className="relative">
                      <input
                        {...register('urgency')}
                        type="radio"
                        value="emergency"
                        className="sr-only"
                      />
                      <div className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        urgency === 'emergency' 
                          ? 'border-red-500 bg-red-50' 
                          : 'border-secondary-300 hover:border-secondary-400'
                      }`}>
                        <div className="font-medium text-secondary-900">Emergency</div>
                        <div className="text-sm text-secondary-600">Same day</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Job Description */}
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Job Description *
                  </label>
                  <textarea
                    {...register('jobDescription')}
                    rows={4}
                    className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Please describe the work to be performed, any special requirements, location details, etc."
                  />
                  {errors.jobDescription && (
                    <p className="mt-1 text-sm text-red-600">{errors.jobDescription.message}</p>
                  )}
                </div>

                {/* Additional Requirements */}
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Additional Requirements (Optional)
                  </label>
                  <textarea
                    {...register('additionalRequirements')}
                    rows={3}
                    className="w-full px-4 py-3 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Special skills, certifications, equipment, safety requirements, etc."
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-6">
                  <Button
                    type="submit"
                    size="lg"
                    fullWidth
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Submitting Request...' : 'Submit Staffing Request'}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Contact Info */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">
                Need Help Right Now?
              </h3>
              <div className="space-y-4">
                <a
                  href="tel:619-299-5991"
                  className="flex items-center space-x-3 p-3 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                >
                  <Phone className="h-5 w-5 text-primary-600" />
                  <div>
                    <div className="font-medium text-secondary-900">(619) 299-5991</div>
                    <div className="text-sm text-secondary-600">24/7 Emergency Line</div>
                  </div>
                </a>
              </div>
            </div>

            {/* Response Time */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center space-x-3 mb-4">
                <Clock className="h-6 w-6 text-primary-600" />
                <h3 className="text-lg font-semibold text-secondary-900">
                  Response Time
                </h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-secondary-600">Standard Requests</span>
                  <span className="font-medium text-secondary-900">2 hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-600">Urgent Requests</span>
                  <span className="font-medium text-secondary-900">1 hour</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-600">Emergency</span>
                  <span className="font-medium text-secondary-900">30 minutes</span>
                </div>
              </div>
            </div>

            {/* What's Included */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center space-x-3 mb-4">
                <Users className="h-6 w-6 text-primary-600" />
                <h3 className="text-lg font-semibold text-secondary-900">
                  What's Included
                </h3>
              </div>
              <ul className="space-y-2">
                {[
                  'Pre-screened workers',
                  'Workers compensation',
                  'Payroll taxes',
                  'Replacement guarantee',
                  'Safety training',
                  'Insurance coverage'
                ].map((item, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-secondary-700 text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
