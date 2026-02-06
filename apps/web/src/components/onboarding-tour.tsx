'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Check,
  Car,
  Users,
  CalendarDays,
  LayoutDashboard,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  target?: string; // CSS selector for highlighting element
}

const defaultSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to FleetPulse! 🎉',
    description: 'Let us show you around. This quick tour will help you get started with managing your fleet.',
    icon: Sparkles,
  },
  {
    id: 'dashboard',
    title: 'Dashboard Overview',
    description: 'Your dashboard shows key metrics at a glance: revenue, bookings, and fleet status.',
    icon: LayoutDashboard,
    target: '[data-tour="dashboard"]',
  },
  {
    id: 'vehicles',
    title: 'Manage Your Fleet',
    description: 'Add and manage your vehicles here. Track availability, maintenance, and more.',
    icon: Car,
    target: '[data-tour="vehicles"]',
  },
  {
    id: 'customers',
    title: 'Customer Management',
    description: 'Keep track of your customers, their bookings, and rental history.',
    icon: Users,
    target: '[data-tour="customers"]',
  },
  {
    id: 'bookings',
    title: 'Create Bookings',
    description: 'Easily create and manage bookings. Handle check-ins, check-outs, and more.',
    icon: CalendarDays,
    target: '[data-tour="bookings"]',
  },
];

interface OnboardingTourProps {
  steps?: OnboardingStep[];
  isOpen?: boolean;
  onComplete?: () => void;
  onSkip?: () => void;
}

export function OnboardingTour({
  steps = defaultSteps,
  isOpen: controlledIsOpen,
  onComplete,
  onSkip,
}: OnboardingTourProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState(0);
  
  // Use controlled or internal state
  const open = controlledIsOpen !== undefined ? controlledIsOpen : isOpen;
  
  React.useEffect(() => {
    // Check if user has seen the tour
    const hasSeenTour = localStorage.getItem('onboarding-completed');
    if (!hasSeenTour && controlledIsOpen === undefined) {
      // Small delay before showing tour
      const timer = setTimeout(() => setIsOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [controlledIsOpen]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('onboarding-completed', 'true');
    setIsOpen(false);
    onComplete?.();
  };

  const handleSkip = () => {
    localStorage.setItem('onboarding-completed', 'true');
    setIsOpen(false);
    onSkip?.();
  };

  const step = steps[currentStep];
  const Icon = step.icon;
  const isLastStep = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={handleSkip}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
              {/* Progress bar */}
              <div className="h-1 bg-muted">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Step {currentStep + 1} of {steps.length}</span>
                </div>
                <button
                  onClick={handleSkip}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              {/* Content */}
              <div className="p-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="text-center"
                  >
                    {/* Icon */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 0.1 }}
                      className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4"
                    >
                      <Icon className="h-8 w-8 text-primary" />
                    </motion.div>
                    
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      {step.title}
                    </h3>
                    
                    <p className="text-muted-foreground">
                      {step.description}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
              
              {/* Footer */}
              <div className="flex items-center justify-between p-4 border-t border-border bg-muted/30">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  className="text-muted-foreground"
                >
                  Skip tour
                </Button>
                
                <div className="flex items-center gap-2">
                  {currentStep > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrev}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    onClick={handleNext}
                    className="min-w-[100px]"
                  >
                    {isLastStep ? (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Get Started
                      </>
                    ) : (
                      <>
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              {/* Step indicators */}
              <div className="flex justify-center gap-1.5 pb-4">
                {steps.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentStep(index)}
                    className={cn(
                      'w-2 h-2 rounded-full transition-all',
                      index === currentStep
                        ? 'bg-primary w-6'
                        : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                    )}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook to control onboarding tour
 */
export function useOnboarding() {
  const [isOpen, setIsOpen] = React.useState(false);

  const startTour = React.useCallback(() => {
    localStorage.removeItem('onboarding-completed');
    setIsOpen(true);
  }, []);

  const resetTour = React.useCallback(() => {
    localStorage.removeItem('onboarding-completed');
  }, []);

  return {
    isOpen,
    setIsOpen,
    startTour,
    resetTour,
  };
}
