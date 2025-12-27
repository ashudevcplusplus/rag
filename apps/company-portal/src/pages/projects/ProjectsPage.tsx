import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, Search, MoreVertical, Trash2, Edit, Archive, RotateCcw, Filter, Settings2, Lightbulb, Layers, GitMerge } from 'lucide-react';
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
  Textarea,
  SelectWithDescription,
} from '@rag/ui';
import { projectsApi } from '@rag/api-client';
import { formatRelativeTime, slugify } from '@rag/utils';
import type { Project, CreateProjectDTO, UpdateProjectDTO, ProjectSettings } from '@rag/types';
import { ChunkSizePreset, CHUNK_SIZE_PRESETS, getChunkPresetOptions } from '@rag/types';
import { useAuthStore } from '../../store/auth.store';
import { useAppStore } from '../../store/app.store';

const PROJECT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

export function ProjectsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { companyId } = useAuthStore();
  const { addActivity } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'ARCHIVED'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateProjectDTO & { settings?: ProjectSettings }>({
    name: '',
    slug: '',
    description: '',
    settings: {
      chunkSizePreset: ChunkSizePreset.GENERAL,
    },
  });

  const [editFormData, setEditFormData] = useState<UpdateProjectDTO & { color?: string; settings?: ProjectSettings }>({
    name: '',
    description: '',
    color: '',
    settings: {
      chunkSizePreset: ChunkSizePreset.GENERAL,
    },
  });

  // Convert chunk presets to select options
  const chunkPresetOptions = getChunkPresetOptions().map(preset => ({
    value: preset.preset,
    label: preset.label,
    description: preset.description,
  }));

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
      setFormData({ 
        name: '', 
        slug: '', 
        description: '',
        settings: { chunkSizePreset: ChunkSizePreset.GENERAL },
      });
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

  // Update project mutation
  const updateMutation = useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: UpdateProjectDTO }) =>
      projectsApi.update(companyId!, projectId, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsEditModalOpen(false);
      setSelectedProject(null);
      addActivity({ text: `Updated project: ${response.project.name}`, type: 'project' });
      toast.success('Project updated successfully!');
    },
    onError: (error: unknown) => {
      const apiError = error as { error?: string; message?: string };
      const errorMessage = apiError?.error || apiError?.message || 'Failed to update project';
      toast.error(errorMessage);
      console.error('Update project error:', error);
    },
  });

  // Archive project mutation
  const archiveMutation = useMutation({
    mutationFn: ({ projectId, archive }: { projectId: string; archive: boolean }) =>
      projectsApi.archive(companyId!, projectId, archive),
    onSuccess: (response, { archive }) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      addActivity({
        text: `${archive ? 'Archived' : 'Restored'} project`,
        type: 'project',
      });
      toast.success(response.message);
    },
    onError: (error: unknown) => {
      const apiError = error as { error?: string; message?: string };
      const errorMessage = apiError?.error || apiError?.message || 'Failed to archive project';
      toast.error(errorMessage);
      console.error('Archive project error:', error);
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
  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeCount = projects.filter((p) => p.status === 'ACTIVE').length;
  const archivedCount = projects.filter((p) => p.status === 'ARCHIVED').length;

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

    // Get chunk config from preset
    const preset = formData.settings?.chunkSizePreset || ChunkSizePreset.GENERAL;
    const chunkConfig = CHUNK_SIZE_PRESETS[preset];

    createMutation.mutate({
      name: formData.name.trim(),
      slug,
      description: formData.description?.trim(),
      settings: {
        chunkSizePreset: preset,
        chunkSize: chunkConfig.chunkSize,
        chunkOverlap: chunkConfig.chunkOverlap,
      },
    } as CreateProjectDTO);
  };

  const handleDeleteProject = () => {
    if (selectedProject) {
      deleteMutation.mutate(selectedProject._id);
    }
  };

  const handleEditProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProject && editFormData.name?.trim()) {
      // Get chunk config from preset
      const preset = editFormData.settings?.chunkSizePreset || ChunkSizePreset.GENERAL;
      const chunkConfig = CHUNK_SIZE_PRESETS[preset];

      updateMutation.mutate({
        projectId: selectedProject._id,
        data: {
          name: editFormData.name.trim(),
          description: editFormData.description?.trim(),
          color: editFormData.color,
          settings: {
            chunkSizePreset: preset,
            chunkSize: chunkConfig.chunkSize,
            chunkOverlap: chunkConfig.chunkOverlap,
          },
        },
      });
    }
  };

  const openEditModal = (project: Project) => {
    setSelectedProject(project);
    setEditFormData({
      name: project.name,
      description: project.description || '',
      color: project.color || PROJECT_COLORS[0],
      settings: {
        chunkSizePreset: project.settings?.chunkSizePreset || ChunkSizePreset.GENERAL,
        chunkSize: project.settings?.chunkSize,
        chunkOverlap: project.settings?.chunkOverlap,
      },
    });
    setIsEditModalOpen(true);
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

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="max-w-md flex-1">
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-5 h-5" />}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              All ({projects.length})
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors border-l border-gray-300 ${
                statusFilter === 'ACTIVE'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setStatusFilter('ARCHIVED')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors border-l border-gray-300 ${
                statusFilter === 'ARCHIVED'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Archived ({archivedCount})
            </button>
          </div>
        </div>
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
                        <div className="absolute right-0 top-8 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/projects/${project._id}`);
                              setActiveMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <FolderOpen className="w-4 h-4" />
                            View Details
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(project);
                              setActiveMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Edit className="w-4 h-4" />
                            Edit Project
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const shouldArchive = project.status !== 'ARCHIVED';
                              archiveMutation.mutate({
                                projectId: project._id,
                                archive: shouldArchive,
                              });
                              setActiveMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            {project.status === 'ARCHIVED' ? (
                              <>
                                <RotateCcw className="w-4 h-4" />
                                Restore Project
                              </>
                            ) : (
                              <>
                                <Archive className="w-4 h-4" />
                                Archive Project
                              </>
                            )}
                          </button>
                          <div className="border-t border-gray-100 my-1" />
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

          {/* Chunk Size Preset */}
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-purple-100 rounded-lg">
                  <Settings2 className="w-4 h-4 text-purple-600" />
                </div>
                <span className="text-sm font-semibold text-gray-900">Indexing Settings</span>
              </div>
            </div>
            
            <SelectWithDescription
              label="Document Type"
              value={formData.settings?.chunkSizePreset || ChunkSizePreset.GENERAL}
              onChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  settings: {
                    ...prev.settings,
                    chunkSizePreset: value as ChunkSizePreset,
                  },
                }))
              }
              options={chunkPresetOptions}
              showDescription={false}
            />
            
            {/* Chunk Size Values Display - Improved UI */}
            {(() => {
              const preset = formData.settings?.chunkSizePreset || ChunkSizePreset.GENERAL;
              const config = CHUNK_SIZE_PRESETS[preset];
              return (
                <div className="mt-4 p-4 bg-gradient-to-br from-slate-50 to-gray-100 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      {/* Chunk Size */}
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Layers className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">Chunk Size</div>
                          <div className="text-lg font-bold text-gray-900">{config.chunkSize.toLocaleString()} <span className="text-sm font-normal text-gray-500">chars</span></div>
                        </div>
                      </div>
                      
                      {/* Divider */}
                      <div className="w-px h-10 bg-gray-300"></div>
                      
                      {/* Overlap */}
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <GitMerge className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">Overlap</div>
                          <div className="text-lg font-bold text-gray-900">{config.chunkOverlap.toLocaleString()} <span className="text-sm font-normal text-gray-500">chars</span></div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Info Button with Tooltip */}
                    <div className="relative group">
                      <button
                        type="button"
                        className="p-2.5 bg-amber-100 hover:bg-amber-200 rounded-full text-amber-600 transition-all hover:scale-110"
                        title="Learn more"
                      >
                        <Lightbulb className="w-5 h-5" />
                      </button>
                      <div className="absolute right-0 bottom-full mb-3 w-80 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <div className="p-4 bg-white rounded-xl shadow-xl border border-gray-200">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 bg-amber-100 rounded-lg">
                              <Lightbulb className="w-4 h-4 text-amber-600" />
                            </div>
                            <span className="font-semibold text-gray-900">{config.label}</span>
                          </div>
                          <p className="text-sm text-gray-600 mb-4">{config.description}</p>
                          <div className="space-y-3 pt-3 border-t border-gray-100">
                            <div className="flex items-start gap-3">
                              <div className="p-1 bg-blue-100 rounded">
                                <Layers className="w-3 h-3 text-blue-600" />
                              </div>
                              <div>
                                <div className="text-xs font-medium text-gray-900">Chunk Size</div>
                                <div className="text-xs text-gray-500">Maximum characters per text segment for embedding</div>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="p-1 bg-green-100 rounded">
                                <GitMerge className="w-3 h-3 text-green-600" />
                              </div>
                              <div>
                                <div className="text-xs font-medium text-gray-900">Overlap</div>
                                <div className="text-xs text-gray-500">Characters shared between chunks for context continuity</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="absolute right-4 top-full -mt-2 border-8 border-transparent border-t-white drop-shadow-sm"></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

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

      {/* Edit Project Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Project"
        description="Update project details"
      >
        <form onSubmit={handleEditProject} className="space-y-4">
          <Input
            label="Project Name"
            value={editFormData.name}
            onChange={(e) =>
              setEditFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="My Project"
            required
          />

          <Textarea
            label="Description"
            value={editFormData.description}
            onChange={(e) =>
              setEditFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="Project description..."
            rows={3}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <div className="flex gap-2">
              {PROJECT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() =>
                    setEditFormData((prev) => ({ ...prev, color }))
                  }
                  className={`w-8 h-8 rounded-full transition-all ${
                    editFormData.color === color
                      ? 'ring-2 ring-offset-2 ring-blue-500 scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Chunk Size Preset */}
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-purple-100 rounded-lg">
                  <Settings2 className="w-4 h-4 text-purple-600" />
                </div>
                <span className="text-sm font-semibold text-gray-900">Indexing Settings</span>
              </div>
            </div>
            
            <SelectWithDescription
              label="Document Type"
              value={editFormData.settings?.chunkSizePreset || ChunkSizePreset.GENERAL}
              onChange={(value) =>
                setEditFormData((prev) => ({
                  ...prev,
                  settings: {
                    ...prev.settings,
                    chunkSizePreset: value as ChunkSizePreset,
                  },
                }))
              }
              options={chunkPresetOptions}
              showDescription={false}
            />
            
            {/* Chunk Size Values Display - Improved UI */}
            {(() => {
              const preset = editFormData.settings?.chunkSizePreset || ChunkSizePreset.GENERAL;
              const config = CHUNK_SIZE_PRESETS[preset];
              return (
                <div className="mt-4 p-4 bg-gradient-to-br from-slate-50 to-gray-100 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      {/* Chunk Size */}
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Layers className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">Chunk Size</div>
                          <div className="text-lg font-bold text-gray-900">{config.chunkSize.toLocaleString()} <span className="text-sm font-normal text-gray-500">chars</span></div>
                        </div>
                      </div>
                      
                      {/* Divider */}
                      <div className="w-px h-10 bg-gray-300"></div>
                      
                      {/* Overlap */}
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <GitMerge className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">Overlap</div>
                          <div className="text-lg font-bold text-gray-900">{config.chunkOverlap.toLocaleString()} <span className="text-sm font-normal text-gray-500">chars</span></div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Info Button with Tooltip */}
                    <div className="relative group">
                      <button
                        type="button"
                        className="p-2.5 bg-amber-100 hover:bg-amber-200 rounded-full text-amber-600 transition-all hover:scale-110"
                        title="Learn more"
                      >
                        <Lightbulb className="w-5 h-5" />
                      </button>
                      <div className="absolute right-0 bottom-full mb-3 w-80 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <div className="p-4 bg-white rounded-xl shadow-xl border border-gray-200">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 bg-amber-100 rounded-lg">
                              <Lightbulb className="w-4 h-4 text-amber-600" />
                            </div>
                            <span className="font-semibold text-gray-900">{config.label}</span>
                          </div>
                          <p className="text-sm text-gray-600 mb-4">{config.description}</p>
                          <div className="space-y-3 pt-3 border-t border-gray-100">
                            <div className="flex items-start gap-3">
                              <div className="p-1 bg-blue-100 rounded">
                                <Layers className="w-3 h-3 text-blue-600" />
                              </div>
                              <div>
                                <div className="text-xs font-medium text-gray-900">Chunk Size</div>
                                <div className="text-xs text-gray-500">Maximum characters per text segment for embedding</div>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="p-1 bg-green-100 rounded">
                                <GitMerge className="w-3 h-3 text-green-600" />
                              </div>
                              <div>
                                <div className="text-xs font-medium text-gray-900">Overlap</div>
                                <div className="text-xs text-gray-500">Characters shared between chunks for context continuity</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="absolute right-4 top-full -mt-2 border-8 border-transparent border-t-white drop-shadow-sm"></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Warning for edit mode */}
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
                      <span className="text-amber-500">⚠️</span>
                      <span>Changes only affect newly uploaded files. Reindex existing files to apply new settings.</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={updateMutation.isPending}>
              Save Changes
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
