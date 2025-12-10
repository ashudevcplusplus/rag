import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Input, Card, CardContent } from '@rag/ui';
import { checkHealth } from '@rag/api-client';
import { useAuthStore } from '../../store/auth.store';
import { useAppStore } from '../../store/app.store';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, setApiUrl, apiUrl } = useAuthStore();
  const { addActivity } = useAppStore();

  const [formData, setFormData] = useState({
    apiUrl: apiUrl || 'http://localhost:8000',
    apiKey: '',
    companyId: '',
    companyName: '',
    email: '',
    firstName: '',
    lastName: '',
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'credentials' | 'profile'>('credentials');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleTestConnection = async () => {
    setIsLoading(true);
    try {
      await checkHealth();
      toast.success('Connection successful!');
    } catch (error) {
      toast.error('Failed to connect to API');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitCredentials = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.apiKey || !formData.companyId) {
      toast.error('Please enter API Key and Company ID');
      return;
    }

    setIsLoading(true);
    try {
      // Test connection with credentials
      setApiUrl(formData.apiUrl);
      await checkHealth();
      setStep('profile');
    } catch (error) {
      toast.error('Failed to connect. Check your API URL and credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.companyName || !formData.email || !formData.firstName) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      // Create mock user and company from form data
      // In a real app, this would call an auth endpoint
      const mockUser = {
        _id: formData.companyId + '_user',
        companyId: formData.companyId,
        email: formData.email,
        emailVerified: true,
        firstName: formData.firstName,
        lastName: formData.lastName || '',
        role: 'OWNER' as const,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockCompany = {
        _id: formData.companyId,
        name: formData.companyName,
        slug: formData.companyName.toLowerCase().replace(/\s+/g, '-'),
        email: formData.email,
        subscriptionTier: 'PROFESSIONAL' as const,
        storageLimit: 5368709120,
        storageUsed: 0,
        maxUsers: 10,
        maxProjects: 50,
        status: 'ACTIVE' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      login({
        user: mockUser,
        company: mockCompany,
        apiKey: formData.apiKey,
      });

      addActivity({
        text: `Logged in as ${formData.firstName} ${formData.lastName}`,
        type: 'user',
      });

      toast.success('Welcome to RAG Portal!');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Login failed. Please try again.');
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
          {step === 'credentials' ? (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Connect to API</h2>
                <p className="text-gray-600 mt-1">
                  Enter your API credentials to get started
                </p>
              </div>

              <form onSubmit={handleSubmitCredentials} className="space-y-5">
                <Input
                  label="API URL"
                  name="apiUrl"
                  value={formData.apiUrl}
                  onChange={handleChange}
                  placeholder="http://localhost:8000"
                />

                <Input
                  label="Company ID"
                  name="companyId"
                  value={formData.companyId}
                  onChange={handleChange}
                  placeholder="Enter your company ID"
                />

                <div>
                  <Input
                    label="API Key"
                    name="apiKey"
                    type={showApiKey ? 'text' : 'password'}
                    value={formData.apiKey}
                    onChange={handleChange}
                    placeholder="Enter your API key"
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="focus:outline-none"
                      >
                        {showApiKey ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    }
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestConnection}
                    isLoading={isLoading}
                    className="flex-1"
                  >
                    Test Connection
                  </Button>
                  <Button
                    type="submit"
                    isLoading={isLoading}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                    className="flex-1"
                  >
                    Continue
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Your Profile</h2>
                <p className="text-gray-600 mt-1">
                  Tell us a bit about yourself
                </p>
              </div>

              <form onSubmit={handleSubmitProfile} className="space-y-5">
                <Input
                  label="Company Name"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder="Your company name"
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="John"
                  />
                  <Input
                    label="Last Name"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Doe"
                  />
                </div>

                <Input
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john@company.com"
                />

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('credentials')}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    isLoading={isLoading}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                    className="flex-1"
                  >
                    Sign In
                  </Button>
                </div>
              </form>
            </>
          )}
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
