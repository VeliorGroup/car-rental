'use client'

import { useTranslations } from 'next-intl'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
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
import { ArrowLeft, KeyRound, CheckCircle2, XCircle } from 'lucide-react'
import { Loader } from '@/components/ui/loader'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ResetPasswordPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const locale = params.locale as string || 'en'
  const t = useTranslations()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setError(t('ResetPassword.error.noToken') || 'Invalid reset link. Please request a new password reset.')
    }
  }, [token, t])

  const formSchema = z.object({
    newPassword: z.string().min(8, {
      message: t('ResetPassword.validation.password') || 'Password must be at least 8 characters',
    }),
    confirmPassword: z.string(),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: t('ResetPassword.validation.match') || "Passwords don't match",
    path: ["confirmPassword"],
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!token) return
    
    setIsLoading(true)
    try {
      await api.post('/auth/password/reset', {
        token,
        newPassword: values.newPassword,
      })
      setIsSuccess(true)
      toast({
        title: t('ResetPassword.toast.successTitle') || 'Password Reset',
        description: t('ResetPassword.toast.successDesc') || 'Your password has been reset successfully.',
      })
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to reset password'
      toast({
        variant: "destructive",
        title: t('ResetPassword.toast.failTitle') || 'Error',
        description: message,
      })
      if (message.includes('expired') || message.includes('invalid')) {
        setError(message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle>{t('ResetPassword.error.title') || 'Invalid Link'}</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/${locale}/forgot-password`} className="w-full block">
              <Button className="w-full">
                {t('ResetPassword.error.requestNew') || 'Request New Reset Link'}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle>{t('ResetPassword.success.title') || 'Password Reset!'}</CardTitle>
            <CardDescription>
              {t('ResetPassword.success.description') || 'Your password has been reset successfully. You can now log in with your new password.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/${locale}/business/login`} className="w-full block">
              <Button className="w-full">
                {t('ResetPassword.success.login') || 'Go to Login'}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="w-full max-w-md space-y-6">
        {/* Back Link */}
        <Link 
          href={`/${locale}/business/login`} 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('ForgotPassword.backToLogin') || 'Back to Login'}
        </Link>

        {/* Header */}
        <div className="space-y-2">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {t('ResetPassword.title') || 'Set New Password'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t('ResetPassword.subtitle') || 'Your new password must be at least 8 characters.'}
          </p>
        </div>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground text-sm">
                    {t('ResetPassword.form.newPassword') || 'New Password'}
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="password"
                      placeholder={t('ResetPassword.form.newPasswordPlaceholder') || 'Enter new password'}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground text-sm">
                    {t('ResetPassword.form.confirmPassword') || 'Confirm Password'}
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="password"
                      placeholder={t('ResetPassword.form.confirmPasswordPlaceholder') || 'Confirm new password'}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full py-6 text-base rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-[1.02]" 
              disabled={isLoading}
            >
              {isLoading && <Loader className="mr-2" />}
              {t('ResetPassword.submit') || 'Reset Password'}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  )
}
