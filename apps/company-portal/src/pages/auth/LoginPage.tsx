import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Input, Card, CardContent } from '@rag/ui';
import { configureApiClient, usersApi, companyApi } from '@rag/api-client';
import { SubscriptionTier, CompanyStatus } from '@rag/types';
import { useAuthStore } from '../../store/auth.store';
import { useAppStore } from '../../store/app.store';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, setApiUrl, apiUrl } = useAuthStore();
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
    <div className="space-y-6">
      {/* Mobile logo */}
      <div className="lg:hidden text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">RAG Portal</h1>
        <p className="text-gray-600 mt-1">Document Intelligence Platform</p>
      </div>

      <Card>
        <CardContent className="p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Sign In</h2>
            <p className="text-gray-600 mt-1">
              Enter your credentials to access your account
            </p>
          </div>

          <form onSubmit={handleSubmitLogin} className="space-y-5">
            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="john@company.com"
              autoComplete="email"
            />

            <div>
              <Input
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                autoComplete="current-password"
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                }
              />
            </div>

            <Button
              type="submit"
              isLoading={isLoading}
              rightIcon={<LogIn className="w-4 h-4" />}
              className="w-full"
            >
              Sign In
            </Button>
          </form>

          {/* Demo credentials hint */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm font-medium text-blue-800 mb-2">Demo Credentials</p>
            <div className="text-xs text-blue-700 space-y-1">
              <p><span className="font-medium">Email:</span> john.doe@acme-corp.com</p>
              <p><span className="font-medium">Password:</span> password123</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-gray-500">
        Need help?{' '}
        <a href="#" className="text-blue-600 hover:underline">
          View documentation
        </a>
      </p>
    </div>
  );
}
