'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Calculator, Check, ChevronsUpDown } from 'lucide-react'
import { Loader } from '@/components/ui/loader'
import { formatCurrency, cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { DateTimePicker } from "@/components/ui/datetime-picker"
import { useParams } from 'next/navigation'


interface PriceCalculation {
  dailyPrice: number
  totalPrice: number
  finalPrice: number
  days: number
  discount?: number
}

interface CustomerListItem {
  id: string
  firstName: string
  lastName: string
  licenseNumber: string
}

interface VehicleListItem {
  id: string
  brand: string
  model: string
  licensePlate: string
}

interface BookingFormProps {
  initialData?: Record<string, unknown>
  bookingId?: string
  mode?: 'create' | 'edit'
  onSuccess?: () => void
  onCancel?: () => void
}

export function BookingForm({ initialData, bookingId, mode = 'create', onSuccess, onCancel }: BookingFormProps) {
  const router = useRouter()
  const params = useParams()
  const locale = (params?.locale as string) || 'en'
  const { toast } = useToast()
  const t = useTranslations('Bookings')
  const [isLoading, setIsLoading] = useState(false)
  const [priceCalculation, setPriceCalculation] = useState<PriceCalculation | null>(null)
  const [customerOpen, setCustomerOpen] = useState(false)
  const [vehicleOpen, setVehicleOpen] = useState(false)

  const formSchema = z.object({
    customerId: z.string().min(1, t('validationCustomer')),
    vehicleId: z.string().min(1, t('validationVehicle')),
    startDate: z.string().min(1, t('validationStartDate')),
    endDate: z.string().min(1, t('validationEndDate')),
    depositAmount: z.string().optional(),
    cautionAmount: z.number().optional(),
    dailyPrice: z.number().optional(),
    totalPrice: z.number().optional(),
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: initialData?.customerId || "",
      vehicleId: initialData?.vehicleId || "",
      startDate: initialData?.startDate ? new Date(initialData.startDate).toISOString().slice(0, 16) : "",
      endDate: initialData?.endDate ? new Date(initialData.endDate).toISOString().slice(0, 16) : "",
      depositAmount: initialData?.depositAmount ? String(initialData.depositAmount) : "0",
      cautionAmount: initialData?.cautionAmount || 0,
      dailyPrice: initialData?.dailyPrice || 0,
      totalPrice: initialData?.totalPrice || 0,
    },
  })

  const { data: customers } = useQuery({
    queryKey: ['customers-list'],
    queryFn: async () => {
      const response = await api.get('/customers', { params: { limit: 100 } })
      return response.data.customers
    },
  })

  // Fetch all vehicles for edit mode to show current vehicle even if not available
  const { data: vehicles } = useQuery({
    queryKey: ['vehicles-list', mode],
    queryFn: async () => {
      const params = mode === 'create' ? { status: 'AVAILABLE', limit: 100 } : { limit: 100 }
      const response = await api.get('/vehicles', { params })
      return response.data.vehicles
    },
  })

  const watchAllFields = form.watch()

  useEffect(() => {
    // Initial price set from props if editing
    if (mode === 'edit' && initialData && !priceCalculation) {
        setPriceCalculation({
            dailyPrice: initialData.dailyPrice,
            totalPrice: initialData.totalPrice,
            finalPrice: initialData.totalPrice,
            days: 0 // We could calculate this but it's visual only
        })
    }
  }, [mode, initialData])

  useEffect(() => {
    const calculatePrice = async () => {
      if (watchAllFields.vehicleId && watchAllFields.startDate && watchAllFields.endDate) {
        // Don't recalculate on initial load of edit form unless changed
        if (mode === 'edit' && 
            watchAllFields.vehicleId === initialData?.vehicleId && 
            watchAllFields.startDate === new Date(initialData?.startDate).toISOString().slice(0, 16) &&
            watchAllFields.endDate === new Date(initialData?.endDate).toISOString().slice(0, 16)
        ) {
            return;
        }

        try {
          const response = await api.post('/bookings/calculate-price', {
            vehicleId: watchAllFields.vehicleId,
            customerId: watchAllFields.customerId,
            startDate: watchAllFields.startDate,
            endDate: watchAllFields.endDate,
          })
          setPriceCalculation(response.data)
          form.setValue('dailyPrice', response.data.dailyPrice)
          form.setValue('totalPrice', response.data.finalPrice)
        } catch (error) {
          console.error('Failed to calculate price', error)
          // Don't clear if editing and api fails, keep existing
          if (mode === 'create') setPriceCalculation(null)
        }
      }
    }

    const timeoutId = setTimeout(calculatePrice, 500)
    return () => clearTimeout(timeoutId)
  }, [watchAllFields.vehicleId, watchAllFields.startDate, watchAllFields.endDate, watchAllFields.customerId, form, mode, initialData])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    try {
      if (mode === 'edit' && bookingId) {
        await api.patch(`/bookings/${bookingId}`, values)
        toast({
            title: t('bookingUpdated') || "Booking updated",
            description: t('bookingUpdateSuccess') || "The booking has been successfully updated.",
        })
      } else {
        await api.post('/bookings', values)
        toast({
            title: t('bookingCreated') || "Booking created",
            description: t('bookingCreateSuccess') || "The booking has been successfully confirmed.",
        })
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/bookings')
        router.refresh()
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string | string[] } } }
      toast({
        variant: "destructive",
        title: "Error",
        description: Array.isArray(err.response?.data?.message) 
          ? err.response!.data!.message.join(', ') 
          : (typeof err.response?.data?.message === 'string' ? err.response.data.message : "Failed to save booking"),
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{mode === 'create' ? t('bookingDetails') : t('editBookingDetails')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{t('customer')} <span className="text-red-500">*</span></FormLabel>
                      <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={customerOpen}
                              className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? customers?.find((customer: CustomerListItem) => customer.id === field.value)?.firstName + " " + customers?.find((customer: CustomerListItem) => customer.id === field.value)?.lastName
                                : t('selectCustomer') || "Select customer"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0">
                          <Command>
                            <CommandInput placeholder={t('searchCustomer') || "Search customer..."} />
                            <CommandList>
                              <CommandEmpty>{t('noCustomerFound') || "No customer found."}</CommandEmpty>
                              <CommandGroup>
                                {customers?.map((customer: CustomerListItem) => (
                                  <CommandItem
                                    value={customer.firstName + " " + customer.lastName + " " + customer.licenseNumber}
                                    key={customer.id}
                                    onSelect={() => {
                                      form.setValue("customerId", customer.id)
                                      setCustomerOpen(false)
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        customer.id === field.value
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    {customer.firstName} {customer.lastName} ({customer.licenseNumber})
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vehicleId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{t('vehicle')} <span className="text-red-500">*</span></FormLabel>
                      <Popover open={vehicleOpen} onOpenChange={setVehicleOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={vehicleOpen}
                              className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? vehicles?.find((vehicle: VehicleListItem) => vehicle.id === field.value)?.brand + " " + vehicles?.find((vehicle: VehicleListItem) => vehicle.id === field.value)?.model
                                : t('selectVehicle') || "Select vehicle"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0">
                          <Command>
                            <CommandInput placeholder={t('searchVehicle') || "Search vehicle..."} />
                            <CommandList>
                              <CommandEmpty>{t('noVehicleFound') || "No vehicle found."}</CommandEmpty>
                              <CommandGroup>
                                {vehicles?.map((vehicle: VehicleListItem) => (
                                  <CommandItem
                                    value={vehicle.brand + " " + vehicle.model + " " + vehicle.licensePlate}
                                    key={vehicle.id}
                                    onSelect={() => {
                                      form.setValue("vehicleId", vehicle.id)
                                      setVehicleOpen(false)
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        vehicle.id === field.value
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    {vehicle.brand} {vehicle.model} - {vehicle.licensePlate}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('startDate')} <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <DateTimePicker
                            value={field.value}
                            onChange={field.onChange}
                            locale={locale}
                            placeholder={t('selectStartDate')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('endDate')} <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <DateTimePicker
                            value={field.value}
                            onChange={field.onChange}
                            locale={locale}
                            placeholder={t('selectEndDate')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="depositAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('depositAmount')}</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cautionAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('cautionAmount')}</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="dailyPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('dailyPrice')}</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                field.onChange(val);
                                
                                const start = form.getValues('startDate');
                                const end = form.getValues('endDate');
                                if (start && end) {
                                  const startDate = new Date(start);
                                  const endDate = new Date(end);
                                  const timeDiff = endDate.getTime() - startDate.getTime();
                                  const days = Math.max(1, Math.ceil(timeDiff / (1000 * 3600 * 24)));
                                  const newTotal = val * days;
                                  
                                  form.setValue('totalPrice', newTotal);
                                  
                                  setPriceCalculation((prev) => ({
                                    ...prev,
                                    dailyPrice: val,
                                    totalPrice: newTotal,
                                    finalPrice: newTotal - (prev?.discount || 0),
                                    days: days
                                  }));
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="totalPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('totalPrice')}</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} disabled readOnly className="bg-muted font-bold" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader className="mr-2" />}
                  {mode === 'create' ? t('confirmBooking') : t('saveChanges')}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('priceSummary')}</CardTitle>
          </CardHeader>
          <CardContent>
            {priceCalculation ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t('dailyRate')}</span>
                  <span className="font-medium">{formatCurrency(priceCalculation.dailyPrice)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t('duration')}</span>
                  <span className="font-medium">{priceCalculation.days} {t('days') || 'days'}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-muted-foreground">{t('subtotal')}</span>
                  <span className="font-medium">{formatCurrency(priceCalculation.totalPrice)}</span>
                </div>
                {priceCalculation.discount > 0 && (
                  <div className="flex justify-between items-center text-green-600">
                    <span>{t('discount')}</span>
                    <span>-{formatCurrency(priceCalculation.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-4 border-t">
                  <span className="text-lg font-bold">{t('total')}</span>
                  <span className="text-lg font-bold">{formatCurrency(priceCalculation.finalPrice)}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <Calculator className="h-8 w-8 mb-2" />
                <p>{t('selectDatesMessage')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  )
}
