import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/** Izgled leve navigacije: klasičen seznam ali velike ikone. */
export type NavStyle = 'list' | 'icons';

interface UiContextValue {
  navStyle: NavStyle;
  setNavStyle: (style: NavStyle) => void;
}

const UiContext = createContext<UiContextValue | null>(null);

function loadNavStyle(): NavStyle {
  const stored = localStorage.getItem('navStyle');
  return stored === 'icons' ? 'icons' : 'list';
}

export function UiProvider({ children }: { children: ReactNode }) {
  const [navStyle, setNavStyleState] = useState<NavStyle>(loadNavStyle);

  const setNavStyle = useCallback((style: NavStyle) => {
    localStorage.setItem('navStyle', style);
    setNavStyleState(style);
  }, []);

  const value = useMemo(
    () => ({ navStyle, setNavStyle }),
    [navStyle, setNavStyle],
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi(): UiContextValue {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('useUi mora biti znotraj UiProvider');
  return ctx;
}
