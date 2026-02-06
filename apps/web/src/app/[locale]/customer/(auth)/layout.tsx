import { ReactNode } from 'react';

/**
 * Layout for authentication pages (login, register)
 * No navbar, no footer - just the auth form
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
