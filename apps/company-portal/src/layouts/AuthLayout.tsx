import { Outlet, Navigate } from 'react-router-dom';
import { Sparkles, FileText, Search, Zap, Shield, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';

const features = [
  {
    icon: FileText,
    title: 'Smart Document Processing',
    description: 'AI-powered extraction and indexing of your documents',
  },
  {
    icon: Search,
    title: 'Semantic Search',
    description: 'Find exactly what you need with natural language queries',
  },
  {
    icon: Zap,
    title: 'Instant Answers',
    description: 'Get AI-generated responses from your knowledge base',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Your data is encrypted and isolated per company',
  },
];

export function AuthLayout() {
  const { isAuthenticated } = useAuthStore();

  // Redirect to dashboard if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950" />
        
        {/* Decorative elements */}
        <div className="absolute inset-0">
          {/* Gradient orbs */}
          <div className="absolute top-20 left-20 w-72 h-72 bg-primary-500/30 rounded-full blur-3xl animate-pulse-soft" />
          <div className="absolute bottom-40 right-20 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-primary-400/20 rounded-full blur-3xl animate-float" />
          
          {/* Grid pattern */}
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '64px 64px',
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3 animate-fade-up">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 shadow-xl">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white font-display">RAG Portal</span>
          </div>

          {/* Hero Text */}
          <div className="space-y-8 max-w-lg animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 text-sm">
              <Zap className="w-4 h-4 text-accent-400" />
              <span>AI-Powered Document Intelligence</span>
            </div>
            
            <h1 className="text-4xl xl:text-5xl font-bold text-white font-display leading-tight">
              Transform Your
              <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-primary-300 via-accent-400 to-primary-300">
                Knowledge Base
              </span>
            </h1>
            
            <p className="text-lg text-primary-100/80 leading-relaxed">
              Upload, search, and retrieve information from your documents with our cutting-edge semantic search technology. Ask questions naturally and get instant, accurate answers.
            </p>

            <div className="flex items-center gap-2 text-primary-200">
              <span className="text-sm">Trusted by innovative teams worldwide</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-4 animate-fade-up" style={{ animationDelay: '0.2s' }}>
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 cursor-default"
                style={{ animationDelay: `${0.3 + index * 0.1}s` }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                    <feature.icon className="w-4 h-4 text-primary-200" />
                  </div>
                  <h3 className="font-semibold text-white text-sm">{feature.title}</h3>
                </div>
                <p className="text-xs text-primary-200/70 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-mesh">
        {/* Subtle decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-500/5 rounded-full blur-3xl" />
        
        <div className="w-full max-w-md relative z-10 animate-fade-up">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
