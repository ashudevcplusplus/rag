import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Settings,
  Building,
  Key,
  Bell,
  Trash2,
  RefreshCw,
  Shield,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Badge,
} from '@rag/ui';
import { companyApi, checkHealth } from '@rag/api-client';
import { formatBytes } from '@rag/utils';
import { useAuthStore } from '../../store/auth.store';
import { useAppStore } from '../../store/app.store';

export function SettingsPage() {
  const { user, company, companyId, apiKey, apiUrl, setApiUrl, logout } =
    useAuthStore();
  const { addActivity, clearActivities } = useAppStore();

  const [newApiUrl, setNewApiUrl] = useState(apiUrl);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Clear cache mutation
  const clearCacheMutation = useMutation({
    mutationFn: () => companyApi.clearCache(companyId!),
    onSuccess: (response) => {
      addActivity({
        text: `Cleared cache (${response.keysDeleted} keys)`,
        type: 'system',
      });
      toast.success(`Cache cleared! ${response.keysDeleted} keys deleted.`);
    },
    onError: () => {
      toast.error('Failed to clear cache');
    },
  });

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    try {
      await checkHealth();
      toast.success('Connection successful!');
    } catch (error) {
      toast.error('Connection failed. Check your API URL.');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleUpdateApiUrl = () => {
    setApiUrl(newApiUrl);
    toast.success('API URL updated');
    addActivity({ text: 'Updated API URL', type: 'system' });
  };

  const handleClearCache = () => {
    if (confirm('Are you sure you want to clear all cached search results?')) {
      clearCacheMutation.mutate();
    }
  };

  const handleClearActivities = () => {
    if (confirm('Are you sure you want to clear all activity history?')) {
      clearActivities();
      toast.success('Activity history cleared');
    }
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to sign out?')) {
      logout();
      toast.success('Signed out successfully');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">
          Manage your account and application settings
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Company Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-gray-500" />
              <CardTitle>Company Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-gray-500">Company Name</label>
              <p className="font-medium text-gray-900">{company?.name || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Company ID</label>
              <p className="font-mono text-sm text-gray-700">{companyId || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Subscription</label>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="purple">{company?.subscriptionTier || 'FREE'}</Badge>
                <Badge variant={company?.status === 'ACTIVE' ? 'success' : 'default'}>
                  {company?.status || 'UNKNOWN'}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-500">Storage Used</label>
              <p className="font-medium text-gray-900">
                {formatBytes(company?.storageUsed || 0)} of{' '}
                {formatBytes(company?.storageLimit || 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* User Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-gray-500" />
              <CardTitle>Your Profile</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-gray-500">Name</label>
              <p className="font-medium text-gray-900">
                {user?.firstName} {user?.lastName}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Email</label>
              <p className="text-gray-700">{user?.email || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Role</label>
              <div className="mt-1">
                <Badge variant="primary">{user?.role || 'MEMBER'}</Badge>
              </div>
            </div>
            <Button variant="danger" onClick={handleLogout} className="w-full">
              Sign Out
            </Button>
          </CardContent>
        </Card>

        {/* API Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-gray-500" />
              <CardTitle>API Configuration</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="API URL"
              value={newApiUrl}
              onChange={(e) => setNewApiUrl(e.target.value)}
              placeholder="http://localhost:8000"
            />

            <div>
              <label className="text-sm text-gray-500">API Key</label>
              <p className="font-mono text-sm text-gray-700 bg-gray-100 px-3 py-2 rounded-lg mt-1">
                {apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : 'Not set'}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleTestConnection}
                isLoading={isTestingConnection}
                className="flex-1"
              >
                Test Connection
              </Button>
              <Button onClick={handleUpdateApiUrl} className="flex-1">
                Update URL
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Cache & Data */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-gray-500" />
              <CardTitle>Cache & Data</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-1">Search Cache</h4>
              <p className="text-sm text-gray-600 mb-3">
                Clear cached search results to ensure fresh data
              </p>
              <Button
                variant="outline"
                onClick={handleClearCache}
                isLoading={clearCacheMutation.isPending}
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                Clear Search Cache
              </Button>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-1">Activity History</h4>
              <p className="text-sm text-gray-600 mb-3">
                Clear your local activity history
              </p>
              <Button
                variant="outline"
                onClick={handleClearActivities}
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                Clear Activity
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-gray-500" />
              <CardTitle>Notifications</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
                <div>
                  <h4 className="font-medium text-gray-900">Email Notifications</h4>
                  <p className="text-sm text-gray-600">
                    Receive updates about processing status
                  </p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked={company?.settings?.notifications?.email}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
                <div>
                  <h4 className="font-medium text-gray-900">Slack Integration</h4>
                  <p className="text-sm text-gray-600">
                    Get notifications in Slack
                  </p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked={company?.settings?.notifications?.slack}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </label>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
