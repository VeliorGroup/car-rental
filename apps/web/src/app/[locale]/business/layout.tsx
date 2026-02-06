import { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Building2 } from 'lucide-react';

export default function BusinessLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* This layout is minimal since register/login pages have their own full layouts */}
      {children}
    </div>
  );
}
