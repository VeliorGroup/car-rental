'use client';

import { useState } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Lock, AlertCircle, ArrowLeft, Sparkles, CheckCircle } from 'lucide-react';
import { publicAuthApi } from '@/lib/public-api';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';

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

export default function CustomerLoginPage() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const locale = params.locale as string;
  const currentLocale = useLocale();
  const t = useTranslations('CustomerAuth');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLanguageChange = (newLocale: string) => {
    const pathWithoutLocale = pathname.replace(`/${currentLocale}`, '');
    window.location.href = `/${newLocale}${pathWithoutLocale}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await publicAuthApi.login({ email, password });
      
      // Store token and customer info
      localStorage.setItem('customerToken', response.accessToken);
      localStorage.setItem('customer', JSON.stringify(response.customer));
      
      // Redirect to portal or previous page
      const redirect = new URLSearchParams(window.location.search).get('redirect');
      router.push(redirect || `/${locale}/customer/portal`);
        } catch (err: any) {
          setError(err.response?.data?.message || t('login.invalidCredentials'));
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
                  {t('login.badge')}
                </div>
                <h2 className="text-5xl font-bold text-foreground leading-tight">
                  {t('login.heroTitle')}<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">{t('login.heroSubtitle')}</span>
                </h2>
                <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
                  {t('login.heroDescription')}
                </p>

                {/* Features */}
                <div className="space-y-4 pt-4">
                  {[
                    t('login.feature1'),
                    t('login.feature2'),
                    t('login.feature3'),
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

      {/* Right Side - Login Form */}
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
          <div className="w-full max-w-sm space-y-6">
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
                  {t('login.title')}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {t('login.subtitle')}
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

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground text-sm">{t('email')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder={t('emailPlaceholder')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-11"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="password" className="text-foreground text-sm">{t('password')}</Label>
                    <Link 
                      href={`/${locale}/customer/forgot-password`}
                      className="text-sm text-primary hover:underline"
                    >
                      {t('login.forgotPassword')}
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 h-11"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full py-6 text-base rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-[1.02]" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('login.submit')}
                </Button>
          </form>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-4 text-muted-foreground">
                    {t('login.noAccount')}
                  </span>
                </div>
              </div>

            {/* Sign Up Link */}
            <div className="text-center">
              <Link 
                href={`/${locale}/customer/register`} 
                className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
              >
                {t('login.registerLink')} →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
