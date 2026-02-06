'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  User, Mail, Phone, Calendar, Shield, Save, 
  CheckCircle, AlertCircle
} from 'lucide-react';
import { publicAuthApi } from '@/lib/public-api';
import { format } from 'date-fns';
import { enUS, it, sq, es, fr, de, pt, el, ro } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

const localeMap: Record<string, any> = {
  en: enUS,
  it: it,
  sq: sq,
  es: es,
  fr: fr,
  de: de,
  pt: pt,
  el: el,
  ro: ro,
};

export default function CustomerProfilePage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations('CustomerPortal.profile');
  const tCommon = useTranslations('CustomerPortal.common');
  
  const dateLocale = localeMap[locale] || enUS;

  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  });

  useEffect(() => {
    const loadProfile = async () => {
      const token = localStorage.getItem('customerToken');
      if (!token) {
        router.push(`/${locale}/customer/login`);
        return;
      }

      try {
        const profile = await publicAuthApi.getProfile();
        setCustomer(profile);
        setFormData({
          firstName: profile.firstName || '',
          lastName: profile.lastName || '',
          phone: profile.phone || '',
        });
      } catch (error) {
        localStorage.removeItem('customerToken');
        localStorage.removeItem('customer');
        router.push(`/${locale}/customer/login`);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [locale, router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await publicAuthApi.updateProfile(formData);
      toast({ title: t('saveSuccess') });
      setCustomer({ ...customer, ...formData });
    } catch (error) {
      toast({ title: t('saveError'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Edit Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              {t('personalInfo')}
            </CardTitle>
            <CardDescription>
              {t('personalInfoDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">{t('firstName')}</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">{t('lastName')}</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                value={customer?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                {t('emailNotEditable')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t('phone')}</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder={t('phonePlaceholder')}
              />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
              <Save className="h-4 w-4" />
              {saving ? t('saving') : t('saveChanges')}
            </Button>
          </CardContent>
        </Card>

        {/* Account Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {t('accountStatus')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{t('emailVerified')}</span>
                </div>
                {customer?.isVerified ? (
                  <Badge className="bg-green-100 text-green-800 gap-1">
                    <CheckCircle className="h-3 w-3" />
                    {t('verified')}
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {t('notVerified')}
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{t('memberSince')}</span>
                </div>
                <span className="text-sm font-medium">
                  {customer?.createdAt 
                    ? format(new Date(customer.createdAt), 'dd MMMM yyyy', { locale: dateLocale })
                    : 'N/D'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{t('customerId')}</span>
                </div>
                <span className="text-xs font-mono text-muted-foreground">
                  {customer?.id?.slice(0, 8)}...
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Phone className="h-4 w-4" />
                {t('contacts')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{tCommon('email')}</p>
                  <p className="text-sm font-medium">{customer?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{tCommon('phone')}</p>
                  <p className="text-sm font-medium">{customer?.phone || t('notSpecified')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
