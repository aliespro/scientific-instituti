import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { TimerProvider } from '@/contexts/TimerContext';
import { TimerWidget } from '@/components/TimerWidget';
import { LoginPage } from '@/pages/LoginPage';
import { MainLayout } from '@/components/MainLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { ProjectDetailPage } from '@/pages/ProjectDetailPage';
import { TasksPage } from '@/pages/TasksPage';
import { MembersPage } from '@/pages/MembersPage';
import { PublicationsPage } from '@/pages/PublicationsPage';
import { EventsPage } from '@/pages/EventsPage';
import { OrganizationPage } from '@/pages/OrganizationPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { Spinner } from '@/components/ui';
import { useEffect } from 'react';

function ProtectedRoutes() {
  const { session, loading } = useAuth();

  
  if (loading) return <Spinner className="min-h-screen" />;

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <>
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route
        path="/"
        element={
          <MainLayout>
            <DashboardPage />
          </MainLayout>
        }
      />
      <Route
        path="/projects"
        element={
          <MainLayout>
            <ProjectsPage />
          </MainLayout>
        }
      />
      <Route
        path="/projects/:id"
        element={
          <MainLayout>
            <ProjectDetailPage />
          </MainLayout>
        }
      />
      <Route
        path="/tasks"
        element={
          <MainLayout>
            <TasksPage />
          </MainLayout>
        }
      />
      <Route
        path="/members"
        element={
          <MainLayout>
            <MembersPage />
          </MainLayout>
        }
      />
      <Route
        path="/publications"
        element={
          <MainLayout>
            <PublicationsPage />
          </MainLayout>
        }
      />
      <Route
        path="/events"
        element={
          <MainLayout>
            <EventsPage />
          </MainLayout>
        }
      />
      <Route
        path="/organization"
        element={
          <MainLayout>
            <OrganizationPage />
          </MainLayout>
        }
      />
      <Route
        path="/settings"
        element={
          <MainLayout>
            <SettingsPage />
          </MainLayout>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <TimerWidget />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <TimerProvider>
        <BrowserRouter>
          <ProtectedRoutes />
        </BrowserRouter>
      </TimerProvider>
    </AuthProvider>
  );
}

export default App;
