'use client'

import { useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Car, ArrowLeft, ArrowRight, Check, Calendar, MapPin, User, CreditCard, CheckCircle2, Printer } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'

interface BookingStep {
  id: number
  title: string
  icon: React.ElementType
}

export default function BookingPage({ params }: { params: { vehicleId: string } }) {
  const urlParams = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const locale = urlParams.locale as string || 'en'
  const t = useTranslations('PublicBooking.booking')
  const tp = useTranslations('PublicBooking')
  
  const pickup = searchParams.get('pickup') || ''
  const returnDate = searchParams.get('return') || ''
  const vehicleId = params.vehicleId

  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bookingComplete, setBookingComplete] = useState(false)
  const [bookingRef, setBookingRef] = useState('')

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    licenseNumber: '',
    dateOfBirth: '',
    address: '',
    city: '',
    country: '',
    paymentMethod: 'pickup',
    agreeTerms: false,
  })

  // Sample vehicle data (would come from API)
  const vehicle = {
    id: vehicleId,
    brand: 'Volkswagen',
    model: 'Golf',
    year: 2023,
    dailyPrice: 35,
  }

  const days = pickup && returnDate 
    ? Math.ceil((new Date(returnDate).getTime() - new Date(pickup).getTime()) / (1000 * 60 * 60 * 24))
    : 3

  const basePrice = vehicle.dailyPrice * days
  const deposit = 300
  const total = basePrice

  const steps: BookingStep[] = [
    { id: 1, title: t('step1'), icon: Car },
    { id: 2, title: t('step2'), icon: User },
    { id: 3, title: t('step3'), icon: CreditCard },
    { id: 4, title: t('step4'), icon: Check },
  ]

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    try {
      // TODO: Submit to API
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Generate booking reference
      const ref = `BK${Date.now().toString().slice(-8)}`
      setBookingRef(ref)
      setBookingComplete(true)
      
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to complete booking. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const canProceed = () => {
    if (currentStep === 2) {
      return formData.firstName && formData.lastName && formData.email && formData.phone && formData.licenseNumber
    }
    if (currentStep === 3) {
      return formData.agreeTerms
    }
    return true
  }

  // Booking complete view
  if (bookingComplete) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="border-b border-border bg-background/80 backdrop-blur-sm">
          <div className="container mx-auto px-6 py-4 flex justify-between items-center">
            <Link href={`/${locale}`} className="flex items-center">
              <span className="text-xl font-bold">FleetPulse</span>
            </Link>
          </div>
        </nav>

        <div className="container mx-auto px-6 py-16 max-w-2xl">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <CardTitle className="text-2xl">{t('success')}</CardTitle>
              <CardDescription className="text-base">
                {t('successMessage')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">{t('bookingReference')}</p>
                <p className="text-2xl font-bold font-mono">{bookingRef}</p>
              </div>

              <div className="text-left space-y-4 p-4 border rounded-lg">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('vehicle')}</span>
                  <span className="font-medium">{vehicle.brand} {vehicle.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('dates')}</span>
                  <span className="font-medium">
                    {pickup && format(new Date(pickup), 'MMM dd')} - {returnDate && format(new Date(returnDate), 'MMM dd, yyyy')}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">{t('total')}</span>
                  <span className="font-bold text-primary">€{total}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-4">
              <Button className="w-full" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" />
                {t('printConfirmation')}
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/${locale}`}>
                  Back to Home
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link href={`/${locale}`} className="flex items-center">
            <span className="text-xl font-bold">FleetPulse</span>
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Page Title */}
          <div className="mb-8">
            <Button variant="ghost" size="sm" className="mb-4" asChild>
              <Link href={`/${locale}/rent?pickup=${pickup}&return=${returnDate}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to vehicles
              </Link>
            </Button>
            <h1 className="text-3xl font-bold">{t('title')}</h1>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                    currentStep >= step.id 
                      ? 'bg-primary border-primary text-primary-foreground' 
                      : 'border-muted-foreground/30 text-muted-foreground'
                  }`}>
                    {currentStep > step.id ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <step.icon className="h-5 w-5" />
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-full h-1 mx-2 transition-colors ${
                      currentStep > step.id ? 'bg-primary' : 'bg-muted'
                    }`} style={{ width: '60px' }} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2">
              {steps.map(step => (
                <span key={step.id} className="text-xs text-muted-foreground text-center" style={{ width: '80px' }}>
                  {step.title}
                </span>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Step 1: Vehicle Confirmation */}
              {currentStep === 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('step1')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="w-24 h-16 bg-muted rounded flex items-center justify-center">
                        <Car className="h-10 w-10 text-muted-foreground/50" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{vehicle.brand} {vehicle.model}</h3>
                        <p className="text-sm text-muted-foreground">{vehicle.year}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">€{vehicle.dailyPrice}</p>
                        <p className="text-sm text-muted-foreground">/{tp('perDay')}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <Calendar className="h-4 w-4" />
                          {tp('pickupDate')}
                        </div>
                        <p className="font-medium">{pickup && format(new Date(pickup), 'EEE, MMM dd, yyyy')}</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <Calendar className="h-4 w-4" />
                          {tp('returnDate')}
                        </div>
                        <p className="font-medium">{returnDate && format(new Date(returnDate), 'EEE, MMM dd, yyyy')}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 2: Customer Details */}
              {currentStep === 2 && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('yourDetails')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">{t('firstName')} *</Label>
                        <Input
                          id="firstName"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">{t('lastName')} *</Label>
                        <Input
                          id="lastName"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">{t('email')} *</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">{t('phone')} *</Label>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="licenseNumber">{t('licenseNumber')} *</Label>
                        <Input
                          id="licenseNumber"
                          name="licenseNumber"
                          value={formData.licenseNumber}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dateOfBirth">{t('dateOfBirth')}</Label>
                        <Input
                          id="dateOfBirth"
                          name="dateOfBirth"
                          type="date"
                          value={formData.dateOfBirth}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label htmlFor="address">{t('address')}</Label>
                      <Input
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">{t('city')}</Label>
                        <Input
                          id="city"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country">{t('country')}</Label>
                        <Input
                          id="country"
                          name="country"
                          value={formData.country}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 3: Payment */}
              {currentStep === 3 && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('paymentMethod')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <RadioGroup
                      value={formData.paymentMethod}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}
                      className="space-y-4"
                    >
                      <div className="flex items-center space-x-3 p-4 border rounded-lg">
                        <RadioGroupItem value="pickup" id="pickup" />
                        <Label htmlFor="pickup" className="flex-1 cursor-pointer">
                          <p className="font-medium">{t('payOnPickup')}</p>
                          <p className="text-sm text-muted-foreground">
                            Pay when you collect the vehicle
                          </p>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-4 border rounded-lg opacity-50">
                        <RadioGroupItem value="now" id="now" disabled />
                        <Label htmlFor="now" className="flex-1">
                          <p className="font-medium">{t('payNow')}</p>
                          <p className="text-sm text-muted-foreground">
                            Coming soon
                          </p>
                        </Label>
                      </div>
                    </RadioGroup>

                    <Separator />

                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="terms"
                        checked={formData.agreeTerms}
                        onCheckedChange={(checked) => 
                          setFormData(prev => ({ ...prev, agreeTerms: !!checked }))
                        }
                      />
                      <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                        {t('termsAgree')}
                      </Label>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-6">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  disabled={currentStep === 1}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t('back')}
                </Button>

                {currentStep < 3 ? (
                  <Button
                    onClick={() => setCurrentStep(prev => prev + 1)}
                    disabled={!canProceed()}
                  >
                    {t('continue')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={!canProceed() || isSubmitting}
                  >
                    {isSubmitting ? 'Processing...' : t('confirmBooking')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle className="text-lg">{t('orderSummary')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('vehicle')}</span>
                    <span className="font-medium">{vehicle.brand} {vehicle.model}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('dates')}</span>
                    <span className="font-medium">{days} {t('days')}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('basePrice')}</span>
                    <span>€{vehicle.dailyPrice} × {days} = €{basePrice}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('deposit')}</span>
                    <span className="text-muted-foreground">€{deposit} (refundable)</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>{t('total')}</span>
                    <span className="text-primary">€{total}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
