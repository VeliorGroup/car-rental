'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Check, Crown, Zap, Building2, Clock, CreditCard, AlertTriangle } from 'lucide-react';
import { Loader } from '@/components/ui/loader';
import api from '@/lib/api';
import { getCountryCodeForLocale } from '@/lib/constants/locale-country';

interface Feature {
  id: string;
  name: string;
  displayName: string;
  description?: string;
}

interface Plan {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  price: number;
  yearlyPrice: number;
  currency: string;
  maxVehicles: number;
  maxUsers: number;
  maxLocations: number;
  features: Feature[];
}

interface Subscription {
  id: string;
  planId: string;
  status: string;
  interval: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt: string | null;
  plan: Plan;
}

export default function BillingPage() {
  const params = useParams();
  const locale = params.locale as string || 'en';
  const t = useTranslations('Billing');
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [interval, setInterval] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');

  useEffect(() => {
    fetchData();
  }, [locale]);

  const fetchData = async () => {
    try {
      const countryCode = getCountryCodeForLocale(locale);
      const [plansRes, subRes] = await Promise.all([
        api.get('/subscriptions/plans', { params: { countryCode } }),
        api.get('/subscriptions/current'),
      ]);
      const availablePlans = plansRes.data
        .filter((plan: Plan) => Number(plan.price) > 0)
        .sort((a: Plan, b: Plan) => Number(a.price) - Number(b.price));
      setPlans(availablePlans);
      setSubscription(subRes.data);
      if (subRes.data?.interval) {
        setInterval(subRes.data.interval);
      }
    } catch (error) {
      console.error('Failed to fetch billing data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    setUpgrading(planId);
    try {
      await api.put('/subscriptions/upgrade', { planId, interval });
      toast({
        title: t('toast.upgradeSuccess') || 'Plan upgraded!',
        description: t('toast.upgradeDesc') || 'Your subscription has been updated.',
      });
      await fetchData();
    } catch (error: any) {
      toast({
        title: t('toast.upgradeFail') || 'Upgrade failed',
        description: error.response?.data?.message || t('toast.upgradeFailDesc') || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUpgrading(null);
    }
  };

  const isTrialActive = subscription?.status === 'TRIAL';
  const trialDaysLeft = subscription?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title') || 'Billing & Subscription'}</h1>
        <p className="text-muted-foreground mt-1">{t('subtitle') || 'Manage your subscription plan and billing'}</p>
      </div>

      {/* Current Subscription Status */}
      <div className={`p-6 rounded-xl border ${isTrialActive ? 'bg-amber-500/5 border-amber-500/20' : 'bg-green-500/5 border-green-500/20'}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isTrialActive ? 'bg-amber-500/10' : 'bg-green-500/10'}`}>
              {isTrialActive ? <Clock className="h-6 w-6 text-amber-600" /> : <Crown className="h-6 w-6 text-green-600" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">
                  {subscription?.plan?.displayName || 'Free Trial'}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isTrialActive 
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400' 
                    : 'bg-green-500/10 text-green-700 dark:text-green-400'
                }`}>
                  {subscription?.status || 'TRIAL'}
                </span>
              </div>
              {isTrialActive && (
                <div className="mt-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm text-amber-700 dark:text-amber-400">
                    {trialDaysLeft > 0 
                      ? `${trialDaysLeft} ${t('daysLeft') || 'days left in your trial'}`
                      : t('trialExpired') || 'Your trial has expired'
                    }
                  </span>
                </div>
              )}
              {!isTrialActive && subscription && (
                <p className="text-sm text-muted-foreground mt-1">
                  {t('renewsOn') || 'Renews on'}: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-foreground">
              {subscription?.plan?.currency || 'EUR'} {Number(
                interval === 'YEARLY' ? subscription?.plan?.yearlyPrice : subscription?.plan?.price
              ) || 0}
            </div>
            <div className="text-sm text-muted-foreground">
              /{interval === 'YEARLY' ? (t('year') || 'year') : (t('month') || 'month')}
            </div>
          </div>
        </div>

        {/* Current plan limits */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{subscription?.plan?.maxVehicles || 0} {t('vehicles') || 'vehicles'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{subscription?.plan?.maxUsers || 0} {t('users') || 'users'}</span>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{subscription?.plan?.maxLocations || 0} {t('locations') || 'locations'}</span>
          </div>
        </div>
      </div>

      {/* Interval Toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{t('availablePlans') || 'Available Plans'}</h2>
        <div className="flex items-center space-x-2 bg-muted p-1 rounded-lg">
          <button
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              interval === 'MONTHLY' 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setInterval('MONTHLY')}
          >
            {t('monthly') || 'Monthly'}
          </button>
          <button
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              interval === 'YEARLY' 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setInterval('YEARLY')}
          >
            {t('yearly') || 'Yearly'}
            <span className="ml-1 text-[10px] text-green-600 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full">-17%</span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map(plan => {
          const price = interval === 'YEARLY' ? plan.yearlyPrice : plan.price;
          const isCurrentPlan = subscription?.planId === plan.id;
          const isPopular = plan.name === 'professional';

          return (
            <div 
              key={plan.id} 
              className={`relative p-6 rounded-xl border transition-all ${
                isCurrentPlan 
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                  : isPopular
                    ? 'border-primary/50 shadow-lg'
                    : 'border-border bg-card hover:border-primary/30 hover:shadow-md'
              }`}
            >
              {isPopular && !isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
                    {t('popular') || 'Most Popular'}
                  </span>
                </div>
              )}
              {isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded-full">
                    {t('currentPlan') || 'Current Plan'}
                  </span>
                </div>
              )}

              <div className="mb-6 pt-2">
                <h3 className="text-lg font-bold text-foreground">{plan.displayName}</h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
              </div>

              <div className="mb-6">
                <span className="text-3xl font-bold text-foreground">{plan.currency} {Number(price)}</span>
                <span className="text-muted-foreground text-sm">
                  /{interval === 'YEARLY' ? (t('year') || 'year') : (t('month') || 'month')}
                </span>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600 shrink-0" />
                  <span className="text-muted-foreground">{plan.maxVehicles} {t('vehicles') || 'vehicles'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600 shrink-0" />
                  <span className="text-muted-foreground">{plan.maxUsers} {t('users') || 'users'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600 shrink-0" />
                  <span className="text-muted-foreground">{plan.maxLocations} {t('locations') || 'locations'}</span>
                </div>
                {plan.features?.map(feature => (
                  <div key={feature.id} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600 shrink-0" />
                    <span className="text-muted-foreground">{feature.displayName}</span>
                  </div>
                ))}
              </div>

              <Button
                className="w-full"
                variant={isCurrentPlan ? 'outline' : isPopular ? 'default' : 'outline'}
                disabled={isCurrentPlan || upgrading === plan.id}
                onClick={() => handleUpgrade(plan.id)}
              >
                {upgrading === plan.id && <Loader className="mr-2 h-4 w-4" />}
                {isCurrentPlan 
                  ? (t('currentPlanBtn') || 'Current plan') 
                  : (t('upgradeTo') || 'Upgrade to') + ' ' + plan.displayName
                }
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
