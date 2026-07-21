import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { organizationsApi } from '../../api/organizations.api';
import { useFcm } from '../../hooks/useFcm';
import { useAuth } from '../../stores/auth.store';

/** Logotip društva; če ga ni naloženega, pade nazaj na privzeto ikono. */
function OrgLogo() {
  const { data: logoUrl } = useQuery({
    queryKey: ['organization', 'logo'],
    queryFn: organizationsApi.getLogoBlobUrl,
    staleTime: 5 * 60 * 1000,
  });
  return logoUrl ? (
    <img
      src={logoUrl}
      alt="Logotip društva"
      className="h-8 w-8 rounded object-contain"
    />
  ) : (
    <span className="text-2xl">🔥</span>
  );
}
import { useUi } from '../../stores/ui.store';
import { ROLE_LABELS } from '../../types';
import { NotificationsBanner } from '../NotificationsBanner';
import { OnboardingTour, tourStorageKey } from '../OnboardingTour';

type NavItem = {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
  /** Vidno samo vodstvu (imenik članov — feedback Darjan, 20. 7. 2026). */
  leadershipOnly?: boolean;
};

const navItems: NavItem[] = [
  { to: '/', label: 'Nadzorna plošča', icon: '📊', end: true },
  { to: '/members', label: 'Člani', icon: '👥', leadershipOnly: true },
  { to: '/events', label: 'Dogodki', icon: '📅' },
  { to: '/calendar', label: 'Koledar', icon: '🗓️' },
  { to: '/vehicles', label: 'Vozila', icon: '🚒' },
  { to: '/equipment', label: 'Oprema', icon: '🧰' },
  { to: '/moja-oprema', label: 'Moja oprema', icon: '🎽' },
  { to: '/trainings', label: 'Usposabljanja', icon: '🎓' },
  { to: '/notifications', label: 'Obvestila', icon: '🔔' },
  { to: '/settings', label: 'Nastavitve', icon: '⚙️' },
];

/**
 * Vnosi menija za dano vlogo. Skrivanje je zgolj vmesniško — prava meja
 * je strežniška projekcija v `users.service.ts` plus `LeadershipRoute`.
 */
function visibleNavItems(isLeadership: boolean): NavItem[] {
  return isLeadership ? navItems : navItems.filter((i) => !i.leadershipOnly);
}

/** Klasičen seznam — ikona + naziv v vrstici. */
function NavList({ items }: { items: NavItem[] }) {
  return (
    <nav className="flex-1 space-y-1 px-3">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
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
function NavIcons({ items }: { items: NavItem[] }) {
  return (
    <nav className="grid flex-1 grid-cols-2 content-start gap-2 px-3">
      {items.map((item) => (
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

/** Notranjost menija — skupna stranski vrstici (desktop) in predalu (telefon). */
function SidebarContent({
  onOpenTour,
  showLogo = true,
}: {
  onOpenTour: () => void;
  showLogo?: boolean;
}) {
  const { user, isLeadership } = useAuth();
  const { navStyle } = useUi();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const items = visibleNavItems(isLeadership);

  return (
    <>
      {showLogo && (
        <div className="flex items-center gap-2 px-5 py-5">
          <OrgLogo />
          <span className="text-lg font-bold">Plamen</span>
        </div>
      )}

      {navStyle === 'icons' ? (
        <NavIcons items={items} />
      ) : (
        <NavList items={items} />
      )}

      <div className="border-t border-white/10 p-4">
        <p className="text-sm font-medium">
          {user?.firstName} {user?.lastName}
        </p>
        <p className="mb-3 text-xs text-gray-400">
          {user?.roles.map((r) => ROLE_LABELS[r]).join(', ')}
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenTour}
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
    </>
  );
}

export function AppLayout() {
  const { user, isLeadership } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  useFcm(); // registrira FCM žeton ob prijavi (no-op brez konfiguracije)

  // Predal z menijem na telefonu; ob vsaki navigaciji se zapre.
  const [drawerOpen, setDrawerOpen] = useState(false);
  useEffect(() => setDrawerOpen(false), [location.pathname]);

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

  const openTour = () => {
    setDrawerOpen(false);
    setTourOpen(true);
  };

  // Gumb "Nazaj" prikaži samo na podstraneh (npr. /members/:id, /events/new),
  // ne na glavnih menijskih straneh.
  const isTopLevel = navItems.some((item) => item.to === location.pathname);

  return (
    <div className="flex min-h-screen">
      {/* Stranski meni — samo na širših zaslonih */}
      <aside className="hidden w-60 flex-col bg-[#2D2D2D] text-white md:flex">
        <SidebarContent onOpenTour={openTour} />
      </aside>

      {/* Predal (drawer) — meni na telefonu */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto bg-[#2D2D2D] pt-[env(safe-area-inset-top)] text-white shadow-xl">
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔥</span>
                <span className="text-lg font-bold">Plamen</span>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg p-2 text-2xl leading-none text-gray-300 hover:bg-white/10"
                aria-label="Zapri meni"
              >
                ×
              </button>
            </div>
            <SidebarContent onOpenTour={openTour} showLogo={false} />
          </aside>
        </div>
      )}

      <OnboardingTour
        open={tourOpen}
        isLeadership={isLeadership}
        firstName={user?.firstName}
        onClose={closeTour}
      />

      {/* Vsebina */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Zgornja vrstica — samo na telefonu */}
        <header className="sticky top-0 z-30 flex items-center gap-3 bg-[#2D2D2D] px-3 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] text-white md:hidden">
          <button
            onClick={() => setDrawerOpen(true)}
            className="rounded-lg p-2 hover:bg-white/10"
            aria-label="Odpri meni"
          >
            <span className="block h-0.5 w-5 bg-white" />
            <span className="mt-1 block h-0.5 w-5 bg-white" />
            <span className="mt-1 block h-0.5 w-5 bg-white" />
          </button>
          <span className="text-base font-bold">
            {navItems.find(
              (i) =>
                i.to === location.pathname ||
                (i.to !== '/' && location.pathname.startsWith(i.to)),
            )?.label ?? 'Plamen'}
          </span>
        </header>

        <main className="flex-1 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:p-8">
          <NotificationsBanner />
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
    </div>
  );
}
