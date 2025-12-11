import { Navbar } from './components/Navbar';
import { Hero } from './sections/Hero';
import { Features } from './sections/Features';
import { HowItWorks } from './sections/HowItWorks';
import { Testimonials } from './sections/Testimonials';
import { Pricing } from './sections/Pricing';
import { CTA } from './sections/CTA';
import { Footer } from './sections/Footer';

function App() {
  return (
    <div className="min-h-screen bg-slate-950 overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="floating-orb w-[600px] h-[600px] bg-primary-500 -top-64 -left-64" />
        <div className="floating-orb w-[500px] h-[500px] bg-accent-500 top-1/2 -right-48" style={{ animationDelay: '-3s' }} />
        <div className="floating-orb w-[400px] h-[400px] bg-primary-600 bottom-0 left-1/3" style={{ animationDelay: '-1.5s' }} />
      </div>

      {/* Grid pattern overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10">
        <Navbar />
        <Hero />
        <Features />
        <HowItWorks />
        <Testimonials />
        <Pricing />
        <CTA />
        <Footer />
      </div>
    </div>
  );
}

export default App;
