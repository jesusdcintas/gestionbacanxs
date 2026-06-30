import type { PropsWithChildren } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

interface AppShellProps extends PropsWithChildren {
  pathname: string;
  userName: string;
}

export function AppShell({ pathname, userName, children }: AppShellProps) {
  return (
    <>
      <Sidebar pathname={pathname} />
      <div className="min-h-screen pl-0 md:pl-60">
        <Navbar userName={userName} />
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </>
  );
}
