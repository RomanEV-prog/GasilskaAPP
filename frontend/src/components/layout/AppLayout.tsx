import { useEffect, useState } from 'react';
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { useFcm } from '../../hooks/useFcm';
import { useAuth } from '../../stores/auth.store';
import { useUi } from '../../stores/ui.store';
import { ROLE_LABELS } from '../../types';
import { OnboardingTour, tourStorageKey } from '../OnboardingTour';

const navItems = [
  { to: '/', label: 'Nadzorna plošča', icon: '📊', end: true },
  { to: '/members', label: 'Člani', icon: '👥' },
  { to: '/events', label: 'Dogodki', icon: '📅' },
  { to: '/calendar', label: 'Koledar', icon: '🗓️' },
  { to: '/vehicles', label: 'Vozila', icon: '🚒' },
  { to: '/equipment', label: 'Oprema', icon: '🧰' },
  { to: '/trainings', label: 'Usposabljanja', icon: '🎓' },
  { to: '/notifications', label: 'Obvestila', icon: '🔔' },
  { to: '/settings', label: 'Nastavitve', icon: '⚙️' },
];

/** Klasičen seznam — ikona + naziv v vrstici. */
function NavList() {
  return (
    <nav className="flex-1 space-y-1 px-3">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              isActive
                ? 'bg-primary text-white'
                : 'text-gray-300 hover:bg-white/10'
            }`
          }
        >
          <span>{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

/** Velike ikone — mreža ploščic z veliko ikono in nazivom spodaj. */
function NavIcons() {
  return (
    <nav className="grid flex-1 grid-cols-2 content-start gap-2 px-3">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl text-center transition-colors ${
              isActive
                ? 'bg-primary text-white'
                : 'text-gray-300 hover:bg-white/10'
            }`
          }
        >
          <span className="text-3xl">{item.icon}</span>
          <span className="px-1 text-[11px] leading-tight">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function AppLayout() {
  const { user, isLeadership, logout } = useAuth();
  const { navStyle } = useUi();
  const navigate = useNavigate();
  const location = useLocation();
  useFcm(); // registrira FCM žeton ob prijavi (no-op brez konfiguracije)

  // Uvodni vodič: samodejno ob prvi prijavi (dokler ni viden), kasneje ročno.
  const [tourOpen, setTourOpen] = useState(false);
  useEffect(() => {
    if (!user) return;
    try {
      if (!localStorage.getItem(tourStorageKey(user.id))) setTourOpen(true);
    } catch {
      /* localStorage nedosegljiv — vodič preprosto preskočimo */
    }
  }, [user]);

  const closeTour = () => {
    setTourOpen(false);
    if (user) {
      try {
        localStorage.setItem(tourStorageKey(user.id), 'done');
      } catch {
        /* ignoriraj */
      }
    }
  };

  // Gumb "Nazaj" prikaži samo na podstraneh (npr. /members/:id, /events/new),
  // ne na glavnih menijskih straneh.
  const isTopLevel = navItems.some((item) => item.to === location.pathname);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col bg-[#2D2D2D] text-white">
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="text-2xl">🔥</span>
          <span className="text-lg font-bold">GasilApp</span>
        </div>

        {navStyle === 'icons' ? <NavIcons /> : <NavList />}

        <div className="border-t border-white/10 p-4">
          <p className="text-sm font-medium">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="mb-3 text-xs text-gray-400">
            {user?.roles.map((r) => ROLE_LABELS[r]).join(', ')}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTourOpen(true)}
              className="text-xs text-gray-400 hover:text-white"
            >
              ❓ Vodič
            </button>
            <span className="text-gray-600">·</span>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="text-xs text-gray-400 underline hover:text-white"
            >
              Odjava
            </button>
          </div>
        </div>
      </aside>

      <OnboardingTour
        open={tourOpen}
        isLeadership={isLeadership}
        firstName={user?.firstName}
        onClose={closeTour}
      />

      {/* Vsebina */}
      <main className="flex-1 p-8">
        {!isTopLevel && (
          <button
            onClick={() => navigate(-1)}
            className="mb-4 flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary"
          >
            <span aria-hidden>←</span> Nazaj
          </button>
        )}
        <Outlet />
      </main>
    </div>
  );
}
