'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Check, Building2, User, CreditCard, CheckCircle, ArrowLeft, Sparkles, Globe, ChevronDown } from 'lucide-react';
import { Loader } from '@/components/ui/loader';
import api from '@/lib/api';
import { cities, searchCities } from '@/lib/constants/cities';
import { getCountryCodeForLocale } from '@/lib/constants/locale-country';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Types
interface Feature {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  icon?: string;
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

interface RegisterData {
  planId: string;
  companyName: string;
  vatNumber: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  referralCode: string;
  interval: 'MONTHLY' | 'YEARLY';
}

export default function RegisterPage() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const locale = params.locale as string || 'en';
  const currentLocale = useLocale();
  const t = useTranslations();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'sq', name: 'Shqip', flag: '🇦🇱' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
    { code: 'el', name: 'Ελληνικά', flag: '🇬🇷' },
    { code: 'ro', name: 'Română', flag: '🇷🇴' },
    { code: 'mk', name: 'Македонски', flag: '🇲🇰' },
    { code: 'sr', name: 'Српски', flag: '🇷🇸' },
  ];

  const handleLanguageChange = (newLocale: string) => {
    const pathWithoutLocale = pathname.replace(`/${currentLocale}`, '');
    window.location.href = `/${newLocale}${pathWithoutLocale}`;
  };
  const [plans, setPlans] = useState<Plan[]>([]);
  const [formData, setFormData] = useState<RegisterData>({
    planId: '',
    companyName: '',
    vatNumber: '',
    address: '',
    city: '',
    country: 'AL',
    phone: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    referralCode: '',
    interval: 'MONTHLY',
  });

  // City autocomplete state
  const [citySearch, setCitySearch] = useState('');
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const filteredCities = searchCities(citySearch);

  useEffect(() => {
    fetchPlans();
  }, [locale]);

  const fetchPlans = async () => {
    try {
      const countryCode = getCountryCodeForLocale(locale);
      const response = await api.get('/subscriptions/plans', {
        params: { countryCode }
      });
      const availablePlans = response.data.filter((plan: Plan) => Number(plan.price) > 0);
      const sortedPlans = availablePlans.sort((a: Plan, b: Plan) => Number(a.price) - Number(b.price));
      setPlans(sortedPlans);
    } catch (error) {
      console.error('Failed to fetch plans', error);
    }
  };

  const handleNext = () => {
    if (step === 1 && !formData.planId) {
      toast({ title: t('Register.toast.selectPlan'), variant: 'destructive' });
      return;
    }
    if (step === 2) {
      if (!formData.companyName || !formData.phone) {
        toast({ title: t('Register.toast.fillRequired'), variant: 'destructive' });
        return;
      }
    }
    if (step === 3) {
      if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
        toast({ title: t('Register.toast.fillRequired'), variant: 'destructive' });
        return;
      }
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.post('/auth/register-tenant', formData);
      toast({
        title: t('Register.toast.successTitle'),
        description: t('Register.toast.successDesc'),
      });
      setTimeout(() => {
        router.push(`/${locale}/business/login`);
      }, 2000);
    } catch (error: any) {
      toast({
        title: t('Register.toast.failTitle'),
        description: error.response?.data?.message || t('Register.toast.failDefault'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof RegisterData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const steps = [
    { num: 1, label: t('Register.steps.plan'), icon: CreditCard },
    { num: 2, label: t('Register.steps.company'), icon: Building2 },
    { num: 3, label: t('Register.steps.account'), icon: User },
    { num: 4, label: t('Register.steps.confirm'), icon: CheckCircle },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-2/5 relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10 border-r flex-col">
        {/* Animated gradient blobs */}
        <div className="absolute top-10 -left-10 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-20 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
        
        <div className="relative z-10 flex flex-col h-full p-12 w-full">
          {/* Logo */}
          <Link href={`/${locale}`} className="flex items-center flex-none">
            <span className="text-xl font-bold text-foreground tracking-tight">Car Rental</span>
          </Link>

          {/* Main Content */}
          <div className="space-y-8 flex-1 flex flex-col justify-center -mt-20">
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-primary/10 w-fit">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-primary text-sm font-medium">{t('Register.hero.trial')}</span>
            </div>
            <h2 className="text-5xl font-bold text-foreground leading-tight">
              {t('Register.hero.title')}<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">{t('Register.hero.subtitle')}</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
              {t('Register.hero.description')}
            </p>

            {/* Features */}
            <div className="space-y-4 pt-4">
              {(t.raw('Register.hero.features') as string[]).map((feature, i) => (
                <div key={i} className="flex items-center space-x-3 group">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Check className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-muted-foreground group-hover:text-foreground transition-colors">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col bg-background text-foreground relative">
        {/* Language Selector - Desktop Top Right */}
        <div className="hidden lg:block absolute top-6 right-6 z-20">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Globe className="h-4 w-4" />
                {languages.find(l => l.code === currentLocale)?.flag}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {languages.map(lang => (
                <DropdownMenuItem 
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={currentLocale === lang.code ? 'bg-accent' : ''}
                >
                  <span className="mr-2">{lang.flag}</span>
                  {lang.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-border">
          {/* Back Button */}
          <Link href={`/${locale}`} className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-accent transition-colors">
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </Link>
          
          {/* Logo */}
          <Link href={`/${locale}`} className="flex items-center">
            <div className="flex flex-col">
              <span className="text-base font-semibold text-foreground leading-tight">Car Rental</span>
              <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Enterprise</span>
            </div>
          </Link>
          
          {/* Language */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Globe className="h-4 w-4" />
                {languages.find(l => l.code === currentLocale)?.flag}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {languages.map(lang => (
                <DropdownMenuItem 
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={currentLocale === lang.code ? 'bg-accent' : ''}
                >
                  <span className="mr-2">{lang.flag}</span>
                  {lang.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md space-y-8">
            {/* Back Link - Desktop only */}
            <Link 
              href={`/${locale}`} 
              className="hidden lg:inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('Register.nav.backHome')}
            </Link>
            {/* Progress Steps */}
            <div className="flex items-center w-full">
              {steps.map((s, i) => (
                <div key={s.num} className={`flex items-center ${i < 3 ? 'flex-1' : ''}`}>
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors shrink-0 ${
                    step >= s.num 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {step > s.num ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
                  </div>
                  {i < 3 && (
                    <div className={`flex-1 h-0.5 mx-2 ${step > s.num ? 'bg-primary' : 'bg-muted'}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Step 1: Plan Selection */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-2xl font-bold text-foreground">{t('Register.step1.title')}</h2>
                    <div className="flex items-center space-x-2 bg-muted p-1 rounded-lg">
                      <button
                        className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
                          formData.interval === 'MONTHLY' 
                            ? 'bg-background text-foreground shadow-sm' 
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                        onClick={() => updateField('interval', 'MONTHLY')}
                      >
                        {t('Register.step1.monthly')}
                      </button>
                      <button
                        className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
                          formData.interval === 'YEARLY' 
                            ? 'bg-background text-foreground shadow-sm' 
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                        onClick={() => updateField('interval', 'YEARLY')}
                      >
                        {t('Register.step1.yearly')}
                        <span className="ml-1 text-[10px] text-green-600 bg-green-100 px-1 rounded-full">-17%</span>
                      </button>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm mt-1">{t('Register.step1.subtitle')}</p>
                </div>

                <div className="space-y-3">
                  {plans.map(plan => {
                    const price = formData.interval === 'YEARLY' ? plan.yearlyPrice : plan.price;
                    const displayPrice = price > 0 ? price : plan.price * 10;
                    
                    return (
                    <div 
                      key={plan.id} 
                      className={`relative p-4 rounded-lg border cursor-pointer transition-all ${
                        formData.planId === plan.id 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border bg-card hover:border-primary/50'
                      }`}
                      onClick={() => updateField('planId', plan.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            formData.planId === plan.id ? 'border-primary bg-primary' : 'border-muted-foreground'
                          }`}>
                            {formData.planId === plan.id && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                          </div>
                          <div>
                            <span className="text-foreground font-medium">{plan.displayName}</span>
                            <div className="text-muted-foreground text-xs">
                              {plan.maxVehicles} {t('Register.step1.vehicles')} • {plan.maxUsers} {t('Register.step1.users')}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-bold text-foreground">{plan.currency} {Number(displayPrice)}</span>
                          <span className="text-muted-foreground text-sm block">
                             /{formData.interval === 'YEARLY' ? t('Register.step1.year') : t('Register.step1.month')}
                          </span>
                        </div>
                      </div>
                    </div>
                  )})} 
                </div>
              </div>
            )}

            {/* Step 2: Company Details */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{t('Register.step2.title')}</h2>
                  <p className="text-muted-foreground text-sm mt-1">{t('Register.step2.subtitle')}</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-foreground text-sm">{t('Register.step2.companyName')} *</Label>
                    <Input 
                      value={formData.companyName} 
                      onChange={e => updateField('companyName', e.target.value)} 
                      placeholder="Eagle Rent Car"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground text-sm">{t('Register.step2.phone')} *</Label>
                    <Input 
                      value={formData.phone} 
                      onChange={e => updateField('phone', e.target.value)} 
                      placeholder="+355 69 123 4567"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-foreground text-sm">{t('Register.step2.city')}</Label>
                      <Popover open={cityDropdownOpen} onOpenChange={setCityDropdownOpen}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          >
                            <span className={formData.city ? 'text-foreground' : 'text-muted-foreground'}>
                              {formData.city || 'Seleziona città'}
                            </span>
                            <ChevronDown className="h-4 w-4 opacity-50" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-0" align="start">
                          <div className="p-2">
                            <Input
                              placeholder="Cerca città..."
                              value={citySearch}
                              onChange={(e) => setCitySearch(e.target.value)}
                              className="h-8"
                            />
                          </div>
                          <div className="max-h-[200px] overflow-y-auto">
                            {filteredCities.length > 0 ? (
                              filteredCities.map((city) => (
                                <button
                                  key={city.value}
                                  type="button"
                                  className={`w-full px-3 py-2 text-left text-sm hover:bg-accent ${formData.city === city.value ? 'bg-accent' : ''}`}
                                  onClick={() => {
                                    updateField('city', city.value);
                                    setCityDropdownOpen(false);
                                    setCitySearch('');
                                  }}
                                >
                                  {city.label}
                                </button>
                              ))
                            ) : (
                              <div className="px-3 py-2 text-sm text-muted-foreground">
                                Nessuna città trovata
                              </div>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground text-sm">{t('Register.step2.vat')}</Label>
                      <Input 
                        value={formData.vatNumber} 
                        onChange={e => updateField('vatNumber', e.target.value)} 
                        placeholder="L12345678A"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground text-sm">{t('Register.step2.address')}</Label>
                    <Input 
                      value={formData.address} 
                      onChange={e => updateField('address', e.target.value)} 
                      placeholder="Rruga e Durresit, Nr. 10"
                    />
                  </div>
                  <div className="pt-2 border-t border-border mt-4">
                    <div className="space-y-2">
                      <Label className="text-foreground text-sm flex items-center gap-2">
                         <Sparkles className="w-3 h-3 text-yellow-500" />
                         {t('Register.step2.referralCode')}
                      </Label>
                      <Input 
                        value={formData.referralCode} 
                        onChange={e => updateField('referralCode', e.target.value)} 
                        placeholder="e.g. USER-123"
                        className="bg-muted/30"
                      />
                      <p className="text-[10px] text-muted-foreground">{t('Register.step2.referralHelp') || 'Enter a referral code if you have one.'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: User Details */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{t('Register.step3.title')}</h2>
                  <p className="text-muted-foreground text-sm mt-1">{t('Register.step3.subtitle')}</p>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-foreground text-sm">{t('Register.step3.firstName')} *</Label>
                      <Input 
                        value={formData.firstName} 
                        onChange={e => updateField('firstName', e.target.value)} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground text-sm">{t('Register.step3.lastName')} *</Label>
                      <Input 
                        value={formData.lastName} 
                        onChange={e => updateField('lastName', e.target.value)} 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground text-sm">{t('Register.step3.email')} *</Label>
                    <Input 
                      type="email"
                      value={formData.email} 
                      onChange={e => updateField('email', e.target.value)} 
                      placeholder="admin@company.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground text-sm">{t('Register.step3.password')} *</Label>
                    <Input 
                      type="password"
                      value={formData.password} 
                      onChange={e => updateField('password', e.target.value)} 
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{t('Register.step4.title')}</h2>
                  <p className="text-muted-foreground text-sm mt-1">{t('Register.step4.subtitle')}</p>
                </div>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-card border border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <CreditCard className="w-5 h-5 text-primary" />
                        <span className="text-foreground font-medium">
                          {plans.find(p => p.id === formData.planId)?.displayName}
                        </span>
                      </div>
                      <span className="text-foreground font-bold">
                        {plans.find(p => p.id === formData.planId)?.currency} {Number(plans.find(p => p.id === formData.planId)?.price)}{t('Register.step1.perMonth')}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-card border border-border">
                      <Building2 className="w-4 h-4 text-primary mb-2" />
                      <div className="text-foreground text-sm font-medium">{formData.companyName}</div>
                      <div className="text-muted-foreground text-xs">{formData.phone}</div>
                      <div className="text-muted-foreground text-xs">{formData.city}</div>
                    </div>
                    <div className="p-4 rounded-lg bg-card border border-border">
                      <User className="w-4 h-4 text-primary mb-2" />
                      <div className="text-foreground text-sm font-medium">{formData.firstName} {formData.lastName}</div>
                      <div className="text-muted-foreground text-xs">{formData.email}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              {step > 1 ? (
                <Button variant="outline" onClick={handleBack}>
                  {t('Register.nav.back')}
                </Button>
              ) : (
                <div />
              )}
              
              {step < 4 ? (
                <Button onClick={handleNext}>{t('Register.nav.continue')}</Button>
              ) : (
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading && <Loader className="mr-2" />}
                  {t('Register.step4.create')}
                </Button>
              )}
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-4 text-muted-foreground">
                  {t('Register.nav.alreadyAccount')}
                </span>
              </div>
            </div>

            {/* Sign In Link */}
            <div className="text-center">
              <Link 
                href={`/${locale}/business/login`} 
                className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
              >
                {t('Register.nav.signIn')} →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
