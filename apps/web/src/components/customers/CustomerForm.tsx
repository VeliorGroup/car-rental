'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader } from '@/components/ui/loader'

const COUNTRIES = [
  'Albania', 'Andorra', 'Austria', 'Belarus', 'Belgium', 'Bosnia and Herzegovina',
  'Bulgaria', 'Croatia', 'Cyprus', 'Czech Republic', 'Denmark', 'Estonia',
  'Finland', 'France', 'Germany', 'Greece', 'Hungary', 'Iceland', 'Ireland',
  'Italy', 'Kosovo', 'Latvia', 'Liechtenstein', 'Lithuania', 'Luxembourg',
  'Malta', 'Moldova', 'Monaco', 'Montenegro', 'Netherlands', 'North Macedonia',
  'Norway', 'Poland', 'Portugal', 'Romania', 'Russia', 'San Marino', 'Serbia',
  'Slovakia', 'Slovenia', 'Spain', 'Sweden', 'Switzerland', 'Turkey', 'Ukraine',
  'United Kingdom', 'Vatican City'
]

interface CustomerFormProps {
  initialData?: Record<string, unknown>
  onSuccess?: () => void
  onCancel?: () => void
}

export function CustomerForm({ initialData, onSuccess, onCancel }: CustomerFormProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const t = useTranslations('Customers')
  const tc = useTranslations('Common')
  
  const [isSaving, setIsSaving] = useState(false)
  const [files, setFiles] = useState<{
    licenseFront?: File
    licenseBack?: File
    idCardFront?: File
    idCardBack?: File
  }>({})
  const [countrySearch, setCountrySearch] = useState('')

  const formSchema = z.object({
    firstName: z.string().min(2, t('validationFirstName')),
    lastName: z.string().min(2, t('validationLastName')),
    email: z.string().email(t('validationEmail')),
    phone: z.string().min(5, t('validationPhone')),
    dateOfBirth: z.string().min(1, t('validationDob')),
    idCardNumber: z.string().min(5, t('validationIdCard')),
    licenseNumber: z.string().min(5, t('validationLicense')),
    licenseExpiry: z.string().min(1, t('validationLicenseExpiry')),
    address: z.string().optional(),
    city: z.string().optional(),
    country: z.string().min(1, t('validationCountry')),
    category: z.enum(["STANDARD", "BUSINESS", "PREMIUM"]),
    status: z.enum(["ACTIVE", "SUSPENDED", "LICENSE_EXPIRED", "BLACKLISTED"]),
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      country: "Albania",
      category: "STANDARD",
      dateOfBirth: "",
      idCardNumber: "",
      licenseNumber: "",
      licenseExpiry: "",
      address: "",
      city: "",
      status: "ACTIVE",
    },
  })

  useEffect(() => {
    if (initialData) {
      form.reset({
        firstName: initialData.firstName || "",
        lastName: initialData.lastName || "",
        email: initialData.email || "",
        phone: initialData.phone || "",
        dateOfBirth: initialData.dateOfBirth ? new Date(initialData.dateOfBirth).toISOString().split('T')[0] : "",
        idCardNumber: initialData.idCardNumber || "",
        licenseNumber: initialData.licenseNumber || "",
        licenseExpiry: initialData.licenseExpiry ? new Date(initialData.licenseExpiry).toISOString().split('T')[0] : "",
        address: initialData.address || "",
        city: initialData.city || "",
        country: initialData.country || "Albania",
        category: initialData.category || "STANDARD",
        status: initialData.status || "ACTIVE",
      })
    }
  }, [initialData, form])

  const handleFileChange = (key: keyof typeof files) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFiles(prev => ({ ...prev, [key]: e.target.files![0] }))
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSaving(true)
    try {
      const formData = new FormData()
      
      Object.entries(values).forEach(([key, value]) => {
        if (value) formData.append(key, value as string)
      })

      if (files.licenseFront) formData.append('licenseFront', files.licenseFront)
      if (files.licenseBack) formData.append('licenseBack', files.licenseBack)
      if (files.idCardFront) formData.append('idCardFront', files.idCardFront)
      if (files.idCardBack) formData.append('idCardBack', files.idCardBack)

      if (initialData?.id) {
        await api.patch(`/customers/${initialData.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        toast({ title: t('updateSuccess') })
      } else {
        await api.post('/customers', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        toast({ title: t('createSuccess') })
      }

      queryClient.invalidateQueries({ queryKey: ['customers'] })
      onSuccess?.()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast({
        variant: "destructive",
        title: initialData?.id ? t('updateError') : t('createError'),
        description: err.response?.data?.message || 'Error',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Info */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm border-b pb-2">{t('personalInfo')}</h4>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('placeholderFirstName')} <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder={t('placeholderFirstName')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('placeholderLastName')} <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder={t('placeholderLastName')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('email')} <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input type="email" placeholder={t('placeholderEmail')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('phone')} <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder={t('placeholderPhone')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dateOfBirth')} <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('placeholderCity')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('placeholderCity')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('country')} <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('selectCountry')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <div className="p-2">
                          <Input
                            placeholder={t('searchCountry')}
                            value={countrySearch}
                            onChange={(e) => setCountrySearch(e.target.value)}
                            className="mb-2"
                          />
                        </div>
                        <div className="max-h-[200px] overflow-y-auto">
                          {COUNTRIES
                            .filter(c => c.toLowerCase().includes(countrySearch.toLowerCase()))
                            .map((country) => (
                              <SelectItem key={country} value={country}>{country}</SelectItem>
                            ))}
                        </div>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('placeholderAddress')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('placeholderAddress')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Identity & License */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm border-b pb-2">{t('identityLicense')}</h4>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="idCardNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('placeholderIdCard')} <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder={t('placeholderIdCard')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="licenseNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('placeholderLicense')} <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder={t('placeholderLicense')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="licenseExpiry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('expiry')} <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('category')} <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('selectCategory')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="STANDARD">{t('standard')}</SelectItem>
                        <SelectItem value="BUSINESS">{t('business')}</SelectItem>
                        <SelectItem value="PREMIUM">{t('premium')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {initialData && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tc('status')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ACTIVE">{t('statusActive')}</SelectItem>
                        <SelectItem value="SUSPENDED">{t('statusSuspended')}</SelectItem>
                        <SelectItem value="LICENSE_EXPIRED">{t('statusLicenseExpired')}</SelectItem>
                        <SelectItem value="BLACKLISTED">{t('statusBlacklisted')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="space-y-4 pt-4">
              <h4 className="font-medium text-sm border-b pb-2">{t('documents')}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">{t('licenseFront')}</Label>
                  <Input type="file" accept="image/*" onChange={handleFileChange('licenseFront')} className="text-xs h-8" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{t('licenseBack')}</Label>
                  <Input type="file" accept="image/*" onChange={handleFileChange('licenseBack')} className="text-xs h-8" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{t('idCardFront')}</Label>
                  <Input type="file" accept="image/*" onChange={handleFileChange('idCardFront')} className="text-xs h-8" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{t('idCardBack')}</Label>
                  <Input type="file" accept="image/*" onChange={handleFileChange('idCardBack')} className="text-xs h-8" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 border-t pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              {tc('cancel')}
            </Button>
          )}
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader className="mr-2" />}
            {tc('save')}
          </Button>
        </div>
      </form>
    </Form>
  )
}
