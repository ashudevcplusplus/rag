import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, Search, MoreVertical, Trash2, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Card,
  CardContent,
  Button,
  Input,
  Modal,
  ModalFooter,
  EmptyState,
  StatusBadge,
} from '@rag/ui';
import { Textarea } from '@rag/ui';
import { projectsApi } from '@rag/api-client';
import { formatRelativeTime, slugify } from '@rag/utils';
import type { Project, CreateProjectDTO } from '@rag/types';
import { useAuthStore } from '../../store/auth.store';
import { useAppStore } from '../../store/app.store';

export function ProjectsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { companyId } = useAuthStore();
  const { addActivity } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateProjectDTO>({
    name: '',
    slug: '',
    description: '',
  });

  // Fetch projects
  const { data, isLoading } = useQuery({
    queryKey: ['projects', companyId],
    queryFn: () => projectsApi.list(companyId!),
    enabled: !!companyId,
  });

  // Create project mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateProjectDTO) => projectsApi.create(companyId!, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsCreateModalOpen(false);
      setFormData({ name: '', slug: '', description: '' });
      addActivity({ text: `Created project: ${response.project.name}`, type: 'project' });
      toast.success('Project created successfully!');
    },
    onError: (error: unknown) => {
      const apiError = error as { error?: string; message?: string };
      const errorMessage = apiError?.error || apiError?.message || 'Failed to create project';
      toast.error(errorMessage);
      console.error('Create project error:', error);
    },
  });

  // Delete project mutation
  const deleteMutation = useMutation({
    mutationFn: (projectId: string) => projectsApi.delete(companyId!, projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsDeleteModalOpen(false);
      setSelectedProject(null);
      addActivity({ text: `Deleted project: ${selectedProject?.name}`, type: 'project' });
      toast.success('Project deleted successfully!');
    },
    onError: (error: unknown) => {
      const apiError = error as { error?: string; message?: string };
      const errorMessage = apiError?.error || apiError?.message || 'Failed to delete project';
      toast.error(errorMessage);
      console.error('Delete project error:', error);
    },
  });

  const projects = data?.projects || [];
  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Project name is required');
      return;
    }

    const slug = formData.slug || slugify(formData.name);
    
    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      toast.error('Slug must contain only lowercase letters, numbers, and hyphens');
      return;
    }

    if (slug.length < 1) {
      toast.error('A valid slug is required');
      return;
    }

    createMutation.mutate({
      name: formData.name.trim(),
      slug,
      description: formData.description?.trim(),
    });
  };

  const handleDeleteProject = () => {
    if (selectedProject) {
      deleteMutation.mutate(selectedProject._id);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name,
      slug: slugify(name),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600 mt-1">
            Organize your documents into projects
          </p>
        </div>
        <Button
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsCreateModalOpen(true)}
        >
          New Project
        </Button>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <Input
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="w-5 h-5" />}
        />
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-32 bg-gray-100 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={<FolderOpen className="w-12 h-12" />}
              title={searchQuery ? 'No projects found' : 'No projects yet'}
              description={
                searchQuery
                  ? 'Try a different search term'
                  : 'Create your first project to get started'
              }
              action={
                !searchQuery && (
                  <Button onClick={() => setIsCreateModalOpen(true)}>
                    Create Project
                  </Button>
                )
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card
              key={project._id}
              className="hover:border-blue-200 hover:shadow-md transition-all cursor-pointer group"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      backgroundColor: project.color
                        ? `${project.color}20`
                        : '#dbeafe',
                      color: project.color || '#2563eb',
                    }}
                    onClick={() => navigate(`/projects/${project._id}`)}
                  >
                    <FolderOpen className="w-6 h-6" />
                  </div>

                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenu(activeMenu === project._id ? null : project._id);
                      }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-500" />
                    </button>

                    {activeMenu === project._id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setActiveMenu(null)}
                        />
                        <div className="absolute right-0 top-8 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/projects/${project._id}`);
                              setActiveMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Edit className="w-4 h-4" />
                            View Details
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProject(project);
                              setIsDeleteModalOpen(true);
                              setActiveMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div
                  className="mt-4"
                  onClick={() => navigate(`/projects/${project._id}`)}
                >
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {project.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                    {project.description || 'No description'}
                  </p>
                </div>

                <div
                  className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between"
                  onClick={() => navigate(`/projects/${project._id}`)}
                >
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{project.fileCount || 0} files</span>
                    <span>{project.vectorCount || 0} vectors</span>
                  </div>
                  <StatusBadge status={project.status} />
                </div>

                <p
                  className="text-xs text-gray-400 mt-3"
                  onClick={() => navigate(`/projects/${project._id}`)}
                >
                  Created {formatRelativeTime(project.createdAt)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Project"
        description="Create a project to organize your documents"
      >
        <form onSubmit={handleCreateProject} className="space-y-4">
          <Input
            label="Project Name"
            value={formData.name}
            onChange={handleNameChange}
            placeholder="My Project"
            required
          />

          <Input
            label="Slug"
            value={formData.slug}
            onChange={(e) => {
              // Only allow valid slug characters
              const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
              setFormData((prev) => ({ ...prev, slug: value }));
            }}
            placeholder="my-project"
            hint="URL-friendly identifier (lowercase letters, numbers, hyphens)"
            error={
              formData.slug && !/^[a-z0-9-]*$/.test(formData.slug)
                ? 'Only lowercase letters, numbers, and hyphens allowed'
                : undefined
            }
          />

          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="Project description..."
            rows={3}
          />

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Create Project
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Project"
        size="sm"
      >
        <p className="text-gray-600">
          Are you sure you want to delete <strong>{selectedProject?.name}</strong>?
          This will also delete all files and vectors associated with this project.
        </p>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteProject}
            isLoading={deleteMutation.isPending}
          >
            Delete Project
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
