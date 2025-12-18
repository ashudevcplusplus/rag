import { Navbar } from './components/Navbar';
import { ScrollProgress } from './components/ScrollProgress';
import { SectionDivider } from './components/SectionDivider';
import { Hero } from './sections/Hero';
import { Features } from './sections/Features';
import { HowItWorks } from './sections/HowItWorks';
import { Testimonials } from './sections/Testimonials';
import { Pricing } from './sections/Pricing';
import { CTA } from './sections/CTA';
import { Contact } from './sections/Contact';
import { Footer } from './sections/Footer';

function App() {
  return (
    <div className="min-h-screen bg-slate-950 overflow-hidden">
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-primary-500 focus:text-white focus:rounded-lg focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Scroll Progress Indicator */}
      <ScrollProgress />

      {/* Minimal elegant background */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900" />
        
        {/* Subtle accent glow - top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-radial from-primary-500/8 to-transparent rounded-full blur-3xl" />
        
        {/* Subtle accent glow - bottom right */}
        <div className="absolute -bottom-32 -right-32 w-[600px] h-[600px] bg-gradient-radial from-accent-500/6 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Minimal dot grid */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10">
        <Navbar />
        <main id="main-content">
          <Hero />
          <SectionDivider className="max-w-6xl mx-auto" />
          <Features />
          <SectionDivider className="max-w-6xl mx-auto" />
          <HowItWorks />
          <SectionDivider className="max-w-6xl mx-auto" />
          <Testimonials />
          <SectionDivider className="max-w-6xl mx-auto" />
          <Pricing />
          <SectionDivider className="max-w-6xl mx-auto" />
          <Contact />
          <CTA />
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default App;
