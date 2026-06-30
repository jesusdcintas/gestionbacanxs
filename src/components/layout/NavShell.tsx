import { useEffect, useState } from 'react';
import {
  Calendar,
  Landmark,
  LayoutDashboard,
  Menu,
  PieChart,
  TrendingDown,
  TrendingUp,
  UserRound,
  X,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { cn } from '../../utils/cn';

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
}

interface NavShellProps {
  pathname: string;
  userName: string;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/eventos', label: 'Eventos', icon: Calendar },
  { href: '/ingresos', label: 'Ingresos', icon: TrendingUp },
  { href: '/gastos', label: 'Gastos', icon: TrendingDown },
  { href: '/balance', label: 'Balance', icon: PieChart },
  { href: '/fondo', label: 'Fondo', icon: Landmark },
  { href: '/perfil', label: 'Perfil', icon: UserRound },
];

export function NavShell({ pathname, userName }: NavShellProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const closeAndNavigate = () => setOpen(false);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-[#0a0a0a]/95 backdrop-blur md:pl-60">
        <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={open}
              aria-controls="primary-sidebar"
              className="inline-flex h-10 w-10 items-center justify-center border border-border-strong text-text-primary transition-colors duration-150 hover:bg-surface-hover md:hidden"
            >
              {open ? <X size={20} strokeWidth={1.5} /> : <Menu size={20} strokeWidth={1.5} />}
            </button>
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-text-secondary">Panel</p>
              <p className="text-sm text-text-primary">Control financiero y operativo</p>
            </div>
          </div>

          <a
            className="inline-flex items-center gap-2 border border-border-strong bg-transparent px-3 py-2 text-sm text-text-primary transition-colors duration-150 hover:bg-surface-hover"
            href="/perfil"
          >
            <UserRound className="h-4 w-4" strokeWidth={1.5} />
            <span className="hidden sm:inline">{userName}</span>
          </a>
        </div>
      </header>

      {open && (
        <div
          onClick={() => setOpen(false)}
          aria-hidden="true"
          tabIndex={-1}
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
        />
      )}

      <aside
        id="primary-sidebar"
        aria-label="Navegación principal"
        className={cn(
          'fixed left-0 top-0 z-50 h-screen w-60 border-r border-border bg-[#0a0a0a] px-4 py-6',
          'transform transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : '-translate-x-full',
          'md:translate-x-0',
        )}
      >
        <div className="mb-10 flex items-start justify-between gap-2 px-2">
          <div>
            <img src="/logo-bacanxs.png" alt="Bacanxs" className="h-12 w-auto" />
            <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-text-secondary">
              Gestor financiero
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
            className="inline-flex h-8 w-8 items-center justify-center text-text-secondary transition-colors hover:text-text-primary md:hidden"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <a
                key={item.href}
                href={item.href}
                onClick={closeAndNavigate}
                className={cn(
                  'flex items-center gap-3 border-l-2 px-3 py-2 text-sm transition-colors duration-150',
                  isActive
                    ? 'border-accent text-accent'
                    : 'border-transparent text-text-secondary hover:text-text-primary',
                )}
              >
                <Icon className="h-4.5 w-4.5" strokeWidth={1.5} />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

export default NavShell;
