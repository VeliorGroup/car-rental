'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { 
  CreditCard, Plus, Pencil, Trash2, Users, Car, MapPin, Check
} from 'lucide-react'
import { Loader } from '@/components/ui/loader'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Switch } from '@/components/ui/switch'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface PlanPricing {
  id?: string
  country: string
  currency: string
  price: number
  yearlyPrice: number
}

interface Plan {
  id: string
  name: string
  displayName: string
  description: string | null
  price: number
  yearlyPrice: number
  currency: string
  maxVehicles: number
  maxUsers: number
  maxLocations: number
  planFeatures: { feature: { id: string; name: string; displayName: string } }[]
  isActive: boolean
  sortOrder: number
  pricing: PlanPricing[]
  _count: { subscriptions: number }
}

const SUPPORTED_COUNTRIES = [
  { code: 'AL', name: 'Albania', currency: 'ALL' },
  { code: 'XK', name: 'Kosovo', currency: 'EUR' },
  { code: 'MK', name: 'North Macedonia', currency: 'MKD' },
  { code: 'IT', name: 'Italy', currency: 'EUR' },
  { code: 'DE', name: 'Germany', currency: 'EUR' },
]

export default function PlansPage() {
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  const t = useTranslations('SuperAdmin')
  const { toast } = useToast()
  
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  
  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null)
  const [deleting, setDeleting] = useState(false)
  
  // Pricing Dialog State
  const [pricingDialogOpen, setPricingDialogOpen] = useState(false)
  const [pricingPlan, setPricingPlan] = useState<Plan | null>(null)
  const [pricingData, setPricingData] = useState<PlanPricing[]>([])
  const [savingPricing, setSavingPricing] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    maxVehicles: '',
    maxUsers: '10',
    maxLocations: '3',
    sortOrder: '0',
  })


  const getToken = () => localStorage.getItem('superadmin_token')

  const fetchPlans = async () => {
    try {
      const token = getToken()
      if (!token) {
        router.push(`/${locale}/superadmin/login`)
        return
      }
      const res = await fetch(`${API_URL}/admin/plans`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        // Don't redirect, just show empty state or error
        console.error('Failed to fetch plans:', res.status)
        setPlans([])
        return
      }
      setPlans(await res.json())
    } catch (error) {
      console.error('Error fetching plans:', error)
      setPlans([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])


  const openCreateDialog = () => {
    setEditingPlan(null)
    setFormData({
      name: '',
      displayName: '',
      description: '',
      maxVehicles: '',
      maxUsers: '10',
      maxLocations: '3',
      sortOrder: '0',
    })
    setDialogOpen(true)
  }

  const openEditDialog = (plan: Plan) => {
    setEditingPlan(plan)
    setFormData({
      name: plan.name,
      displayName: plan.displayName,
      description: plan.description || '',
      maxVehicles: plan.maxVehicles.toString(),
      maxUsers: plan.maxUsers.toString(),
      maxLocations: plan.maxLocations.toString(),
      sortOrder: plan.sortOrder.toString(),
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.displayName || !formData.maxVehicles) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: formData.name,
        displayName: formData.displayName,
        description: formData.description || undefined,
        maxVehicles: parseInt(formData.maxVehicles),
        maxUsers: parseInt(formData.maxUsers) || 10,
        maxLocations: parseInt(formData.maxLocations) || 3,
        sortOrder: parseInt(formData.sortOrder) || 0,
      }

      const url = editingPlan 
        ? `${API_URL}/admin/plans/${editingPlan.id}` 
        : `${API_URL}/admin/plans`
      
      const res = await fetch(url, {
        method: editingPlan ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        const errorMessage = Array.isArray(err.message) 
          ? err.message.join(', ') 
          : (err.message || 'Failed to save plan')
        throw new Error(errorMessage)
      }

      toast({ title: 'Success', description: editingPlan ? 'Plan updated' : 'Plan created' })
      setDialogOpen(false)
      fetchPlans()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || String(error), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!planToDelete) return
    setDeleting(true)
    try {
      const res = await fetch(`${API_URL}/admin/plans/${planToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to delete')
      
      toast({ 
        title: 'Success', 
        description: data.deactivated ? 'Plan deactivated (has active subscriptions)' : 'Plan deleted' 
      })
      setDeleteDialogOpen(false)
      fetchPlans()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleActive = async (plan: Plan) => {
    try {
      const res = await fetch(`${API_URL}/admin/plans/${plan.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ isActive: !plan.isActive }),
      })
      if (!res.ok) throw new Error('Failed')
      fetchPlans()
    } catch {
      toast({ title: 'Error', description: 'Failed to update plan', variant: 'destructive' })
    }
  }

  const openPricingDialog = (plan: Plan) => {
    setPricingPlan(plan)
    // Initialize pricing data with existing or defaults
    const existingPricing = plan.pricing || []
    const initialPricing = SUPPORTED_COUNTRIES.map(country => {
      const existing = existingPricing.find(p => p.country === country.code)
      return existing || {
        country: country.code,
        currency: country.currency,
        price: Number(plan.price) || 0,
        yearlyPrice: Number(plan.yearlyPrice) || 0,
      }
    })
    setPricingData(initialPricing)
    setPricingDialogOpen(true)
  }

  const handleSavePricing = async () => {
    if (!pricingPlan) return
    setSavingPricing(true)
    try {
      const res = await fetch(`${API_URL}/admin/plans/${pricingPlan.id}/pricing`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ pricing: pricingData }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Failed to save pricing')
      }
      toast({ title: 'Success', description: 'Pricing updated' })
      setPricingDialogOpen(false)
      fetchPlans()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setSavingPricing(false)
    }
  }

  const updatePricingEntry = (country: string, field: 'price' | 'yearlyPrice', value: string) => {
    setPricingData(prev => prev.map(p => 
      p.country === country ? { ...p, [field]: parseFloat(value) || 0 } : p
    ))
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader />
      </div>
    )
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold">{t('plans.title') || 'Subscription Plans'}</h2>
          <p className="text-sm text-muted-foreground">{t('plans.subtitle') || 'Manage subscription plans and pricing'}</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          {t('plans.create') || 'Create Plan'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {plans.map(plan => (
          <Card key={plan.id} className={!plan.isActive ? 'opacity-60' : ''}>
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-1.5 text-base">
                    <CreditCard className="h-4 w-4 text-primary" />
                    {plan.displayName}
                  </CardTitle>
                  <CardDescription className="text-xs">{plan.name}</CardDescription>
                </div>
                <Switch 
                  checked={plan.isActive} 
                  onCheckedChange={() => handleToggleActive(plan)}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3 px-4 pb-4">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">€{plan.price}</span>
                <span className="text-muted-foreground text-sm">/mo</span>
                <span className="text-xs text-muted-foreground ml-1">(€{plan.yearlyPrice}/yr)</span>
              </div>

              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Car className="h-3.5 w-3.5" />
                  <span>{plan.maxVehicles} vehicles</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  <span>{plan.maxUsers} users</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{plan.maxLocations} locations</span>
                </div>
              </div>

              <div className="border-t pt-2 flex justify-between items-center">
                <Badge variant="secondary" className="text-xs">{plan._count.subscriptions} subscriptions</Badge>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditDialog(plan)} title="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openPricingDialog(plan)} title="Pricing">
                    <CreditCard className="h-3.5 w-3.5" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => { setPlanToDelete(plan); setDeleteDialogOpen(true) }}
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Edit Plan' : 'Create Plan'}</DialogTitle>
            <DialogDescription>
              {editingPlan ? 'Update subscription plan details' : 'Create a new subscription plan'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Name (unique) *</Label>
                <Input 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="starter"
                  disabled={!!editingPlan}
                />
              </div>
              <div className="grid gap-2">
                <Label>Display Name *</Label>
                <Input 
                  value={formData.displayName} 
                  onChange={e => setFormData({...formData, displayName: e.target.value})} 
                  placeholder="Starter Plan"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})} 
                placeholder="Plan description..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Max Vehicles *</Label>
                <Input 
                  type="number" 
                  value={formData.maxVehicles} 
                  onChange={e => setFormData({...formData, maxVehicles: e.target.value})} 
                  placeholder="10"
                />
              </div>
              <div className="grid gap-2">
                <Label>Max Users</Label>
                <Input 
                  type="number" 
                  value={formData.maxUsers} 
                  onChange={e => setFormData({...formData, maxUsers: e.target.value})} 
                  placeholder="10"
                />
              </div>
              <div className="grid gap-2">
                <Label>Max Locations</Label>
                <Input 
                  type="number" 
                  value={formData.maxLocations} 
                  onChange={e => setFormData({...formData, maxLocations: e.target.value})} 
                  placeholder="3"
                />
              </div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              <p>💡 Features are managed separately. Go to <strong>Features</strong> page to create features, then assign them to plans.</p>
            </div>
            <div className="grid gap-2">
              <Label>Sort Order</Label>
              <Input 
                type="number" 
                value={formData.sortOrder} 
                onChange={e => setFormData({...formData, sortOrder: e.target.value})} 
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader className="mr-2" />}
              {editingPlan ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{planToDelete?.displayName}"? 
              {planToDelete?._count?.subscriptions ? ` This plan has ${planToDelete._count.subscriptions} active subscriptions and will be deactivated instead.` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting && <Loader className="mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pricing Dialog */}
      <Dialog open={pricingDialogOpen} onOpenChange={setPricingDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Pricing - {pricingPlan?.displayName}</DialogTitle>
            <DialogDescription>
              Set prices for different countries and currencies
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="rounded-lg border">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Country</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Currency</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Monthly</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Yearly</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {pricingData.map(pricing => {
                    const country = SUPPORTED_COUNTRIES.find(c => c.code === pricing.country)
                    return (
                      <tr key={pricing.country}>
                        <td className="px-4 py-3 text-sm">{country?.name || pricing.country}</td>
                        <td className="px-4 py-3 text-sm font-mono">{pricing.currency}</td>
                        <td className="px-4 py-3">
                          <Input 
                            type="number" 
                            step="0.01"
                            value={pricing.price} 
                            onChange={e => updatePricingEntry(pricing.country, 'price', e.target.value)}
                            className="w-28 h-9"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input 
                            type="number" 
                            step="0.01"
                            value={pricing.yearlyPrice} 
                            onChange={e => updatePricingEntry(pricing.country, 'yearlyPrice', e.target.value)}
                            className="w-28 h-9"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Prices are shown to users based on their country. EUR is used as default for countries not listed.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPricingDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePricing} disabled={savingPricing}>
              {savingPricing && <Loader className="mr-2" />}
              Save Pricing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
