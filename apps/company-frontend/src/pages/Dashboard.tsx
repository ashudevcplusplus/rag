import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { createApiClient } from '../lib/api';

export default function Dashboard() {
  const { config } = useAuth();
  const [stats, setStats] = useState<{ projectCount: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!config) return;
      try {
        const api = createApiClient(config);
        // Assuming we can fetch project count
        const res = await api.get(`/v1/companies/${config.companyId}/projects?limit=1`);
        setStats({
          projectCount: res.data.pagination?.total || 0,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [config]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500">Connection Status</h3>
          <p className="mt-2 text-3xl font-semibold text-green-600">Connected</p>
          <p className="mt-1 text-sm text-gray-500">{config?.apiUrl}</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500">Total Projects</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {loading ? '...' : stats?.projectCount || 0}
          </p>
        </div>
      </div>
    </div>
  );
}
