import { useQuery } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { organizationsApi } from './api/organizations.api';
import { AppLayout } from './components/layout/AppLayout';
import { Spinner } from './components/ui';
import { PLATFORM_ORG_SLUG } from './types';
// Prijavna stran ostane v glavnem paketu — je prvi zaslon vsakega obiska.
import { LoginPage } from './pages/auth/LoginPage';
import { useAuth } from './stores/auth.store';

// Vse ostale strani se naložijo šele ob prvem obisku (code-splitting) —
// glavni paket je bil 614 kB, kar je na počasnem omrežju predolg prvi zagon.
// Strani so named exporti, zato .then(m => ({ default: m.X })).
const RegisterPage = lazy(() =>
  import('./pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })),
);
const ForgotPasswordPage = lazy(() =>
  import('./pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })),
);
const ResetPasswordPage = lazy(() =>
  import('./pages/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
);
const DashboardPage = lazy(() =>
  import('./pages/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const EventDetailPage = lazy(() =>
  import('./pages/events/EventDetailPage').then((m) => ({ default: m.EventDetailPage })),
);
const CalendarPage = lazy(() =>
  import('./pages/calendar/CalendarPage').then((m) => ({ default: m.CalendarPage })),
);
const EventFormPage = lazy(() =>
  import('./pages/events/EventFormPage').then((m) => ({ default: m.EventFormPage })),
);
const EquipmentDetailPage = lazy(() =>
  import('./pages/equipment/EquipmentDetailPage').then((m) => ({ default: m.EquipmentDetailPage })),
);
const EquipmentFormPage = lazy(() =>
  import('./pages/equipment/EquipmentFormPage').then((m) => ({ default: m.EquipmentFormPage })),
);
const EquipmentPage = lazy(() =>
  import('./pages/equipment/EquipmentPage').then((m) => ({ default: m.EquipmentPage })),
);
const MyEquipmentPage = lazy(() =>
  import('./pages/equipment/MyEquipmentPage').then((m) => ({ default: m.MyEquipmentPage })),
);
const EventsPage = lazy(() =>
  import('./pages/events/EventsPage').then((m) => ({ default: m.EventsPage })),
);
const MemberDetailPage = lazy(() =>
  import('./pages/members/MemberDetailPage').then((m) => ({ default: m.MemberDetailPage })),
);
const MemberFormPage = lazy(() =>
  import('./pages/members/MemberFormPage').then((m) => ({ default: m.MemberFormPage })),
);
const MembersPage = lazy(() =>
  import('./pages/members/MembersPage').then((m) => ({ default: m.MembersPage })),
);
const NotificationsPage = lazy(() =>
  import('./pages/notifications/NotificationsPage').then((m) => ({ default: m.NotificationsPage })),
);
const InvoicePage = lazy(() =>
  import('./pages/platform/InvoicePage').then((m) => ({ default: m.InvoicePage })),
);
const PlatformPage = lazy(() =>
  import('./pages/platform/PlatformPage').then((m) => ({ default: m.PlatformPage })),
);
const SettingsPage = lazy(() =>
  import('./pages/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const TrainingsPage = lazy(() =>
  import('./pages/trainings/TrainingsPage').then((m) => ({ default: m.TrainingsPage })),
);
const VehicleFormPage = lazy(() =>
  import('./pages/vehicles/VehicleFormPage').then((m) => ({ default: m.VehicleFormPage })),
);
const SpinPage = lazy(() =>
  import('./pages/spin/SpinPage').then((m) => ({ default: m.SpinPage })),
);
const VehiclesPage = lazy(() =>
  import('./pages/vehicles/VehiclesPage').then((m) => ({ default: m.VehiclesPage })),
);

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
    <Suspense fallback={<Spinner />}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
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
    </Suspense>
  );
}
