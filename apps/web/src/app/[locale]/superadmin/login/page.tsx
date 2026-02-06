'use client'

import { useState } from 'react'
import { useRouter, useParams, usePathname } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Shield, Globe, Lock, Mail, Sparkles, Eye, EyeOff } from 'lucide-react'
import { Loader } from '@/components/ui/loader'
import { useToast } from '@/hooks/use-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

export default function SuperAdminLoginPage() {
  const router = useRouter()
  const params = useParams()
  const pathname = usePathname()
  const locale = params.locale as string
  const currentLocale = useLocale()
  const t = useTranslations('SuperAdmin')
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || t('loginFailed'))
      }

      localStorage.setItem('superadmin_token', data.access_token)
      localStorage.setItem('superadmin_user', JSON.stringify(data.admin))
      
      toast({
        title: t('loginSuccess'),
        description: t('welcomeBack', { name: data.admin.firstName }),
      })

      router.push(`/${locale}/superadmin/dashboard`)
    } catch (error) {
      toast({
        title: t('loginFailed'),
        description: error instanceof Error ? error.message : t('invalidCredentials'),
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
        
        {/* Animated gradient orbs */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-violet-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full h-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">FleetPulse</span>
          </div>

          {/* Main Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm font-medium border border-white/10">
              <Sparkles className="w-4 h-4 text-primary" />
              Super Admin Access
            </div>
            <h1 className="text-5xl font-bold text-white leading-tight">
              Platform<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-violet-400 to-primary">Control Center</span>
            </h1>
            <p className="text-lg text-slate-400 max-w-md leading-relaxed">
              Manage all tenants, subscriptions, analytics, and platform-wide settings from a single powerful dashboard.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-4">
              <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="text-3xl font-bold text-white">100+</div>
                <div className="text-sm text-slate-400">Active Tenants</div>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="text-3xl font-bold text-white">5K+</div>
                <div className="text-sm text-slate-400">Vehicles</div>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="text-3xl font-bold text-white">99.9%</div>
                <div className="text-sm text-slate-400">Uptime</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-sm text-slate-500">
            © 2026 FleetPulse. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex flex-col bg-background relative">
        {/* Background effects for right side */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-violet-500/5" />
        
        {/* Language Selector - Top Right */}
        <div className="absolute top-6 right-6 z-20">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 bg-background/80 backdrop-blur-sm">
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
        <div className="lg:hidden p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground tracking-tight">FleetPulse</span>
          </div>
        </div>

        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center p-8 relative z-10">
          <div className="w-full max-w-md space-y-8">
            {/* Header */}
            <div className="text-center lg:text-left space-y-2">
              <div className="lg:hidden mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center mb-6 shadow-lg shadow-primary/25">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-foreground">{t('title')}</h2>
              <p className="text-muted-foreground">
                {t('description')}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">{t('email')}</Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    placeholder="superadmin@fleetpulse.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-14 pl-16 text-base"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">{t('password')}</Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-14 pl-16 pr-14 text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Eye className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-14 text-base font-semibold rounded-xl bg-gradient-to-r from-primary to-violet-500 hover:from-primary/90 hover:to-violet-500/90 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 hover:scale-[1.02]" 
                disabled={isLoading}
              >
                {isLoading && <Loader className="mr-2" />}
                {t('signIn')}
              </Button>
            </form>

            {/* Security Note */}
            <div className="p-4 rounded-xl bg-muted/50 border border-border">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <div className="text-sm">
                  <p className="font-medium text-foreground">Secure Access</p>
                  <p className="text-muted-foreground">This portal is protected with enterprise-grade security. All sessions are encrypted and monitored.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
