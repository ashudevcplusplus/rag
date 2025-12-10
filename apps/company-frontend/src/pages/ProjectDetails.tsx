import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createApiClient } from '../lib/api';
import type { Project } from '@repo/shared';
import { Upload, ArrowLeft, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function ProjectDetails() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { config } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchProject = async () => {
    if (!config || !projectId) return;
    try {
      const api = createApiClient(config);
      const [projRes, filesRes] = await Promise.all([
        api.get(`/v1/companies/${config.companyId}/projects/${projectId}`),
        api.get(`/v1/companies/${config.companyId}/projects/${projectId}/files`)
      ]);
      setProject(projRes.data.project);
      setFiles(filesRes.data.files || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, config]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !config || !projectId) return;
    
    setUploading(true);
    const formData = new FormData();
    Array.from(e.target.files).forEach(file => {
      formData.append('files', file);
    });
    formData.append('projectId', projectId);

    try {
      const api = createApiClient(config);
      // Remove default Content-Type to let browser set boundary
      delete api.defaults.headers['Content-Type'];
      
      await api.post(`/v1/companies/${config.companyId}/uploads`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // Refresh
      fetchProject();
      alert('Upload started');
    } catch (e) {
      console.error(e);
      alert('Upload failed');
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!project) return <div>Project not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button onClick={() => navigate('/projects')} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{project.name}</h2>
          <p className="text-gray-500">{project.description}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Files ({files.length})</h3>
          <div className="relative">
            <input
              type="file"
              multiple
              onChange={handleUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={uploading}
            />
            <button className={`flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 ${uploading ? 'opacity-70' : ''}`}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span>{uploading ? 'Uploading...' : 'Upload Files'}</span>
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {files.map((file: any) => (
            <div key={file._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">{file.originalFilename}</p>
                  <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {file.processingStatus === 'completed' ? (
                  <span className="flex items-center text-green-600 text-sm">
                    <CheckCircle className="w-4 h-4 mr-1" /> Processed
                  </span>
                ) : file.processingStatus === 'failed' ? (
                  <span className="flex items-center text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4 mr-1" /> Failed
                  </span>
                ) : (
                  <span className="flex items-center text-yellow-600 text-sm">
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Processing
                  </span>
                )}
              </div>
            </div>
          ))}
          {files.length === 0 && (
            <p className="text-center py-8 text-gray-500">No files uploaded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
