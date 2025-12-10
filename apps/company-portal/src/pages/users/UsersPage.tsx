import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Search, MoreVertical, Trash2, Edit, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Modal,
  ModalFooter,
  EmptyState,
  Avatar,
  Badge,
} from '@rag/ui';
import { usersApi } from '@rag/api-client';
import { formatRelativeTime } from '@rag/utils';
import { UserRole } from '@rag/types';
import type { User } from '@rag/types';
import { useAuthStore } from '../../store/auth.store';
import { useAppStore } from '../../store/app.store';

const roleColors: Record<UserRole, 'purple' | 'primary' | 'default' | 'info'> = {
  OWNER: 'purple',
  ADMIN: 'primary',
  MEMBER: 'default',
  VIEWER: 'info',
};

export function UsersPage() {
  const queryClient = useQueryClient();
  const { companyId, user: currentUser } = useAuthStore();
  const { addActivity } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    role: UserRole.MEMBER,
  });

  // Fetch users
  const { data, isLoading } = useQuery({
    queryKey: ['users', companyId],
    queryFn: () => usersApi.list(companyId!),
    enabled: !!companyId,
  });

  // Create user mutation
  const createMutation = useMutation({
    mutationFn: (userData: typeof formData) =>
      usersApi.create(companyId!, userData),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsCreateModalOpen(false);
      setFormData({
        email: '',
        firstName: '',
        lastName: '',
        password: '',
        role: UserRole.MEMBER,
      });
      addActivity({ text: `Added user: ${response.user.email}`, type: 'user' });
      toast.success('User created successfully!');
    },
    onError: (error: unknown) => {
      const apiError = error as { error?: string; message?: string };
      const errorMessage = apiError?.error || apiError?.message || 'Failed to create user';
      toast.error(errorMessage);
      console.error('Create user error:', error);
    },
  });

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: (userId: string) => usersApi.delete(companyId!, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
      addActivity({ text: `Removed user: ${selectedUser?.email}`, type: 'user' });
      toast.success('User deleted successfully!');
    },
    onError: (error: unknown) => {
      const apiError = error as { error?: string; message?: string };
      const errorMessage = apiError?.error || apiError?.message || 'Failed to delete user';
      toast.error(errorMessage);
      console.error('Delete user error:', error);
    },
  });

  const users = data?.users || [];
  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.lastName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.firstName) {
      toast.error('Please fill in all required fields');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleDeleteUser = () => {
    if (selectedUser) {
      deleteMutation.mutate(selectedUser._id);
    }
  };

  const canManageUsers =
    currentUser?.role === 'OWNER' || currentUser?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600 mt-1">
            Manage team members and their access
          </p>
        </div>
        {canManageUsers && (
          <Button
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Add User
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="max-w-md">
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="w-5 h-5" />}
        />
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse h-16 bg-gray-100 rounded-lg" />
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <EmptyState
              icon={<Users className="w-12 h-12" />}
              title={searchQuery ? 'No users found' : 'No team members yet'}
              description={
                searchQuery
                  ? 'Try a different search term'
                  : 'Add your first team member to get started'
              }
              action={
                canManageUsers &&
                !searchQuery && (
                  <Button onClick={() => setIsCreateModalOpen(true)}>
                    Add User
                  </Button>
                )
              }
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredUsers.map((user) => (
                <div
                  key={user._id}
                  className="flex items-center justify-between py-4 hover:bg-gray-50 -mx-6 px-6 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <Avatar
                      name={`${user.firstName} ${user.lastName}`}
                      size="md"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </h4>
                        {user._id === currentUser?._id && (
                          <Badge variant="info">You</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <Badge variant={roleColors[user.role]}>
                      <Shield className="w-3 h-3 mr-1" />
                      {user.role}
                    </Badge>

                    <span className="text-sm text-gray-500 hidden sm:block">
                      {user.lastLoginAt
                        ? `Last seen ${formatRelativeTime(user.lastLoginAt)}`
                        : 'Never logged in'}
                    </span>

                    <Badge variant={user.isActive ? 'success' : 'default'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>

                    {canManageUsers && user._id !== currentUser?._id && (
                      <div className="relative">
                        <button
                          onClick={() =>
                            setActiveMenu(activeMenu === user._id ? null : user._id)
                          }
                          className="p-1.5 rounded-lg hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-500" />
                        </button>

                        {activeMenu === user._id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActiveMenu(null)}
                            />
                            <div className="absolute right-0 top-8 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                              <button
                                onClick={() => {
                                  // Edit user functionality
                                  setActiveMenu(null);
                                  toast.success('Edit user coming soon');
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Edit className="w-4 h-4" />
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsDeleteModalOpen(true);
                                  setActiveMenu(null);
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                                Remove
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add Team Member"
        description="Invite a new user to your company"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={formData.firstName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, firstName: e.target.value }))
              }
              placeholder="John"
              required
            />
            <Input
              label="Last Name"
              value={formData.lastName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, lastName: e.target.value }))
              }
              placeholder="Doe"
            />
          </div>

          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, email: e.target.value }))
            }
            placeholder="john@company.com"
            required
          />

          <Input
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, password: e.target.value }))
            }
            placeholder="Minimum 8 characters"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              value={formData.role}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  role: e.target.value as UserRole,
                }))
              }
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
              <option value="VIEWER">Viewer</option>
            </select>
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
              Add User
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Remove User"
        size="sm"
      >
        <p className="text-gray-600">
          Are you sure you want to remove{' '}
          <strong>
            {selectedUser?.firstName} {selectedUser?.lastName}
          </strong>{' '}
          from your team? They will lose access to all projects and documents.
        </p>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteUser}
            isLoading={deleteMutation.isPending}
          >
            Remove User
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
