import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { createApiClient } from '../lib/api';
import type { Project } from '@repo/shared';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Projects() {
  const { config } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const fetchProjects = async () => {
    if (!config) return;
    try {
      const api = createApiClient(config);
      const res = await api.get(`/v1/companies/${config.companyId}/projects`);
      setProjects(res.data.projects || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config || !newProjectName.trim()) return;

    try {
      const api = createApiClient(config);
      await api.post(`/v1/companies/${config.companyId}/projects`, {
        name: newProjectName,
        slug: newProjectName.toLowerCase().replace(/\s+/g, '-'),
        ownerId: '507f1f77bcf86cd799439011' // Hardcoded as per legacy
      });
      setNewProjectName('');
      setIsCreating(false);
      fetchProjects();
    } catch (e) {
      console.error('Failed to create project', e);
      alert('Failed to create project');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Projects</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {isCreating && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <form onSubmit={handleCreate} className="flex gap-4">
            <input
              type="text"
              placeholder="Project Name"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              autoFocus
            />
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link 
              key={project._id} 
              to={`/projects/${project._id}`}
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow block"
            >
              <h3 className="font-semibold text-lg text-gray-900">{project.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{project.description || 'No description'}</p>
              <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
                <span>📄 {project.fileCount || 0} files</span>
                <span>🔍 {project.vectorCount || 0} vectors</span>
              </div>
            </Link>
          ))}
          {projects.length === 0 && !isCreating && (
            <div className="col-span-full text-center py-12 text-gray-500">
              No projects found. Create one to get started.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
