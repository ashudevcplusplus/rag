import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderOpen,
  Upload,
  Search,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  FileText,
  ChevronDown,
  MessageSquare,
  Command,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { Button, Avatar, Modal } from '@rag/ui';
import { useAuthStore } from '../store/auth.store';
import { useAppStore } from '../store/app.store';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, shortcut: 'D' },
  { name: 'Projects', href: '/projects', icon: FolderOpen, shortcut: 'P' },
  { name: 'Chat', href: '/chat', icon: MessageSquare, shortcut: 'C' },
  { name: 'Upload', href: '/upload', icon: Upload, shortcut: 'U' },
  { name: 'Search', href: '/search', icon: Search, shortcut: 'S' },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function DashboardLayout() {
  const navigate = useNavigate();
  const { user, company, logout } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Cmd/Ctrl + K - Quick search
      if (modKey && e.key === 'k') {
        e.preventDefault();
        navigate('/search');
        return;
      }

      // Cmd/Ctrl + / - Show shortcuts help
      if (modKey && e.key === '/') {
        e.preventDefault();
        setShowShortcuts(true);
        return;
      }

      // Alt + letter shortcuts for navigation
      if (e.altKey && !modKey) {
        const key = e.key.toUpperCase();
        const navItem = navigation.find((item) => item.shortcut === key);
        if (navItem) {
          e.preventDefault();
          navigate(navItem.href);
        }
      }

      // Escape to close modals/menus
      if (e.key === 'Escape') {
        setUserMenuOpen(false);
        setShowShortcuts(false);
      }
    },
    [navigate]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-gray-900">RAG Portal</span>
            </div>
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-1 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Company info */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Company</p>
            <p className="text-sm font-medium text-gray-900 truncate">
              {company?.name || 'Unknown Company'}
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </div>
                {item.shortcut && (
                  <span className="hidden group-hover:inline-flex items-center gap-0.5 text-xs text-gray-400">
                    <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">Alt</kbd>
                    <span>+</span>
                    <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">{item.shortcut}</kbd>
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* User menu */}
          <div className="p-3 border-t border-gray-200">
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Avatar
                  name={user ? `${user.firstName} ${user.lastName}` : 'User'}
                  size="sm"
                />
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user ? `${user.firstName} ${user.lastName}` : 'User'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <Menu className="w-5 h-5 text-gray-500" />
            </button>

            <div className="flex-1" />

            <div className="flex items-center gap-3">
              {/* Quick Search */}
              <button
                onClick={() => navigate('/search')}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Search className="w-4 h-4" />
                <span>Search...</span>
                <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-white rounded border border-gray-200">
                  ⌘K
                </kbd>
              </button>

              <Button variant="outline" size="sm" onClick={() => navigate('/chat')}>
                <MessageSquare className="w-4 h-4" />
                Chat
              </Button>

              <Button variant="outline" size="sm" onClick={() => navigate('/upload')}>
                <Upload className="w-4 h-4" />
                Upload
              </Button>

              <button
                onClick={() => setShowShortcuts(true)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Keyboard shortcuts (⌘/)"
              >
                <Command className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Keyboard Shortcuts Modal */}
      <Modal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
        title="Keyboard Shortcuts"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Navigation</h4>
            <div className="space-y-2">
              {navigation
                .filter((item) => item.shortcut)
                .map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-sm text-gray-600">{item.name}</span>
                    <div className="flex items-center gap-1">
                      <kbd className="px-2 py-1 text-xs font-medium bg-gray-100 rounded border border-gray-200">
                        Alt
                      </kbd>
                      <span className="text-gray-400">+</span>
                      <kbd className="px-2 py-1 text-xs font-medium bg-gray-100 rounded border border-gray-200">
                        {item.shortcut}
                      </kbd>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Global</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-gray-600">Quick Search</span>
                <div className="flex items-center gap-1">
                  <kbd className="px-2 py-1 text-xs font-medium bg-gray-100 rounded border border-gray-200">
                    ⌘
                  </kbd>
                  <span className="text-gray-400">+</span>
                  <kbd className="px-2 py-1 text-xs font-medium bg-gray-100 rounded border border-gray-200">
                    K
                  </kbd>
                </div>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-gray-600">Show Shortcuts</span>
                <div className="flex items-center gap-1">
                  <kbd className="px-2 py-1 text-xs font-medium bg-gray-100 rounded border border-gray-200">
                    ⌘
                  </kbd>
                  <span className="text-gray-400">+</span>
                  <kbd className="px-2 py-1 text-xs font-medium bg-gray-100 rounded border border-gray-200">
                    /
                  </kbd>
                </div>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-gray-600">Close Modal</span>
                <kbd className="px-2 py-1 text-xs font-medium bg-gray-100 rounded border border-gray-200">
                  Esc
                </kbd>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">
            On Windows/Linux, use Ctrl instead of ⌘
          </p>
        </div>
      </Modal>
    </div>
  );
}
