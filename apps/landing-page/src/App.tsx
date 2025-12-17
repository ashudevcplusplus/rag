import { Navbar } from './components/Navbar';
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
      {/* Background effects - hidden on mobile for performance */}
      <div className="fixed inset-0 pointer-events-none hidden sm:block">
        <div className="floating-orb w-[400px] sm:w-[500px] lg:w-[600px] h-[400px] sm:h-[500px] lg:h-[600px] bg-primary-500 -top-64 -left-64" />
        <div className="floating-orb w-[350px] sm:w-[400px] lg:w-[500px] h-[350px] sm:h-[400px] lg:h-[500px] bg-accent-500 top-1/2 -right-48" style={{ animationDelay: '-3s' }} />
        <div className="floating-orb w-[300px] sm:w-[350px] lg:w-[400px] h-[300px] sm:h-[350px] lg:h-[400px] bg-primary-600 bottom-0 left-1/3" style={{ animationDelay: '-1.5s' }} />
      </div>

      {/* Mobile-optimized gradient background */}
      <div className="fixed inset-0 pointer-events-none sm:hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-950/50 via-slate-950 to-accent-950/30" />
      </div>

      {/* Grid pattern overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-10 sm:opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Noise texture overlay for depth */}
      <div className="noise-overlay" />

      <div className="relative z-10">
        <Navbar />
        <Hero />
        <Features />
        <HowItWorks />
        <Testimonials />
        <Pricing />
        <Contact />
        <CTA />
        <Footer />
      </div>
    </div>
  );
}

export default App;
