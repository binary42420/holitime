import Link from 'next/link'
import Image from 'next/image'
import { Phone, Mail, MapPin, Clock } from 'lucide-react'

const navigation = {
  industries: [
    { name: 'Entertainment & Events', href: '/industries/entertainment' },
    { name: 'Construction', href: '/industries/construction' },
    { name: 'Warehouse & Logistics', href: '/industries/warehouse' },
    { name: 'General Labor', href: '/industries/general' },
  ],
  services: [
    { name: 'Temporary Staffing', href: '/services/temporary' },
    { name: 'Temp-to-Hire', href: '/services/temp-to-hire' },
    { name: 'On-Demand Labor', href: '/services/on-demand' },
    { name: 'Payroll Services', href: '/services/payroll' },
  ],
  company: [
    { name: 'About Us', href: '/about' },
    { name: 'Success Stories', href: '/success-stories' },
    { name: 'Safety & Compliance', href: '/safety' },
    { name: 'Contact', href: '/contact' },
  ],
  workers: [
    { name: 'Find Work', href: '/find-work' },
    { name: 'Apply Now', href: '/apply' },
    { name: 'Worker Resources', href: '/resources' },
    { name: 'Benefits', href: '/benefits' },
  ],
  portal: [
    { name: 'Client Area', href: 'https://holitime-369017734615.us-central1.run.app', external: true },
    { name: 'Employee Portal', href: 'https://holitime-369017734615.us-central1.run.app', external: true },
    { name: 'Schedule Management', href: 'https://holitime-369017734615.us-central1.run.app', external: true },
  ],
}

export default function Footer() {
  return (
    <footer className="bg-secondary-900" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">
        Footer
      </h2>
      <div className="container-custom section-padding">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <Image
                src="https://img1.wsimg.com/isteam/ip/c5ad71c6-23e4-46f8-b587-2a12fbde04f5/HANDSON%20logo_2009.jpg"
                alt="Hands On Labor"
                width={120}
                height={60}
                className="h-12 w-auto brightness-0 invert"
              />
            </div>
            <p className="text-secondary-300 mb-6 max-w-md">
              San Diego's most reliable labor staffing agency, connecting businesses with qualified workers for over 35 years. Specializing in entertainment, construction, and general labor.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-secondary-300">
                <Phone className="h-5 w-5 text-primary-400" />
                <a href="tel:619-299-5991" className="hover:text-white transition-colors">
                  (619) 299-5991
                </a>
              </div>
              <div className="flex items-center space-x-3 text-secondary-300">
                <Mail className="h-5 w-5 text-primary-400" />
                <a href="mailto:info@handsonlabor.com" className="hover:text-white transition-colors">
                  info@handsonlabor.com
                </a>
              </div>
              <div className="flex items-start space-x-3 text-secondary-300">
                <MapPin className="h-5 w-5 text-primary-400 mt-0.5" />
                <div>
                  <p>San Diego, California</p>
                  <p className="text-sm">Serving all of San Diego County</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 text-secondary-300">
                <Clock className="h-5 w-5 text-primary-400 mt-0.5" />
                <div>
                  <p>24/7 Emergency Staffing</p>
                  <p className="text-sm">Office: Mon-Fri 7AM-6PM</p>
                </div>
              </div>
            </div>
          </div>

          {/* Industries */}
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">
              Industries
            </h3>
            <ul className="space-y-3">
              {navigation.industries.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-secondary-300 hover:text-white transition-colors text-sm"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">
              Services
            </h3>
            <ul className="space-y-3">
              {navigation.services.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-secondary-300 hover:text-white transition-colors text-sm"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">
              Company
            </h3>
            <ul className="space-y-3">
              {navigation.company.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-secondary-300 hover:text-white transition-colors text-sm"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Workers */}
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">
              For Workers
            </h3>
            <ul className="space-y-3">
              {navigation.workers.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-secondary-300 hover:text-white transition-colors text-sm"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Portal */}
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">
              Client Portal
            </h3>
            <ul className="space-y-3">
              {navigation.portal.map((item) => (
                <li key={item.name}>
                  {item.external ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-secondary-300 hover:text-white transition-colors text-sm"
                    >
                      {item.name}
                    </a>
                  ) : (
                    <Link
                      href={item.href}
                      className="text-secondary-300 hover:text-white transition-colors text-sm"
                    >
                      {item.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom section */}
        <div className="mt-12 pt-8 border-t border-secondary-800">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6">
              <p className="text-secondary-400 text-sm">
                © 2024 Hands On Labor. All rights reserved.
              </p>
              <div className="flex space-x-6">
                <Link href="/privacy" className="text-secondary-400 hover:text-white text-sm transition-colors">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="text-secondary-400 hover:text-white text-sm transition-colors">
                  Terms of Service
                </Link>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-secondary-400 text-sm">Licensed & Insured</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-secondary-400 text-sm">Available 24/7</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
