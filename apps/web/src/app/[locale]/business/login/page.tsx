'use client'

import { useTranslations, useLocale } from 'next-intl'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useRouter, useParams, usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/store/auth'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Sparkles, Globe } from 'lucide-react'
import { Loader } from '@/components/ui/loader'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Schema moved inside component for i18n

export default function LoginPage() {
  const router = useRouter()
  const params = useParams()
  const pathname = usePathname()
  const locale = params.locale as string || 'en'
  const currentLocale = useLocale()
  const t = useTranslations()
  const { login } = useAuthStore()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

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
  ]

  const handleLanguageChange = (newLocale: string) => {
    const pathWithoutLocale = pathname.replace(`/${currentLocale}`, '')
    window.location.href = `/${newLocale}${pathWithoutLocale}`
  }


  const formSchema = z.object({
    email: z.string().email({
      message: t('Login.validation.email'),
    }),
    password: z.string().min(6, {
      message: t('Login.validation.password'),
    }),
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    try {
      const response = await api.post('/auth/login', values)
      const { access_token, user } = response.data
      
      login(access_token, user)
      
      toast({
        title: t('Login.toast.successTitle'),
        description: t('Login.toast.successDesc'),
      })
      
      setTimeout(() => {
        router.push(`/${locale}/dashboard`)
      }, 300)
    } catch (error: any) {
      const msg = error.response?.data?.message || '';
      
      let title = t('Login.toast.failTitle');
      let description = t('Login.toast.failDefault');

      if (msg === 'TENANT_INACTIVE' || msg === 'Tenant subscription is inactive') {
        title = t('Login.toast.subscriptionExpiredTitle');
        description = t('Login.toast.subscriptionExpiredDesc');
      } else if (msg === 'Invalid credentials' || msg === 'User not found') {
        title = t('Login.toast.invalidCredentialsTitle');
        description = t('Login.toast.invalidCredentialsDesc');
      } else if (msg === 'Invalid 2FA code') {
        title = t('Login.toast.twoFactorFailedTitle');
        description = t('Login.toast.twoFactorFailedDesc');
      } else if (msg) {
         description = msg;
      }

      toast({
        variant: "destructive",
        title,
        description,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Side - Branding with Border */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10 border-r flex-col">
        {/* Animated gradient blobs */}
        <div className="absolute top-20 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-20 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col p-12 w-full h-full flex-1">
          {/* Logo */}
          <div className="flex items-center">
            <span className="text-xl font-bold text-foreground tracking-tight">{t('Home.brand')}</span>
          </div>

          {/* Main Content */}
          <div className="space-y-8 flex-1 flex flex-col justify-center -mt-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              {t('Login.branding.badge')}
            </div>
            <h2 className="text-5xl font-bold text-foreground leading-tight">
              {t('Login.branding.title')}<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">{t('Login.branding.subtitle')}</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
              {t('Login.branding.description')}
            </p>
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
              {t('Login.form.backToHome')}
            </Link>

          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              {t('Login.form.welcome')}
            </h1>
            <p className="text-muted-foreground text-sm">
              {t('Login.form.subtitle')}
            </p>
          </div>

          {/* Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground text-sm">{t('Login.form.emailLabel')}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={t('Login.form.emailPlaceholder')}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground text-sm">{t('Login.form.passwordLabel')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder={t('Login.form.passwordPlaceholder')}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Forgot Password */}
              <div className="flex justify-end">
                <Link 
                  href={`/${locale}/forgot-password`}
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  {t('Login.form.forgotPassword')}
                </Link>
              </div>

              <Button type="submit" className="w-full py-6 text-base rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-[1.02]" disabled={isLoading}>
                {isLoading && <Loader className="mr-2" />}
                {t('Login.form.signIn')}
              </Button>
            </form>
          </Form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-4 text-muted-foreground">
                {t('Login.form.newTo')}
              </span>
            </div>
          </div>

            {/* Sign Up Link */}
            <div className="text-center">
              <Link 
                href={`/${locale}/business/register`} 
                className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
              >
                {t('Login.form.createAccount')} →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}