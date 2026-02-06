'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { PiCreditCard, PiPlus, PiTrash } from 'react-icons/pi'
import { useToast } from '@/components/ui/use-toast'
import { Loader } from '@/components/ui/loader'
import api from '@/lib/api'

interface PaymentMethod {
  id: string
  cardType: string
  last4: string
  expiryMonth: number
  expiryYear: number
  isDefault: boolean
}

export function PaymentMethodsTab() {
  const t = useTranslations('Settings')
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    cardType: 'Visa',
    last4: '',
    expiryMonth: 1,
    expiryYear: new Date().getFullYear() + 1,
  })

  const { data: paymentMethods = [], isLoading } = useQuery<PaymentMethod[]>({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const res = await api.get('/tenants/me/payment-methods')
      return res.data
    },
  })

  const addMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      await api.post('/tenants/me/payment-methods', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] })
      toast({ title: t('paymentMethods.addedTitle') })
      setAddDialogOpen(false)
      resetForm()
    },
    onError: () => {
      toast({ variant: 'destructive', title: t('paymentMethods.addError') })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tenants/me/payment-methods/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] })
      toast({ title: t('paymentMethods.deletedTitle'), description: t('paymentMethods.deletedDesc') })
    },
    onError: () => {
      toast({ variant: 'destructive', title: t('paymentMethods.deleteError') })
    },
  })

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/tenants/me/payment-methods/${id}/default`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] })
      toast({ title: t('paymentMethods.defaultUpdatedTitle'), description: t('paymentMethods.defaultUpdatedDesc') })
    },
    onError: () => {
      toast({ variant: 'destructive', title: t('paymentMethods.defaultError') })
    },
  })

  const resetForm = () => {
    setFormData({
      cardType: 'Visa',
      last4: '',
      expiryMonth: 1,
      expiryYear: new Date().getFullYear() + 1,
    })
  }

  const handleAdd = () => {
    if (formData.last4.length !== 4) {
      toast({ variant: 'destructive', title: t('paymentMethods.invalidLast4') })
      return
    }
    addMutation.mutate(formData)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader  />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">{t('paymentMethods.title')}</h3>
          <p className="text-sm text-muted-foreground">{t('paymentMethods.description')}</p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <PiPlus className="mr-2 h-4 w-4" />
          {t('paymentMethods.add')}
        </Button>
      </div>

      {paymentMethods.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {t('paymentMethods.empty')}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {paymentMethods.map((method) => (
            <Card key={method.id} className={method.isDefault ? "border-primary" : ""}>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <PiCreditCard className="h-6 w-6 text-muted-foreground" />
                  {method.isDefault && (
                    <Badge variant="secondary">{t('paymentMethods.default')}</Badge>
                  )}
                </div>
                <CardTitle className="text-lg mt-2">•••• •••• •••• {method.last4}</CardTitle>
                <CardDescription>
                  {t('paymentMethods.expires')} {String(method.expiryMonth).padStart(2, '0')}/{String(method.expiryYear).slice(-2)}
                </CardDescription>
              </CardHeader>
              <CardFooter className="flex justify-between">
                {!method.isDefault && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setDefaultMutation.mutate(method.id)}
                    disabled={setDefaultMutation.isPending}
                  >
                    {setDefaultMutation.isPending && <Loader className="mr-2" />}
                    {t('paymentMethods.setDefault')}
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-destructive ml-auto hover:text-destructive hover:bg-destructive/10"
                  onClick={() => deleteMutation.mutate(method.id)}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? <Loader /> : <PiTrash className="h-4 w-4" />}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Add Payment Method Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('paymentMethods.addTitle')}</DialogTitle>
            <DialogDescription>{t('paymentMethods.addDescription')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t('paymentMethods.cardType')}</Label>
              <Select
                value={formData.cardType}
                onValueChange={(value) => setFormData({ ...formData, cardType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Visa">Visa</SelectItem>
                  <SelectItem value="Mastercard">Mastercard</SelectItem>
                  <SelectItem value="American Express">American Express</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t('paymentMethods.last4')}</Label>
              <Input
                value={formData.last4}
                onChange={(e) => setFormData({ ...formData, last4: e.target.value.slice(0, 4) })}
                placeholder="1234"
                maxLength={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('paymentMethods.expiryMonth')}</Label>
                <Select
                  value={String(formData.expiryMonth)}
                  onValueChange={(value) => setFormData({ ...formData, expiryMonth: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <SelectItem key={month} value={String(month)}>
                        {String(month).padStart(2, '0')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t('paymentMethods.expiryYear')}</Label>
                <Select
                  value={String(formData.expiryYear)}
                  onValueChange={(value) => setFormData({ ...formData, expiryYear: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map((year) => (
                      <SelectItem key={year} value={String(year)}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              {t('paymentMethods.cancel')}
            </Button>
            <Button onClick={handleAdd} disabled={addMutation.isPending}>
              {addMutation.isPending && <Loader className="mr-2" />}
              {t('paymentMethods.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
