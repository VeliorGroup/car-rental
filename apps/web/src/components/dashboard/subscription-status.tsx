'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, CreditCard, ArrowUpCircle } from 'lucide-react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

interface SubscriptionData {
  id: string;
  status: string;
  plan: {
    name: string;
    displayName: string;
    maxVehicles: number;
    maxUsers: number;
    maxLocations: number;
  };
  currentPeriodEnd: string;
  trialEndsAt: string | null;
}

interface UsageData {
  vehicles: number;
  users: number;
  locations: number;
}

export function SubscriptionStatus() {
  const router = useRouter();

  const { data: subscription, isLoading: subLoading } = useQuery<SubscriptionData>({
    queryKey: ['subscription'],
    queryFn: async () => {
      const response = await api.get('/subscriptions/current');
      return response.data;
    },
  });

  // In a real app, we would fetch usage data from a dedicated endpoint
  // For now, we'll use dashboard stats or mock it if not available in the same call
  // Assuming we might add a usage endpoint later, but for now let's use what we have or fetch separately
  const { data: usage, isLoading: usageLoading } = useQuery<UsageData>({
    queryKey: ['subscription-usage'],
    queryFn: async () => {
       // This endpoint doesn't exist yet in the backend plan, but we can simulate or add it.
       // For now, let's just fetch dashboard stats to get vehicle count.
       const statsRes = await api.get('/analytics/dashboard');
       // We don't have user/location count in dashboard stats yet, so we'll mock or default them
       return {
         vehicles: statsRes.data.totalVehicles || 0,
         users: 1, // Mock
         locations: 1 // Mock
       };
    },
  });

  if (subLoading || usageLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription Status</CardTitle>
        </CardHeader>
        <CardContent>Loading...</CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return null;
  }

  const vehiclePercentage = Math.min(100, (usage!.vehicles / subscription.plan.maxVehicles) * 100);
  const isTrial = subscription.status === 'TRIAL';
  const daysLeft = isTrial && subscription.trialEndsAt 
    ? Math.ceil((new Date(subscription.trialEndsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) 
    : 0;

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {subscription.plan.displayName} Plan
              {isTrial && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Trial</span>}
            </CardTitle>
            <CardDescription>
              {isTrial 
                ? `${daysLeft} days remaining in your free trial` 
                : `Renews on ${new Date(subscription.currentPeriodEnd).toLocaleDateString('it-IT')}`

              }
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push('/settings/billing')}>
            Manage
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Vehicle Limit</span>
            <span className="font-medium">{usage?.vehicles} / {subscription.plan.maxVehicles}</span>
          </div>
          <Progress value={vehiclePercentage} className="h-2" />
        </div>

        {vehiclePercentage >= 80 && (
          <Alert variant={vehiclePercentage >= 100 ? "destructive" : "default"} className="py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-sm font-medium">
              {vehiclePercentage >= 100 ? "Limit Reached" : "Approaching Limit"}
            </AlertTitle>
            <AlertDescription className="text-xs mt-1 flex justify-between items-center">
              <span>Upgrade to add more vehicles.</span>
              <Button size="sm" variant="link" className="h-auto p-0" onClick={() => router.push('/settings/billing')}>
                Upgrade <ArrowUpCircle className="ml-1 h-3 w-3" />
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
