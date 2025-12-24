"use client"

import Header from "../components/Header"
import HeroSection from "../components/HeroSection"
import TrustedBySection from "../components/TrustedBySection"
import DemoSection from "../components/DemoSection"
import BookingFlowsSection from "../components/BookingFlowsSection"
import ServiceTerritoriesSection from "../components/ServiceTerritoriesSection"
import FeaturesGrid from "../components/FeaturesGrid"
import TestimonialsCarousel from "../components/TestimonialsCarousel"
import InvoicingSection from "../components/InvoicingSection"
import DispatchSection from "../components/DispatchSection"
import ContractorSection from "../components/ContractorSection"
import MobileAppSection from "../components/MobileAppSection"
import CRMSection from "../components/CRMSection"
import IndustriesSection from "../components/IndustriesSection"
import UpdatesSection from "../components/UpdatesSection"
import CTASection from "../components/CTASection"
import Footer from "../components/Footer"

// Legacy landing page - moved to /legacy-landing route (no links point to this)
export default function LandingPageLegacy() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <HeroSection />
        <TrustedBySection />
        <DemoSection />
        <BookingFlowsSection />
        <ServiceTerritoriesSection />
        <FeaturesGrid />
        <TestimonialsCarousel />
        <InvoicingSection />
        <DispatchSection />
        <ContractorSection />
        <MobileAppSection />
        <CRMSection />
        <IndustriesSection />
        <UpdatesSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}

