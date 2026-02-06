import { ReactNode } from 'react';

/**
 * Base layout for customer pages
 * No navbar/footer here - they are added in specific layouts
 */
export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
