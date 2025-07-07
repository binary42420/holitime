import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Hands On Labor - San Diego\'s Premier Staffing Agency Since 1990',
  description: 'Reliable temporary labor staffing for entertainment, construction, and general labor needs in San Diego. Specializing in event crews, stage hands, and skilled workers since 1990.',
  keywords: 'San Diego staffing, temporary labor, event staffing, construction labor, stage hands, concert crew, general labor, staffing agency',
  authors: [{ name: 'Hands On Labor' }],
  creator: 'Hands On Labor',
  publisher: 'Hands On Labor',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://handsonlabor.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Hands On Labor - San Diego\'s Premier Staffing Agency',
    description: 'Reliable temporary labor staffing for entertainment, construction, and general labor needs in San Diego since 1990.',
    url: 'https://handsonlabor.com',
    siteName: 'Hands On Labor',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Hands On Labor - San Diego Staffing Agency',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hands On Labor - San Diego\'s Premier Staffing Agency',
    description: 'Reliable temporary labor staffing for entertainment, construction, and general labor needs in San Diego since 1990.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={inter.className}>
        <Header />
        <main className="min-h-screen">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
