'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { 
  PiArrowLeft, 
  PiDownloadSimple, 
  PiCheckCircle, 
  PiXCircle, 
  PiClock, 
  PiNote
} from 'react-icons/pi'
import Link from 'next/link'
import { formatDate, formatCurrency, formatDateTime } from '@/lib/utils'
import { Loader } from '@/components/ui/loader'
import { useTranslations } from 'next-intl'
import { printContract, ContractData } from '@/lib/contract-pdf'

interface BookingDetail {
  id: string
  startDate: string
  endDate: string
  status: string
  totalAmount: number
  depositAmount: number
  customer: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string
    licenseNumber: string
  }
  vehicle: {
    id: string
    brand: string
    model: string
    licensePlate: string
    category: string
  }
  pdfBookingKey?: string
  pdfCheckOutKey?: string
  pdfCheckInKey?: string
  pdfBookingUrl?: string
  pdfCheckOutUrl?: string
  pdfCheckInUrl?: string
  checkOutData?: any
  checkInData?: any
}

export default function BookingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const id = params.id as string
  const t = useTranslations('Bookings')
  const tc = useTranslations('Common')

  // Contract generation modal state
  const [isGeneratingContract, setIsGeneratingContract] = useState(false)
  const [contractProgress, setContractProgress] = useState(0)
  const [contractStatus, setContractStatus] = useState('')

  const { data: booking, isLoading } = useQuery<BookingDetail>({
    queryKey: ['booking', id],
    queryFn: async () => {
      const response = await api.get(`/bookings/${id}`)
      return response.data
    },
  })

  // Fetch tenant data for company logo
  const { data: tenantData } = useQuery({
    queryKey: ['tenant', 'me'],
    queryFn: async () => {
      const res = await api.get('/tenants/me')
      return res.data
    },
  })

  const handleGenerateContract = async () => {
    if (!booking || !tenantData) return
    
    // Open modal and start progress
    setIsGeneratingContract(true)
    setContractProgress(0)
    setContractStatus('Preparazione dati...')
    
    try {
      // Step 1: Prepare data
      await new Promise(resolve => setTimeout(resolve, 300))
      setContractProgress(20)
      setContractStatus('Caricamento dati cliente...')
      
      const days = Math.ceil(
        (new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) / 
        (1000 * 60 * 60 * 24)
      )
      
      const contractData: ContractData = {
        company: {
          name: tenantData.companyName || 'FleetPulse',
          logoUrl: tenantData.logoUrl,
          address: tenantData.address,
          city: tenantData.city,
          country: tenantData.country,
          phone: tenantData.phone,
          vatNumber: tenantData.vatNumber,
          contractTerms: tenantData.contractTerms,
        },
        booking: {
          reference: `BK${booking.id.slice(-8).toUpperCase()}`,
          pickupDate: booking.startDate,
          returnDate: booking.endDate,
          totalPrice: booking.totalAmount,
          dailyPrice: Math.round(booking.totalAmount / days),
          days,
          deposit: booking.depositAmount || 300,
        },
        vehicle: {
          brand: booking.vehicle.brand,
          model: booking.vehicle.model,
          year: new Date().getFullYear(),
          licensePlate: booking.vehicle.licensePlate,
          category: booking.vehicle.category,
          currentKm: booking.checkOutData?.odometerReading || undefined,
          fuelLevel: booking.checkOutData?.fuelLevel || undefined,
        },
        customer: {
          firstName: booking.customer.firstName,
          lastName: booking.customer.lastName,
          email: booking.customer.email,
          phone: booking.customer.phone,
          licenseNumber: booking.customer.licenseNumber,
        },
        contractDate: new Date().toISOString(),
      }
      
      // Step 2: Loading vehicle data
      await new Promise(resolve => setTimeout(resolve, 300))
      setContractProgress(40)
      setContractStatus('Caricamento dati veicolo...')
      
      // Step 3: Generate contract via backend
      await new Promise(resolve => setTimeout(resolve, 300))
      setContractProgress(60)
      setContractStatus('Generazione PDF contratto...')
      
      // Call backend to generate and save PDF
      try {
        await api.post(`/bookings/${booking.id}/generate-contract`, {
          contractData
        })
        
        // Step 4: Saving
        setContractProgress(80)
        setContractStatus('Salvataggio allegato...')
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // Invalidate and refetch booking to get the new pdfBookingKey
        await queryClient.invalidateQueries({ queryKey: ['booking', id] })
        
      } catch (err) {
        // Backend PDF generation not available, fallback to frontend generation
      }
      
      // Step 5: Complete
      setContractProgress(100)
      setContractStatus('Completato!')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Close modal
      setIsGeneratingContract(false)
      
      // Open print dialog with frontend-generated contract
      printContract(contractData)
      
    } catch (error) {
      console.error('Contract generation error:', error)
      setIsGeneratingContract(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader />
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="flex justify-center py-20 text-muted-foreground">
        {t('notFound')}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Contract Generation Modal */}
      <Dialog open={isGeneratingContract} onOpenChange={setIsGeneratingContract}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader className="mr-2" />
              Generazione Contratto
            </DialogTitle>
            <DialogDescription>
              Attendere prego, stiamo preparando il contratto...
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Progress value={contractProgress} className="h-3" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{contractStatus}</span>
              <span className="font-medium">{contractProgress}%</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <PiArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              {t('booking')} #{booking.id.slice(-6).toUpperCase()}
            </h2>
            <p className="text-muted-foreground">
              {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          {booking.status === 'CONFIRMED' && (
            <Link href={`/bookings/${id}/checkout`}>
              <Button className="bg-green-600 hover:bg-green-700">
                <PiCheckCircle className="mr-2 h-4 w-4" />
                {t('checkoutVehicle')}
              </Button>
            </Link>
          )}
          {booking.status === 'CHECKED_OUT' && (
            <Link href={`/bookings/${id}/checkin`}>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <PiClock className="mr-2 h-4 w-4" />
                {t('checkinVehicle')}
              </Button>
            </Link>
          )}
          {booking.status === 'CONFIRMED' && (
            <Button variant="destructive">
              <PiXCircle className="mr-2 h-4 w-4" />
              {t('cancelBooking')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t('bookingInformation')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="font-semibold mb-2">{t('customerSection')}</h3>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t('name')}</dt>
                    <dd>{booking.customer.firstName} {booking.customer.lastName}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t('email')}</dt>
                    <dd>{booking.customer.email}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t('phone')}</dt>
                    <dd>{booking.customer.phone}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t('license')}</dt>
                    <dd>{booking.customer.licenseNumber}</dd>
                  </div>
                </dl>
              </div>
              <div>
                <h3 className="font-semibold mb-2">{t('vehicleSection')}</h3>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t('vehicle')}</dt>
                    <dd>{booking.vehicle.brand} {booking.vehicle.model}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t('plate')}</dt>
                    <dd>{booking.vehicle.licensePlate}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t('category')}</dt>
                    <dd>{booking.vehicle.category}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t">
              <h3 className="font-semibold mb-2">{t('timeline')}</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">{t('pickup')}</div>
                  <div className="font-medium">{formatDateTime(booking.startDate)}</div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">{t('return')}</div>
                  <div className="font-medium">{formatDateTime(booking.endDate)}</div>
                </div>
              </div>
            </div>

            {/* Contract Details Section */}
            {(booking.checkOutData || booking.checkInData) && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold mb-4">📋 Dati Contratto</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Checkout Data */}
                  {booking.checkOutData && (
                    <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="text-sm font-medium text-green-700 dark:text-green-400 mb-3">🚗 Consegna Veicolo</div>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Km Partenza</dt>
                          <dd className="font-medium">{booking.checkOutData.odometerReading?.toLocaleString() || '—'} km</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Carburante</dt>
                          <dd className="font-medium">{booking.checkOutData.fuelLevel || '—'}%</dd>
                        </div>
                        {booking.checkOutData.notes && (
                          <div className="pt-2 border-t">
                            <dt className="text-muted-foreground mb-1">Note</dt>
                            <dd className="text-xs">{booking.checkOutData.notes}</dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  )}
                  
                  {/* Checkin Data */}
                  {booking.checkInData && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-3">🏁 Rientro Veicolo</div>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Km Rientro</dt>
                          <dd className="font-medium">{booking.checkInData.odometerReading?.toLocaleString() || '—'} km</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Carburante</dt>
                          <dd className="font-medium">{booking.checkInData.fuelLevel || '—'}%</dd>
                        </div>
                        {booking.checkOutData?.odometerReading && booking.checkInData.odometerReading && (
                          <div className="flex justify-between pt-2 border-t">
                            <dt className="text-muted-foreground">Km Percorsi</dt>
                            <dd className="font-bold text-blue-600">
                              {(booking.checkInData.odometerReading - booking.checkOutData.odometerReading).toLocaleString()} km
                            </dd>
                          </div>
                        )}
                        {booking.checkInData.notes && (
                          <div className="pt-2 border-t">
                            <dt className="text-muted-foreground mb-1">Note</dt>
                            <dd className="text-xs">{booking.checkInData.notes}</dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('documents')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {/* Generate Contract Button */}
              <Button 
                variant="default" 
                className="w-full justify-start bg-primary hover:bg-primary/90" 
                onClick={handleGenerateContract}
              >
                <PiNote className="mr-2 h-4 w-4" />
                {t('generateContract') || 'Generate Contract'}
              </Button>

              {booking.pdfBookingUrl && (
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href={booking.pdfBookingUrl} target="_blank" rel="noopener noreferrer">
                    <PiDownloadSimple className="mr-2 h-4 w-4" />
                    {t('bookingContract')}
                  </a>
                </Button>
              )}
              
              {booking.pdfCheckOutUrl && (
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href={booking.pdfCheckOutUrl} target="_blank" rel="noopener noreferrer">
                    <PiDownloadSimple className="mr-2 h-4 w-4" />
                    {t('checkoutReport')}
                  </a>
                </Button>
              )}

              {booking.pdfCheckInUrl && (
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href={booking.pdfCheckInUrl} target="_blank" rel="noopener noreferrer">
                    <PiDownloadSimple className="mr-2 h-4 w-4" />
                    {t('checkinReport')}
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('financials')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t('totalAmount')}</span>
                <span className="text-xl font-bold">{formatCurrency(booking.totalAmount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t('depositHeld')}</span>
                <span className="font-medium">{formatCurrency(booking.depositAmount || 300)}</span>
              </div>
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{tc('status')}</span>
                  <span className={`font-bold px-2 py-1 rounded-full text-xs ${
                    booking.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' :
                    booking.status === 'CHECKED_OUT' ? 'bg-green-100 text-green-700' :
                    booking.status === 'CHECKED_IN' ? 'bg-gray-100 text-gray-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {booking.status === 'CONFIRMED' ? t('statusConfirmed') :
                     booking.status === 'CHECKED_OUT' ? t('statusCheckedOut') :
                     booking.status === 'CHECKED_IN' ? t('statusCheckedIn') :
                     booking.status === 'CANCELLED' ? t('statusCancelled') :
                     booking.status === 'NO_SHOW' ? t('statusNoShow') :
                     booking.status}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
