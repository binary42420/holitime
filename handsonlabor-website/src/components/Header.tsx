'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu, X, Phone, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const navigation = [
  { name: 'Home', href: '/' },
  { 
    name: 'Industries', 
    href: '/industries',
    submenu: [
      { name: 'Entertainment & Events', href: '/industries/entertainment' },
      { name: 'Construction', href: '/industries/construction' },
      { name: 'Warehouse & Logistics', href: '/industries/warehouse' },
      { name: 'General Labor', href: '/industries/general' },
    ]
  },
  { 
    name: 'Services', 
    href: '/services',
    submenu: [
      { name: 'Temporary Staffing', href: '/services/temporary' },
      { name: 'Temp-to-Hire', href: '/services/temp-to-hire' },
      { name: 'On-Demand Labor', href: '/services/on-demand' },
      { name: 'Payroll Services', href: '/services/payroll' },
    ]
  },
  { name: 'About', href: '/about' },
  { name: 'Success Stories', href: '/success-stories' },
  { name: 'Find Work', href: '/find-work' },
  { name: 'Client Portal', href: '/client-portal' },
]

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(href)
  }

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <nav className="container-custom" aria-label="Global">
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <div className="flex lg:flex-1">
            <Link href="/" className="-m-1.5 p-1.5">
              <span className="sr-only">Hands On Labor</span>
              <div className="flex items-center space-x-3">
                <Image
                  src="https://img1.wsimg.com/isteam/ip/c5ad71c6-23e4-46f8-b587-2a12fbde04f5/HANDSON%20logo_2009.jpg"
                  alt="Hands On Labor"
                  width={120}
                  height={60}
                  className="h-12 w-auto"
                />
              </div>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex lg:hidden">
            <button
              type="button"
              className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-secondary-700"
              onClick={() => setMobileMenuOpen(true)}
            >
              <span className="sr-only">Open main menu</span>
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          {/* Desktop navigation */}
          <div className="hidden lg:flex lg:gap-x-8">
            {navigation.map((item) => (
              <div key={item.name} className="relative">
                {item.submenu ? (
                  <div
                    className="relative"
                    onMouseEnter={() => setActiveDropdown(item.name)}
                    onMouseLeave={() => setActiveDropdown(null)}
                  >
                    <button
                      className={`flex items-center gap-x-1 text-sm font-semibold leading-6 transition-colors ${
                        isActive(item.href)
                          ? 'text-primary-600'
                          : 'text-secondary-900 hover:text-primary-600'
                      }`}
                    >
                      {item.name}
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    
                    <AnimatePresence>
                      {activeDropdown === item.name && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                          className="absolute left-1/2 z-10 mt-3 w-screen max-w-xs -translate-x-1/2 transform px-2 sm:px-0"
                        >
                          <div className="overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                            <div className="relative grid gap-1 bg-white p-2">
                              {item.submenu.map((subItem) => (
                                <Link
                                  key={subItem.name}
                                  href={subItem.href}
                                  className="block rounded-md px-3 py-2 text-sm font-medium text-secondary-900 hover:bg-secondary-50 hover:text-primary-600 transition-colors"
                                >
                                  {subItem.name}
                                </Link>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : item.external ? (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold leading-6 text-secondary-900 hover:text-primary-600 transition-colors"
                  >
                    {item.name}
                  </a>
                ) : (
                  <Link
                    href={item.href}
                    className={`text-sm font-semibold leading-6 transition-colors ${
                      isActive(item.href)
                        ? 'text-primary-600'
                        : 'text-secondary-900 hover:text-primary-600'
                    }`}
                  >
                    {item.name}
                  </Link>
                )}
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-x-4">
            <a
              href="tel:619-299-5991"
              className="flex items-center gap-x-2 text-sm font-semibold text-secondary-900 hover:text-primary-600 transition-colors"
            >
              <Phone className="h-4 w-4" />
              (619) 299-5991
            </a>
            <Link href="/request-staff" className="btn-primary">
              Request Staff
            </Link>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden"
          >
            <div className="fixed inset-0 z-50" />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-secondary-900/10"
            >
              <div className="flex items-center justify-between">
                <Link href="/" className="-m-1.5 p-1.5" onClick={() => setMobileMenuOpen(false)}>
                  <span className="sr-only">Hands On Labor</span>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold">H</span>
                    </div>
                    <span className="text-lg font-bold text-secondary-900">Hands On Labor</span>
                  </div>
                </Link>
                <button
                  type="button"
                  className="-m-2.5 rounded-md p-2.5 text-secondary-700"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="sr-only">Close menu</span>
                  <X className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-6 flow-root">
                <div className="-my-6 divide-y divide-secondary-500/10">
                  <div className="space-y-2 py-6">
                    {navigation.map((item) => (
                      <div key={item.name}>
                        {item.external ? (
                          <a
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-secondary-900 hover:bg-secondary-50 transition-colors"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            {item.name}
                          </a>
                        ) : (
                          <Link
                            href={item.href}
                            className={`-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 transition-colors ${
                              isActive(item.href)
                                ? 'text-primary-600 bg-primary-50'
                                : 'text-secondary-900 hover:bg-secondary-50'
                            }`}
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            {item.name}
                          </Link>
                        )}
                        {item.submenu && (
                          <div className="ml-4 space-y-1">
                            {item.submenu.map((subItem) => (
                              <Link
                                key={subItem.name}
                                href={subItem.href}
                                className="block rounded-lg px-3 py-2 text-sm font-medium text-secondary-700 hover:bg-secondary-50 hover:text-primary-600"
                                onClick={() => setMobileMenuOpen(false)}
                              >
                                {subItem.name}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="py-6 space-y-4">
                    <a
                      href="tel:619-299-5991"
                      className="flex items-center gap-x-2 text-base font-semibold text-secondary-900"
                    >
                      <Phone className="h-5 w-5" />
                      (619) 299-5991
                    </a>
                    <Link
                      href="/request-staff"
                      className="btn-primary w-full text-center"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Request Staff
                    </Link>
                    <Link
                      href="/find-work"
                      className="btn-secondary w-full text-center"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Find Work
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
