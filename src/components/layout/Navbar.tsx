import { UserRound } from 'lucide-react';

interface NavbarProps {
  userName: string;
}

export function Navbar({ userName }: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-[#0a0a0a]/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-text-secondary">Panel</p>
          <p className="text-sm text-text-primary">Control financiero y operativo</p>
        </div>

        <a
          className="inline-flex items-center gap-2 border border-border-strong bg-transparent px-3 py-2 text-sm text-text-primary transition-colors duration-150 hover:bg-surface-hover"
          href="/perfil"
        >
          <UserRound className="h-4 w-4" strokeWidth={1.5} />
          <span>{userName}</span>
        </a>
      </div>
    </header>
  );
}
