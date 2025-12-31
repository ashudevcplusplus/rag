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
  ChevronDown,
  MessageSquare,
  Command,
  RefreshCw,
  Sparkles,
  Bell,
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
  { name: 'Indexing', href: '/indexing', icon: RefreshCw, shortcut: 'I' },
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
    <div className="min-h-screen bg-mesh">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-surface-900/30 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white/80 backdrop-blur-xl border-r border-surface-100 transform transition-transform duration-300 ease-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-20 px-6 border-b border-surface-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-500 flex items-center justify-center shadow-lg shadow-primary-500/25">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold text-surface-900 font-display">RAG Portal</span>
                <span className="block text-xs text-surface-500 -mt-0.5">Enterprise AI</span>
              </div>
            </div>
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2 rounded-xl hover:bg-surface-100 transition-colors"
            >
              <X className="w-5 h-5 text-surface-500" />
            </button>
          </div>

          {/* Company info */}
          <div className="px-6 py-4 border-b border-surface-100">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-primary-50 to-accent-50 border border-primary-100">
              <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow-sm">
                <span className="text-lg font-bold text-gradient">
                  {company?.name?.charAt(0) || 'C'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-surface-500 uppercase tracking-wide font-medium">Workspace</p>
                <p className="text-sm font-semibold text-surface-800 truncate">
                  {company?.name || 'Unknown Company'}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
            {navigation.map((item, index) => (
              <NavLink
                key={item.name}
                to={item.href}
                style={{ animationDelay: `${index * 0.05}s` }}
                className={({ isActive }) =>
                  `group flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 animate-fade-up ${
                    isActive
                      ? 'bg-gradient-to-r from-primary-100 to-primary-50 text-primary-700 shadow-sm'
                      : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg transition-colors ${
                        isActive ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30' : 'bg-surface-100 text-surface-500 group-hover:bg-surface-200'
                      }`}>
                        <item.icon className="w-4 h-4" />
                      </div>
                      {item.name}
                    </div>
                    {item.shortcut && (
                      <span className="hidden group-hover:inline-flex items-center gap-0.5 text-xs text-surface-400">
                        <kbd className="px-1.5 py-0.5 bg-surface-100 rounded text-surface-500 font-mono text-[10px]">Alt</kbd>
                        <span className="text-surface-300">+</span>
                        <kbd className="px-1.5 py-0.5 bg-surface-100 rounded text-surface-500 font-mono text-[10px]">{item.shortcut}</kbd>
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* User menu */}
          <div className="p-4 border-t border-surface-100 bg-surface-50/50">
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white transition-all duration-200 group shadow-sm bg-white/50 border border-surface-100"
              >
                <div className="relative">
                  <Avatar
                    name={user ? `${user.firstName} ${user.lastName}` : 'User'}
                    size="sm"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p 
                    className="text-sm font-semibold text-surface-800 truncate"
                    title={user ? `${user.firstName} ${user.lastName}` : 'User'}
                  >
                    {user ? `${user.firstName} ${user.lastName}` : 'User'}
                  </p>
                  <p 
                    className="text-xs text-surface-500 truncate"
                    title={user?.email}
                  >
                    {user?.email}
                  </p>
                </div>
                <ChevronDown className={`w-4 h-4 text-surface-400 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-xl border border-surface-200 py-2 z-20 animate-scale-in">
                    <button
                      onClick={() => {
                        navigate('/settings');
                        setUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-surface-700 hover:bg-surface-50 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-surface-400" />
                      Account Settings
                    </button>
                    <div className="my-1 h-px bg-surface-100" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72 min-h-screen flex flex-col">
        {/* Top header */}
        <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-surface-100">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2.5 rounded-xl hover:bg-surface-100 transition-colors"
            >
              <Menu className="w-5 h-5 text-surface-600" />
            </button>

            <div className="flex-1" />

            <div className="flex items-center gap-3">
              {/* Quick Search */}
              <button
                onClick={() => navigate('/search')}
                className="hidden sm:flex items-center gap-3 px-4 py-2 text-sm text-surface-500 bg-surface-100/80 hover:bg-surface-100 rounded-xl transition-all duration-200 border border-surface-200/50"
              >
                <Search className="w-4 h-4" />
                <span className="text-surface-400">Quick search...</span>
                <kbd className="ml-4 px-2 py-0.5 text-xs bg-white rounded-md border border-surface-200 font-mono text-surface-400">
                  ⌘K
                </kbd>
              </button>

              {/* Notifications */}
              <button className="relative p-2.5 text-surface-500 hover:text-surface-700 hover:bg-surface-100 rounded-xl transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-accent-500 rounded-full" />
              </button>

              {/* Chat Button */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/chat')}
                className="hidden md:flex items-center gap-2 border-primary-200 text-primary-700 hover:bg-primary-50"
              >
                <MessageSquare className="w-4 h-4" />
                Chat
              </Button>

              {/* Upload Button */}
              <Button 
                size="sm" 
                onClick={() => navigate('/upload')}
                className="hidden md:flex items-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 shadow-md shadow-primary-500/25"
              >
                <Upload className="w-4 h-4" />
                Upload
              </Button>

              <button
                onClick={() => setShowShortcuts(true)}
                className="p-2.5 text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded-xl transition-colors"
                title="Keyboard shortcuts (⌘/)"
              >
                <Command className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="py-4 px-8 border-t border-surface-100 bg-white/50">
          <p className="text-center text-xs text-surface-400">
            © 2024 RAG Portal. Built with AI-powered document intelligence.
          </p>
        </footer>
      </div>

      {/* Keyboard Shortcuts Modal */}
      <Modal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
        title="Keyboard Shortcuts"
        size="md"
      >
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold text-surface-900 mb-3 flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4 text-primary-500" />
              Navigation
            </h4>
            <div className="space-y-2 bg-surface-50 rounded-xl p-3">
              {navigation
                .filter((item) => item.shortcut)
                .map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-white transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <item.icon className="w-4 h-4 text-surface-400" />
                      <span className="text-sm text-surface-700">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <kbd className="px-2 py-1 text-xs font-mono bg-white rounded-md border border-surface-200 text-surface-600">
                        Alt
                      </kbd>
                      <span className="text-surface-300">+</span>
                      <kbd className="px-2 py-1 text-xs font-mono bg-white rounded-md border border-surface-200 text-surface-600">
                        {item.shortcut}
                      </kbd>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-surface-900 mb-3 flex items-center gap-2">
              <Command className="w-4 h-4 text-primary-500" />
              Global
            </h4>
            <div className="space-y-2 bg-surface-50 rounded-xl p-3">
              <div className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-white transition-colors">
                <span className="text-sm text-surface-700">Quick Search</span>
                <div className="flex items-center gap-1">
                  <kbd className="px-2 py-1 text-xs font-mono bg-white rounded-md border border-surface-200 text-surface-600">
                    ⌘
                  </kbd>
                  <span className="text-surface-300">+</span>
                  <kbd className="px-2 py-1 text-xs font-mono bg-white rounded-md border border-surface-200 text-surface-600">
                    K
                  </kbd>
                </div>
              </div>
              <div className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-white transition-colors">
                <span className="text-sm text-surface-700">Show Shortcuts</span>
                <div className="flex items-center gap-1">
                  <kbd className="px-2 py-1 text-xs font-mono bg-white rounded-md border border-surface-200 text-surface-600">
                    ⌘
                  </kbd>
                  <span className="text-surface-300">+</span>
                  <kbd className="px-2 py-1 text-xs font-mono bg-white rounded-md border border-surface-200 text-surface-600">
                    /
                  </kbd>
                </div>
              </div>
              <div className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-white transition-colors">
                <span className="text-sm text-surface-700">Close Modal</span>
                <kbd className="px-2 py-1 text-xs font-mono bg-white rounded-md border border-surface-200 text-surface-600">
                  Esc
                </kbd>
              </div>
            </div>
          </div>

          <p className="text-xs text-surface-400 pt-2 text-center">
            On Windows/Linux, use <kbd className="px-1 py-0.5 text-[10px] bg-surface-100 rounded">Ctrl</kbd> instead of <kbd className="px-1 py-0.5 text-[10px] bg-surface-100 rounded">⌘</kbd>
          </p>
        </div>
      </Modal>
    </div>
  );
}
