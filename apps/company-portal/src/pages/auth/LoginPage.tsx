import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Mail, Lock, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent } from '@rag/ui';
import { configureApiClient, usersApi, companyApi } from '@rag/api-client';
import { SubscriptionTier, CompanyStatus } from '@rag/types';
import { useAuthStore } from '../../store/auth.store';
import { useAppStore } from '../../store/app.store';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, apiUrl } = useAuthStore();
  const { addActivity } = useAppStore();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmitLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error('Please enter email and password');
      return;
    }

    setIsLoading(true);
    try {
      // Configure API client with just the base URL
      configureApiClient({
        baseUrl: apiUrl,
      });

      // Call the login endpoint (just email and password)
      const loginResponse = await usersApi.login({
        email: formData.email,
        password: formData.password,
      });

      // Configure API client with the token
      configureApiClient({
        baseUrl: apiUrl,
        token: loginResponse.token,
        companyId: loginResponse.user.companyId,
      });

      // Fetch company details using the token
      let company;
      try {
        const companyResponse = await companyApi.get(loginResponse.user.companyId);
        company = companyResponse.company;
      } catch {
        // If we can't fetch company details, create a minimal company object
        company = {
          _id: loginResponse.user.companyId,
          name: 'Company',
          slug: 'company',
          email: loginResponse.user.email,
          subscriptionTier: SubscriptionTier.FREE,
          storageLimit: 5368709120,
          storageUsed: 0,
          maxUsers: 4,
          maxProjects: 10,
          status: CompanyStatus.ACTIVE,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      login({
        user: loginResponse.user,
        company,
        token: loginResponse.token,
      });

      addActivity({
        text: `Logged in as ${loginResponse.user.firstName} ${loginResponse.user.lastName}`,
        type: 'user',
      });

      toast.success(`Welcome back, ${loginResponse.user.firstName}!`);
      navigate('/dashboard');
    } catch (error) {
      const apiError = error as { error?: string; message?: string; statusCode?: number };
      if (apiError.statusCode === 401) {
        toast.error(apiError.error || 'Invalid email or password');
      } else {
        toast.error(apiError.error || 'Login failed. Please check your credentials.');
      }
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Mobile logo */}
      <div className="lg:hidden text-center mb-8">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-primary-500 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/25">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-surface-900 font-display">RAG Portal</h1>
        <p className="text-surface-600 mt-1">AI-Powered Document Intelligence</p>
      </div>

      <Card className="overflow-hidden border-0 shadow-xl shadow-surface-900/5">
        <div className="h-1.5 bg-gradient-to-r from-primary-600 via-primary-500 to-accent-500" />
        <CardContent className="p-8 sm:p-10">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-surface-900 font-display">Welcome back</h2>
            <p className="text-surface-500 mt-2">
              Sign in to continue to your workspace
            </p>
          </div>

          <form onSubmit={handleSubmitLogin} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-surface-700">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="w-5 h-5 text-surface-400" />
                </div>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@company.com"
                  autoComplete="email"
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-surface-200 bg-surface-50/50 text-surface-900 placeholder-surface-400 focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:outline-none transition-all duration-200"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-surface-700">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-surface-400" />
                </div>
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full pl-12 pr-12 py-3.5 rounded-xl border-2 border-surface-200 bg-surface-50/50 text-surface-900 placeholder-surface-400 focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:outline-none transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-surface-400 hover:text-surface-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full relative px-6 py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <LogIn className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-8 p-4 rounded-xl bg-gradient-to-r from-primary-50 to-accent-50 border border-primary-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-primary-100 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-primary-600" />
              </div>
              <p className="text-sm font-semibold text-primary-800">Demo Credentials</p>
            </div>
            <div className="text-sm text-primary-700 space-y-1 font-mono">
              <p><span className="text-primary-500">email:</span> john.doe@acme-corp.com</p>
              <p><span className="text-primary-500">password:</span> password123</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-surface-500">
        Need help?{' '}
        <a href="#" className="text-primary-600 hover:text-primary-700 font-medium hover:underline">
          View documentation
        </a>
      </p>
    </div>
  );
}
