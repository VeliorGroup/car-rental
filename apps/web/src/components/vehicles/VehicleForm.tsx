'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import { useToast } from '@/hooks/use-toast'
import { Loader } from '@/components/ui/loader'

interface BranchListItem {
  id: string
  code: string
  name: string
}

interface VehicleFormProps {
  initialData?: Record<string, unknown>
  onSuccess?: () => void
  onCancel?: () => void
}

export function VehicleForm({ initialData, onSuccess, onCancel }: VehicleFormProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const t = useTranslations('Vehicles')
  const tb = useTranslations('Branches')
  const tc = useTranslations('Common')
  
  const [isSaving, setIsSaving] = useState(false)

  const { data: branchesData } = useQuery({
    queryKey: ['branches-list'],
    queryFn: async () => {
      const response = await api.get('/branches', { params: { limit: 100 } })
      return response.data
    },
  })

  const formSchema = z.object({
    licensePlate: z.string().min(2, t('validationPlate')),
    brand: z.string().min(2, t('validationBrand')),
    model: z.string().min(2, t('validationModel')),
    year: z.number().min(1900, t('validationYear')),
    category: z.enum(["ECONOMY", "COMPACT", "MIDSIZE", "SUV", "LUXURY", "VAN"]),
    color: z.string().optional(),
    currentKm: z.number().min(0, t('validationMileage')),
    purchasePrice: z.string().optional(),
    purchaseDate: z.string().min(1, t('validationPurchaseDate')),
    insuranceExpiry: z.string().min(1, t('validationInsuranceExpiry')),
    reviewDate: z.string().min(1, t('validationReviewDate')),
    status: z.enum(["AVAILABLE", "RENTED", "RESERVED", "MAINTENANCE", "OUT_OF_SERVICE"]),
    location: z.string().optional(),
    branchId: z.string().optional(),
    fuelType: z.string(),
    transmission: z.string(),
    seatCount: z.number().min(1),
    doorCount: z.number().min(2).max(6),
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      licensePlate: "",
      brand: "",
      model: "",
      category: "ECONOMY",
      currentKm: 0,
      purchasePrice: "",
      status: "AVAILABLE",
      location: "",
      branchId: "",
      fuelType: "Diesel",
      transmission: "Manual",
      seatCount: 5,
      doorCount: 4,
      color: "",
      purchaseDate: "",
      insuranceExpiry: "",
      reviewDate: "",
    },
  })

  useEffect(() => {
    if (initialData) {
      form.reset({
        licensePlate: initialData.licensePlate || "",
        brand: initialData.brand || "",
        model: initialData.model || "",
        year: initialData.year || undefined,
        category: initialData.category || "ECONOMY",
        color: initialData.color || "",
        currentKm: initialData.currentKm || 0,
        purchasePrice: initialData.purchasePrice ? String(initialData.purchasePrice) : "",
        purchaseDate: initialData.purchaseDate ? new Date(initialData.purchaseDate).toISOString().split('T')[0] : "",
        insuranceExpiry: initialData.insuranceExpiry ? new Date(initialData.insuranceExpiry).toISOString().split('T')[0] : "",
        reviewDate: initialData.reviewDate ? new Date(initialData.reviewDate).toISOString().split('T')[0] : "",
        status: initialData.status || "AVAILABLE",
        location: initialData.location || "",
        branchId: initialData.branchId || "",
        fuelType: initialData.fuelType || "Diesel",
        transmission: initialData.transmission || "Manual",
        seatCount: initialData.seatCount || 5,
        doorCount: initialData.doorCount || 4,
      })
    }
  }, [initialData, form])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSaving(true)
    try {
      const payload = {
        ...values,
        purchasePrice: values.purchasePrice === '' ? undefined : Number(values.purchasePrice),
        currentKm: Number(values.currentKm),
        year: Number(values.year),
        seatCount: Number(values.seatCount),
        doorCount: Number(values.doorCount),
        branchId: values.branchId === "null" || values.branchId === "" ? null : values.branchId
      }
      
      if (initialData?.id) {
        await api.patch(`/vehicles/${initialData.id}`, payload)
        toast({ title: t('updateSuccess') })
      } else {
        await api.post('/vehicles', payload)
        toast({ title: t('createSuccess') })
      }

      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
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
          {/* Details Section */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm border-b pb-2">{t('sectionDetails')}</h4>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('brand')} <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Toyota" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('model')} <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Corolla" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="licensePlate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('plate')} <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="AA 123 BB" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('year')} <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                      <SelectItem value="ECONOMY">Economy</SelectItem>
                      <SelectItem value="COMPACT">Compact</SelectItem>
                      <SelectItem value="MIDSIZE">Midsize</SelectItem>
                      <SelectItem value="SUV">SUV</SelectItem>
                      <SelectItem value="LUXURY">Luxury</SelectItem>
                      <SelectItem value="VAN">Van</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fuelType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fuelType')} <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('selectFuel')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Diesel">Diesel</SelectItem>
                        <SelectItem value="Petrol">Petrol</SelectItem>
                        <SelectItem value="Hybrid">Hybrid</SelectItem>
                        <SelectItem value="Electric">Electric</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="transmission"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('transmission')} <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('selectTransmission')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Manual">Manual</SelectItem>
                        <SelectItem value="Automatic">Automatic</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Status & Legal Section */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm border-b pb-2">{t('sectionStatus')}</h4>
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('selectStatus')} <span className="text-red-500">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectStatus')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="AVAILABLE">{t('statusAvailable')}</SelectItem>
                      <SelectItem value="RENTED">{t('statusRented')}</SelectItem>
                      <SelectItem value="RESERVED">{t('statusReserved')}</SelectItem>
                      <SelectItem value="MAINTENANCE">{t('statusMaintenance')}</SelectItem>
                      <SelectItem value="OUT_OF_SERVICE">{t('statusOutOfService')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="currentKm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('currentKm')} <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tb('branch')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={tb('searchPlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="null">{tc('none') || "None"}</SelectItem>
                        {branchesData?.branches?.map((branch: BranchListItem) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.code} - {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('purchaseDate')} <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="insuranceExpiry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('insuranceExpiry')} <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reviewDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('reviewDate')} <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
