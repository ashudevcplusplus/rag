import { useEffect, useLayoutEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { configureApiClient } from '@rag/api-client';
import { useAuthStore } from './store/auth.store';

// Layouts
import { AuthLayout } from './layouts/AuthLayout';
import { DashboardLayout } from './layouts/DashboardLayout';

// Pages
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ProjectsPage } from './pages/projects/ProjectsPage';
import { ProjectDetailPage } from './pages/projects/ProjectDetailPage';
import { FilePreviewPage } from './pages/files/FilePreviewPage';
import { UploadPage } from './pages/upload/UploadPage';
import { SearchPage } from './pages/search/SearchPage';
import { ChatPage } from './pages/chat/ChatPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { UsersPage } from './pages/users/UsersPage';
import { IndexingPage } from './pages/indexing/IndexingPage';

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { token, companyId, apiUrl, logout } = useAuthStore();

  // Configure API client synchronously on first render
  useLayoutEffect(() => {
    configureApiClient({
      baseUrl: apiUrl,
      token: token || undefined, // JWT token for authenticated requests
      companyId: companyId || undefined,
      onUnauthorized: () => {
        logout();
      },
    });
  }, [token, companyId, apiUrl, logout]);

  // Also configure on mount to ensure it's set before any API calls
  useEffect(() => {
    configureApiClient({
      baseUrl: apiUrl,
      token: token || undefined, // JWT token for authenticated requests
      companyId: companyId || undefined,
      onUnauthorized: () => {
        logout();
      },
    });
  }, [token, companyId, apiUrl, logout]);

  return (
    <Routes>
      {/* Auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Protected dashboard routes */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="/projects/:projectId/files/:fileId" element={<FilePreviewPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/indexing" element={<IndexingPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
