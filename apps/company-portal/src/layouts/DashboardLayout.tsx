import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
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
  RefreshCw,
} from 'lucide-react';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  const location = useLocation();
  const { user, company, logout } = useAuthStore();
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useAppStore();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const isMac = useMemo(() => navigator.platform.toUpperCase().includes('MAC'), []);
  const modKeyLabel = isMac ? '⌘' : 'Ctrl';

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
    [isMac, navigate]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Close menus/modals on navigation; close sidebar on mobile after navigating
  useEffect(() => {
    setUserMenuOpen(false);
    setShowShortcuts(false);

    const isMobile = window.matchMedia('(max-width: 1023px)').matches;
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [location.pathname, sidebarOpen, setSidebarOpen]);

  // Close user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [userMenuOpen]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Skip link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:px-4 focus:py-2 focus:bg-white focus:text-gray-900 focus:rounded-lg focus:shadow-lg"
      >
        Skip to content
      </a>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        id="sidebar"
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
              aria-label="Close sidebar"
              aria-controls="sidebar"
              aria-expanded={sidebarOpen}
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
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Open user menu"
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
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
                <div
                  className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
                  role="menu"
                  aria-label="User menu"
                >
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    role="menuitem"
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
              aria-label="Open sidebar"
              aria-controls="sidebar"
              aria-expanded={sidebarOpen}
            >
              <Menu className="w-5 h-5 text-gray-500" />
            </button>

            <div className="flex-1" />

            <div className="flex items-center gap-3">
              {/* Quick Search */}
              <button
                onClick={() => navigate('/search')}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                aria-label="Open search"
              >
                <Search className="w-4 h-4" />
                <span>Search...</span>
                <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-white rounded border border-gray-200">
                  {modKeyLabel}K
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
                title={`Keyboard shortcuts (${modKeyLabel}/)`}
                aria-label="Keyboard shortcuts"
              >
                <Command className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main id="main-content" tabIndex={-1} className="p-4 sm:p-6 lg:p-8 focus:outline-none">
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
                    {modKeyLabel}
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
                    {modKeyLabel}
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
            {isMac ? 'On Windows/Linux, use Ctrl instead of ⌘' : 'On macOS, use ⌘ instead of Ctrl'}
          </p>
        </div>
      </Modal>
    </div>
  );
}
