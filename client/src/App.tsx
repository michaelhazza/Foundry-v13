import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/hooks/useAuth';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ErrorBoundary } from '@/components/error-boundary';
import { ProtectedRoute } from '@/components/protected-route';

// Auth pages
import { LoginPage } from '@/pages/auth/login';
import { RegisterPage } from '@/pages/auth/register';
import { ForgotPasswordPage } from '@/pages/auth/forgot-password';
import { ResetPasswordPage } from '@/pages/auth/reset-password';

// Main pages
import { DashboardPage } from '@/pages/dashboard';
import { ProjectsPage } from '@/pages/projects/index';
import { ProjectDetailPage } from '@/pages/projects/detail';

// Source pages
import { SourceDetailPage } from '@/pages/sources/detail';
import { CreateTeamworkSourcePage } from '@/pages/sources/create-teamwork';

// Run and Dataset pages
import { RunDetailPage } from '@/pages/runs/detail';
import { DatasetDetailPage } from '@/pages/datasets/detail';

// Settings pages
import { OrganizationSettingsPage } from '@/pages/settings/organization';
import { TeamPage } from '@/pages/settings/team';
import { ProfilePage } from '@/pages/settings/profile';

// Audit pages
import { AuditLogsPage } from '@/pages/audit/index';

// Error page
import { NotFoundPage } from '@/pages/not-found';

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <BrowserRouter>
              <Routes>
                {/* Public auth routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                {/* Protected routes */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />

                {/* Projects */}
                <Route
                  path="/projects"
                  element={
                    <ProtectedRoute>
                      <ProjectsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/projects/:id"
                  element={
                    <ProtectedRoute>
                      <ProjectDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/projects/:projectId/sources/new/teamwork"
                  element={
                    <ProtectedRoute>
                      <CreateTeamworkSourcePage />
                    </ProtectedRoute>
                  }
                />

                {/* Sources */}
                <Route
                  path="/sources/:id"
                  element={
                    <ProtectedRoute>
                      <SourceDetailPage />
                    </ProtectedRoute>
                  }
                />

                {/* Runs */}
                <Route
                  path="/runs/:id"
                  element={
                    <ProtectedRoute>
                      <RunDetailPage />
                    </ProtectedRoute>
                  }
                />

                {/* Datasets */}
                <Route
                  path="/datasets/:id"
                  element={
                    <ProtectedRoute>
                      <DatasetDetailPage />
                    </ProtectedRoute>
                  }
                />

                {/* Settings */}
                <Route
                  path="/settings/organization"
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <OrganizationSettingsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings/team"
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <TeamPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />

                {/* Audit */}
                <Route
                  path="/audit"
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <AuditLogsPage />
                    </ProtectedRoute>
                  }
                />

                {/* 404 */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </BrowserRouter>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
