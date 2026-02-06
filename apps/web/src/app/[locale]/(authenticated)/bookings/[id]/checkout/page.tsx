'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { 
  PiArrowLeft, 
  PiCheckCircle, 
  PiDrop, 
  PiGauge, 
  PiNote,
  PiCarProfile
} from 'react-icons/pi'
import { Loader } from '@/components/ui/loader'
import { useTranslations } from 'next-intl'
import { useToast } from '@/hooks/use-toast'

export default function CheckoutPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const id = params.id as string
  const t = useTranslations('Bookings')

  const [odometerReading, setOdometerReading] = useState('')
  const [fuelLevel, setFuelLevel] = useState(100)
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: async () => {
      const response = await api.get(`/bookings/${id}`)
      return response.data
    },
  })

  const checkoutMutation = useMutation({
    mutationFn: async (data: { odometerReading: number; fuelLevel: number; notes: string }) => {
      return api.post(`/bookings/${id}/checkout`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] })
      toast({
        title: 'Check-out completato',
        description: 'Il veicolo è stato consegnato al cliente.',
      })
      router.push(`/bookings/${id}`)
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: error.response?.data?.message || 'Errore durante il check-out',
      })
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!odometerReading) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Inserisci il chilometraggio',
      })
      return
    }

    setIsSubmitting(true)
    
    try {
      await checkoutMutation.mutateAsync({
        odometerReading: parseInt(odometerReading),
        fuelLevel,
        notes,
      })
    } finally {
      setIsSubmitting(false)
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
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <PiArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">🚗 Check-out Veicolo</h2>
          <p className="text-muted-foreground">
            Prenotazione #{id.slice(-6).toUpperCase()} - {booking.vehicle.brand} {booking.vehicle.model}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PiCarProfile className="h-5 w-5" />
            Consegna Veicolo al Cliente
          </CardTitle>
          <CardDescription>
            Compila i dati del veicolo al momento della consegna. Questi dati appariranno sul contratto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Odometer */}
            <div className="space-y-2">
              <Label htmlFor="odometer" className="flex items-center gap-2">
                <PiGauge className="h-4 w-4" />
                Chilometraggio (Km) *
              </Label>
              <Input
                id="odometer"
                type="number"
                placeholder="es. 45230"
                value={odometerReading}
                onChange={(e) => setOdometerReading(e.target.value)}
                required
                className="text-lg font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Inserisci la lettura attuale del contachilometri
              </p>
            </div>

            {/* Fuel Level */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <PiDrop className="h-4 w-4" />
                Livello Carburante: {fuelLevel}%
              </Label>
              <div className="px-2">
                <Slider
                  value={[fuelLevel]}
                  onValueChange={(value) => setFuelLevel(value[0])}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0% (Vuoto)</span>
                <span>50% (Metà)</span>
                <span>100% (Pieno)</span>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="flex items-center gap-2">
                <PiNote className="h-4 w-4" />
                Note (opzionale)
              </Label>
              <Textarea
                id="notes"
                placeholder="Eventuali graffi, danni preesistenti, accessori consegnati..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Summary */}
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Riepilogo Consegna</h4>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Veicolo</dt>
                  <dd>{booking.vehicle.brand} {booking.vehicle.model}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Targa</dt>
                  <dd className="font-mono">{booking.vehicle.licensePlate}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Cliente</dt>
                  <dd>{booking.customer.firstName} {booking.customer.lastName}</dd>
                </div>
              </dl>
            </div>

            {/* Submit */}
            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={() => router.back()}
              >
                Annulla
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>Salvataggio...</>
                ) : (
                  <>
                    <PiCheckCircle className="mr-2 h-4 w-4" />
                    Conferma Check-out
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
