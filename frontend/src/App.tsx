import { useQuery } from '@tanstack/react-query';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { organizationsApi } from './api/organizations.api';
import { AppLayout } from './components/layout/AppLayout';
import { Spinner } from './components/ui';
import { PLATFORM_ORG_SLUG } from './types';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { EventDetailPage } from './pages/events/EventDetailPage';
import { CalendarPage } from './pages/calendar/CalendarPage';
import { EventFormPage } from './pages/events/EventFormPage';
import { EquipmentDetailPage } from './pages/equipment/EquipmentDetailPage';
import { EquipmentFormPage } from './pages/equipment/EquipmentFormPage';
import { EquipmentPage } from './pages/equipment/EquipmentPage';
import { MyEquipmentPage } from './pages/equipment/MyEquipmentPage';
import { EventsPage } from './pages/events/EventsPage';
import { MemberDetailPage } from './pages/members/MemberDetailPage';
import { MemberFormPage } from './pages/members/MemberFormPage';
import { MembersPage } from './pages/members/MembersPage';
import { NotificationsPage } from './pages/notifications/NotificationsPage';
import { InvoicePage } from './pages/platform/InvoicePage';
import { PlatformPage } from './pages/platform/PlatformPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { TrainingsPage } from './pages/trainings/TrainingsPage';
import { VehicleFormPage } from './pages/vehicles/VehicleFormPage';
import { SpinPage } from './pages/spin/SpinPage';
import { VehiclesPage } from './pages/vehicles/VehiclesPage';
import { useAuth } from './stores/auth.store';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/**
 * Poti, ki so samo za vodstvo (imenik članov). Skrivanje zavihka ne zadošča —
 * brez tega je stran dosegljiva z vpisom naslova v brskalnik.
 */
function RequireLeadership({ children }: { children: React.ReactNode }) {
  const { isLeadership } = useAuth();
  if (!isLeadership) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Upravljanje platforme — samo super_admin (backend to zahteva tudi sam). */
function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const { isSuperAdmin } = useAuth();
  if (!isSuperAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/**
 * Domača stran. Upravitelj platforme nima svojega društva, zato mu nadzorna
 * plošča ne pove ničesar — pošljemo ga na Platformo.
 */
function HomeRoute() {
  const { data: org, isLoading } = useQuery({
    queryKey: ['organization', 'me'],
    queryFn: organizationsApi.getMine,
    staleTime: 5 * 60 * 1000,
  });
  if (isLoading) return <Spinner />;
  if (org?.slug === PLATFORM_ORG_SLUG) return <Navigate to="/platform" replace />;
  return <DashboardPage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<HomeRoute />} />
        <Route
          element={
            <RequireLeadership>
              <Outlet />
            </RequireLeadership>
          }
        >
          <Route path="/members" element={<MembersPage />} />
          <Route path="/members/new" element={<MemberFormPage />} />
          <Route path="/members/:id" element={<MemberDetailPage />} />
          <Route path="/members/:id/edit" element={<MemberFormPage />} />
        </Route>
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/new" element={<EventFormPage />} />
        <Route path="/events/:id" element={<EventDetailPage />} />
        <Route path="/events/:id/edit" element={<EventFormPage />} />
        <Route path="/vehicles" element={<VehiclesPage />} />
        <Route path="/vehicles/new" element={<VehicleFormPage />} />
        <Route path="/vehicles/:id/edit" element={<VehicleFormPage />} />
        <Route path="/equipment" element={<EquipmentPage />} />
        <Route path="/equipment/new" element={<EquipmentFormPage />} />
        {/* Pred ":id", da "new" ne pade v podrobnosti. */}
        <Route path="/equipment/:id/edit" element={<EquipmentFormPage />} />
        <Route path="/equipment/:id" element={<EquipmentDetailPage />} />
        <Route path="/moja-oprema" element={<MyEquipmentPage />} />
        <Route path="/trainings" element={<TrainingsPage />} />
        <Route path="/spin" element={<SpinPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route
          element={
            <RequireSuperAdmin>
              <Outlet />
            </RequireSuperAdmin>
          }
        >
          <Route path="/platform" element={<PlatformPage />} />
          <Route path="/platform/racun/:id" element={<InvoicePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
