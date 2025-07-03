import HeroSection from '@/components/sections/HeroSection'
import ServicesOverview from '@/components/sections/ServicesOverview'
import IndustriesSection from '@/components/sections/IndustriesSection'
import WhyChooseUs from '@/components/sections/WhyChooseUs'
import TestimonialsSection from '@/components/sections/TestimonialsSection'
import StatsSection from '@/components/sections/StatsSection'
import CTASection from '@/components/sections/CTASection'

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <StatsSection />
      <ServicesOverview />
      <IndustriesSection />
      <WhyChooseUs />
      <TestimonialsSection />
      <CTASection />
    </>
  )
}
