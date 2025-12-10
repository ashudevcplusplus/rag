import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Search, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';

const NavItem = ({ to, icon: Icon, children }: any) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      clsx(
        'flex items-center space-x-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors',
        isActive
          ? 'bg-indigo-50 text-indigo-600'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      )
    }
  >
    <Icon className="w-5 h-5" />
    <span>{children}</span>
  </NavLink>
);

export default function Sidebar() {
  const { logout } = useAuth();
  return (
    <div className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      <div className="p-6 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-800">Company Portal</h1>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        <NavItem to="/dashboard" icon={LayoutDashboard}>Overview</NavItem>
        <NavItem to="/projects" icon={FolderKanban}>Projects</NavItem>
        <NavItem to="/search" icon={Search}>Search</NavItem>
      </nav>
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={logout}
          className="flex items-center space-x-3 px-4 py-3 w-full text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
