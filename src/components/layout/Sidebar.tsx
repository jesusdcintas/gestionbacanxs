import { LayoutDashboard, Calendar, TrendingUp, TrendingDown, PieChart, Landmark, UserRound } from 'lucide-react';
import type { ComponentType } from 'react';
import { cn } from '../../utils/cn';

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
}

interface SidebarProps {
  pathname: string;
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

export function Sidebar({ pathname }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 h-screen w-60 border-r border-border bg-[#0a0a0a] px-4 py-6">
      <div className="mb-10 px-2">
        <p className="text-[10px] uppercase tracking-[0.24em] text-text-secondary">Gestor</p>
        <h1
          className="mt-1 text-2xl uppercase italic leading-none text-text-primary"
          style={{ fontFamily: '"Archivo Black", sans-serif' }}
        >
          Bacanxs
        </h1>
      </div>

      <nav className="space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <a
              className={cn(
                'flex items-center gap-3 border-l-2 px-3 py-2 text-sm transition-colors duration-150',
                isActive
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-secondary hover:text-text-primary',
              )}
              href={item.href}
              key={item.href}
            >
              <Icon className="h-4.5 w-4.5" strokeWidth={1.5} />
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>
    </aside>
  );
}
