'use client'

import { useTranslations, useLocale } from 'next-intl'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useParams } from 'next/navigation'
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
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react'
import { Loader } from '@/components/ui/loader'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ForgotPasswordPage() {
  const params = useParams()
  const locale = params.locale as string || 'en'
  const t = useTranslations()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const formSchema = z.object({
    email: z.string().email({
      message: t('Login.validation.email'),
    }),
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    try {
      await api.post('/auth/password/reset-request', values)
      setIsSuccess(true)
      toast({
        title: t('ForgotPassword.toast.successTitle') || 'Email Sent',
        description: t('ForgotPassword.toast.successDesc') || 'If an account exists with this email, you will receive a password reset link.',
      })
    } catch (error: any) {
      // Always show success to prevent email enumeration
      setIsSuccess(true)
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle>{t('ForgotPassword.success.title') || 'Check Your Email'}</CardTitle>
            <CardDescription>
              {t('ForgotPassword.success.description') || "We've sent a password reset link to your email address. The link will expire in 1 hour."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              {t('ForgotPassword.success.noEmail') || "Didn't receive an email? Check your spam folder or try again."}
            </p>
            <div className="flex flex-col gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsSuccess(false)}
                className="w-full"
              >
                {t('ForgotPassword.success.tryAgain') || 'Try Again'}
              </Button>
              <Link href={`/${locale}/business/login`} className="w-full">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('ForgotPassword.backToLogin') || 'Back to Login'}
                </Button>
              </Link>
            </div>
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
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {t('ForgotPassword.title') || 'Forgot Password?'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t('ForgotPassword.subtitle') || "No worries, we'll send you reset instructions."}
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
                  <FormLabel className="text-foreground text-sm">
                    {t('Login.form.emailLabel') || 'Email'}
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={t('Login.form.emailPlaceholder') || 'Enter your email'}
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
              {t('ForgotPassword.submit') || 'Reset Password'}
            </Button>
          </form>
        </Form>

        {/* Sign In Link */}
        <div className="text-center">
          <Link 
            href={`/${locale}/business/login`} 
            className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
          >
            {t('ForgotPassword.rememberPassword') || 'Remember your password?'} {t('Login.form.signIn') || 'Sign In'}
          </Link>
        </div>
      </div>
    </div>
  )
}
