import PageTransition from '@/components/PageTransition'
import { AppLayout } from '@/components/layout/app-layout'
import { CommandPalette } from '@/components/command-palette'
import { OnboardingTour } from '@/components/onboarding-tour'

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AppLayout>
      <PageTransition>{children}</PageTransition>
      <CommandPalette />
      <OnboardingTour />
    </AppLayout>
  )
}

