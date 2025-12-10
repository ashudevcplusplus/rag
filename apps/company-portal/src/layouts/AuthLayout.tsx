import { Outlet, Navigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';

export function AuthLayout() {
  const { isAuthenticated } = useAuthStore();

  // Redirect to dashboard if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-indigo-700 p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">RAG Portal</span>
          </div>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Document Intelligence
            <br />
            at Your Fingertips
          </h1>
          <p className="text-blue-100 text-lg max-w-md">
            Upload, search, and retrieve information from your documents with AI-powered semantic search.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 text-blue-100">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <span className="text-sm">✓</span>
            </div>
            <span>Semantic document search</span>
          </div>
          <div className="flex items-center gap-3 text-blue-100">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <span className="text-sm">✓</span>
            </div>
            <span>AI-powered retrieval</span>
          </div>
          <div className="flex items-center gap-3 text-blue-100">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <span className="text-sm">✓</span>
            </div>
            <span>Secure document management</span>
          </div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
