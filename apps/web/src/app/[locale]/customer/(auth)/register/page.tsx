'use client';

import { useState } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Lock, User, Phone, AlertCircle, CheckCircle, ArrowLeft, Sparkles, Check } from 'lucide-react';
import { publicAuthApi } from '@/lib/public-api';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

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

export default function CustomerRegisterPage() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const locale = params.locale as string;
  const currentLocale = useLocale();
  const t = useTranslations('CustomerAuth');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLanguageChange = (newLocale: string) => {
    const pathWithoutLocale = pathname.replace(`/${currentLocale}`, '');
    window.location.href = `/${newLocale}${pathWithoutLocale}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const validatePassword = (password: string) => {
    if (password.length < 8) return false;
    return true;
  };

  const passwordStrength = formData.password.length >= 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

        // Validate password match
        if (formData.password !== formData.confirmPassword) {
          setError(t('register.passwordsNotMatch'));
          setLoading(false);
          return;
        }

        // Validate password strength
        if (!validatePassword(formData.password)) {
          setError(t('register.passwordTooShort'));
          setLoading(false);
          return;
        }

    try {
      const response = await publicAuthApi.register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
      });
      
      // Store token and customer info
      localStorage.setItem('customerToken', response.accessToken);
      localStorage.setItem('customer', JSON.stringify(response.customer));
      
      // Redirect to portal
      router.push(`/${locale}/customer/portal`);
        } catch (err: any) {
          setError(err.response?.data?.message || t('register.genericError'));
        } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10 border-r flex-col">
        {/* Animated gradient blobs */}
        <div className="absolute top-20 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-20 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col p-12 w-full h-full flex-1">
          {/* Logo */}
          <div className="flex items-center">
            <Link href={`/${locale}`} className="flex items-center gap-2">
              <span className="text-xl font-bold text-foreground tracking-tight">Car Rental</span>
            </Link>
          </div>

          {/* Main Content */}
          <div className="space-y-8 flex-1 flex flex-col justify-center -mt-20">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  <Sparkles className="w-4 h-4" />
                  {t('register.badge')}
                </div>
                <h2 className="text-5xl font-bold text-foreground leading-tight">
                  {t('register.heroTitle')}<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">{t('register.heroSubtitle')}</span>
                </h2>
                <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
                  {t('register.heroDescription')}
                </p>

                {/* Features */}
                <div className="space-y-4 pt-4">
                  {[
                    t('register.feature1'),
                    t('register.feature2'),
                    t('register.feature3'),
                    t('register.feature4'),
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center space-x-3 group">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <CheckCircle className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="text-muted-foreground group-hover:text-foreground transition-colors">{feature}</span>
                    </div>
                  ))}
                </div>
          </div>
        </div>
      </div>

      {/* Right Side - Register Form */}
      <div className="flex-1 flex flex-col bg-background relative">
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
          <div className="w-full max-w-md space-y-6">
            {/* Back Link - Desktop only */}
            <Link 
              href={`/${locale}`} 
              className="hidden lg:inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('backToHome')}
            </Link>

              {/* Header */}
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">
                  {t('register.title')}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {t('register.subtitle')}
                </p>
              </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-foreground text-sm">{t('firstName')}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="firstName"
                        name="firstName"
                        placeholder={t('firstNamePlaceholder')}
                        value={formData.firstName}
                        onChange={handleChange}
                        className="pl-10 h-11"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-foreground text-sm">{t('lastName')}</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      placeholder={t('lastNamePlaceholder')}
                      value={formData.lastName}
                      onChange={handleChange}
                      className="h-11"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground text-sm">{t('email')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder={t('emailPlaceholder')}
                      value={formData.email}
                      onChange={handleChange}
                      className="pl-10 h-11"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-foreground text-sm">{t('phone')}</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder={t('phonePlaceholder')}
                      value={formData.phone}
                      onChange={handleChange}
                      className="pl-10 h-11"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground text-sm">{t('password')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      className="pl-10 h-11"
                      required
                    />
                  </div>
                  {formData.password && (
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className={cn("flex items-center gap-1", passwordStrength ? "text-green-600" : "")}>
                        <Check className={cn("h-3 w-3", passwordStrength ? "" : "opacity-0")} />
                        {t('register.passwordMinLength')}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-foreground text-sm">{t('confirmPassword')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="pl-10 h-11"
                      required
                    />
                  </div>
                  {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <p className="text-xs text-destructive">{t('register.passwordsNotMatch')}</p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full py-6 text-base rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-[1.02]" 
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('register.submit')}
                </Button>
          </form>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-4 text-muted-foreground">
                    {t('register.hasAccount')}
                  </span>
                </div>
              </div>

            {/* Sign In Link */}
            <div className="text-center">
              <Link 
                href={`/${locale}/customer/login`} 
                className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
              >
                {t('register.loginLink')} →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
