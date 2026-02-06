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
  PiWarning 
} from 'react-icons/pi'
import { PiCarProfile } from 'react-icons/pi'
import { Loader } from '@/components/ui/loader'
import { useTranslations } from 'next-intl'
import { useToast } from '@/hooks/use-toast'

export default function CheckinPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const id = params.id as string
  const t = useTranslations('Bookings')

  const [odometerReading, setOdometerReading] = useState('')
  const [fuelLevel, setFuelLevel] = useState(100)
  const [notes, setNotes] = useState('')
  const [damages, setDamages] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: async () => {
      const response = await api.get(`/bookings/${id}`)
      return response.data
    },
  })

  const checkinMutation = useMutation({
    mutationFn: async (data: { odometerReading: number; fuelLevel: number; notes: string; damages?: string }) => {
      return api.post(`/bookings/${id}/checkin`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] })
      toast({
        title: 'Check-in completato',
        description: 'Il veicolo è stato restituito con successo.',
      })
      router.push(`/bookings/${id}`)
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: error.response?.data?.message || 'Errore durante il check-in',
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
      await checkinMutation.mutateAsync({
        odometerReading: parseInt(odometerReading),
        fuelLevel,
        notes,
        damages: damages || undefined,
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

  const startKm = booking.checkOutData?.odometerReading || 0
  const currentKm = parseInt(odometerReading) || 0
  const kmTraveled = currentKm > startKm ? currentKm - startKm : 0

  const startFuel = booking.checkOutData?.fuelLevel || 100
  const fuelDifference = fuelLevel - startFuel

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <PiArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">🏁 Check-in Veicolo</h2>
          <p className="text-muted-foreground">
            Prenotazione #{id.slice(-6).toUpperCase()} - {booking.vehicle.brand} {booking.vehicle.model}
          </p>
        </div>
      </div>

      {/* Checkout Summary */}
      {booking.checkOutData && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-700 dark:text-green-400">
              📌 Dati alla Consegna (Check-out)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">Km:</span>{' '}
                <span className="font-mono font-bold">{booking.checkOutData.odometerReading?.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Carburante:</span>{' '}
                <span className="font-bold">{booking.checkOutData.fuelLevel}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PiCarProfile className="h-5 w-5" />
            Rientro Veicolo dal Cliente
          </CardTitle>
          <CardDescription>
            Compila i dati del veicolo al momento del rientro. Verifica eventuali danni e il livello carburante.
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
                placeholder="es. 45890"
                value={odometerReading}
                onChange={(e) => setOdometerReading(e.target.value)}
                required
                className="text-lg font-mono"
              />
              {kmTraveled > 0 && (
                <div className="text-sm text-blue-600 dark:text-blue-400">
                  📏 Km percorsi: <span className="font-bold">{kmTraveled.toLocaleString()} km</span>
                </div>
              )}
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
              {fuelDifference !== 0 && (
                <div className={`text-sm ${fuelDifference < 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  ⛽ Differenza: {fuelDifference > 0 ? '+' : ''}{fuelDifference}%
                  {fuelDifference < 0 && ' (da addebitare)'}
                </div>
              )}
            </div>

            {/* Damages */}
            <div className="space-y-2">
              <Label htmlFor="damages" className="flex items-center gap-2 text-orange-600">
                <PiWarning className="h-4 w-4" />
                Danni Riscontrati (opzionale)
              </Label>
              <Textarea
                id="damages"
                placeholder="Descrivi eventuali danni nuovi riscontrati..."
                value={damages}
                onChange={(e) => setDamages(e.target.value)}
                rows={2}
                className="border-orange-200"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="flex items-center gap-2">
                <PiNote className="h-4 w-4" />
                Note (opzionale)
              </Label>
              <Textarea
                id="notes"
                placeholder="Altre osservazioni..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Summary */}
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Riepilogo Rientro</h4>
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
                {kmTraveled > 0 && (
                  <div className="flex justify-between pt-2 border-t font-bold">
                    <dt>Km Percorsi</dt>
                    <dd className="text-blue-600">{kmTraveled.toLocaleString()} km</dd>
                  </div>
                )}
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
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>Salvataggio...</>
                ) : (
                  <>
                    <PiCheckCircle className="mr-2 h-4 w-4" />
                    Conferma Check-in
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
