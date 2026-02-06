'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { 
  Building2, ArrowLeft, Users, Car, CreditCard, Gift, Key, 
  CheckCircle, XCircle, Calendar, Mail, User, Plus, Clock, Trash2, Edit, LogIn, Minus
} from 'lucide-react'
import { Loader } from '@/components/ui/loader'


import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Switch } from '@/components/ui/switch'

// Default role for new users (fallback if no roles loaded)
const DEFAULT_ROLE = 'OPERATOR'

interface RoleOption {
  id: string
  name: string
  description: string | null
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface TenantUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: { name: string }
  createdAt: string
  lastLoginAt: string | null
}

interface TenantDetails {
  id: string
  name: string
  companyName: string
  vatNumber: string
  address: string
  city: string
  country: string
  phone: string
  isActive: boolean
  createdAt: string
  referralCode: string
  subscription: {
    plan: { id: string; displayName: string; maxVehicles: number; maxUsers: number }
    status: string
    interval: string
    currentPeriodStart: string
    currentPeriodEnd: string
  } | null
  users: TenantUser[]
  referrals: any[]
  referred?: { referrer: { id: string; name: string } }
  subscriptionPayments: any[]
  usagePercent: { vehicles: number; users: number }
  _count: { vehicles: number; users: number; bookings: number }
}

export default function TenantDetailPage() {
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  const tenantId = params.id as string
  const t = useTranslations('SuperAdmin')
  const { toast } = useToast()
  
  const [tenant, setTenant] = useState<TenantDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<TenantUser | null>(null)
  const [resetting, setResetting] = useState(false)

  // Subscription State
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false)
  const [activating, setActivating] = useState(false)
  const [plans, setPlans] = useState<any[]>([])
  const [activationData, setActivationData] = useState({
    planId: '',
    durationMonths: '12',
    paymentMethod: 'CASH'
  })

  // Add User State
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false)
  const [addingUser, setAddingUser] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', password: '', firstName: '', lastName: '', role: DEFAULT_ROLE })
  const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([])


  // Set Trial State
  const [trialDialogOpen, setTrialDialogOpen] = useState(false)
  const [settingTrial, setSettingTrial] = useState(false)
  const [trialDays, setTrialDays] = useState('14')

  // Delete User State
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<TenantUser | null>(null)
  const [deletingUser, setDeletingUser] = useState(false)
  const [togglingStatus, setTogglingStatus] = useState(false)

  // Time Adjustment State
  const [timeAdjustDialogOpen, setTimeAdjustDialogOpen] = useState(false)
  const [adjustingTime, setAdjustingTime] = useState(false)
  const [adjustDays, setAdjustDays] = useState('0')

  // Payment Dialog State
  const [addPaymentDialogOpen, setAddPaymentDialogOpen] = useState(false)
  const [addingPayment, setAddingPayment] = useState(false)
  const [paymentData, setPaymentData] = useState({ amount: '', paymentMethod: 'CASH', notes: '' })

  // Edit Tenant State

  const [editTenantDialogOpen, setEditTenantDialogOpen] = useState(false)
  const [editingTenant, setEditingTenant] = useState(false)
  const [editTenantData, setEditTenantData] = useState({
    name: '', companyName: '', vatNumber: '', address: '', city: '', country: '', phone: ''
  })

  // Delete Tenant State
  const [deleteTenantDialogOpen, setDeleteTenantDialogOpen] = useState(false)
  const [deletingTenant, setDeletingTenant] = useState(false)

  // Impersonate State
  const [impersonating, setImpersonating] = useState(false)

  // Fetch Plans
  useEffect(() => {
    const fetchPlans = async () => {
        try {
            const res = await fetch(`${API_URL}/admin/subscription-plans`, {
                 headers: { Authorization: `Bearer ${localStorage.getItem('superadmin_token')}` } 
            });
            if(res.ok) {
                const data = await res.json();
                setPlans(data);
            }
        } catch (e) { console.error("Failed to fetch plans", e); }
    }
    if (subscriptionDialogOpen && plans.length === 0) fetchPlans();
  }, [subscriptionDialogOpen, plans.length]);

  // Fetch roles when add user dialog opens
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await fetch(`${API_URL}/admin/roles`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('superadmin_token')}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAvailableRoles(data);
          // Set default role if we have roles
          if (data.length > 0 && !newUser.role) {
            setNewUser(prev => ({ ...prev, role: data[0].name }));
          }
        }
      } catch (e) { console.error('Failed to fetch roles', e); }
    };
    if (addUserDialogOpen && availableRoles.length === 0) fetchRoles();
  }, [addUserDialogOpen, availableRoles.length]);

  const handleActivateSubscription = async () => {
    if (!activationData.planId) {
        toast({ title: t('loginFailed'), description: t('tenantDetails.selectPlan'), variant: "destructive" });
        return;
    }
    setActivating(true);
    try {
        const res = await fetch(`${API_URL}/admin/tenants/${tenantId}/subscription/activate`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('superadmin_token')}` 
            },
            body: JSON.stringify({
                planId: activationData.planId,
                durationMonths: parseInt(activationData.durationMonths),
                paymentMethod: activationData.paymentMethod
            })
        });
        
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Failed to activate');
        }

        toast({ title: t('loginSuccess'), description: "Subscription activated successfully" });
        setSubscriptionDialogOpen(false);
        window.location.reload(); 
    } catch (error: any) {
        toast({ title: t('loginFailed'), description: error.message, variant: "destructive" });
    } finally {
        setActivating(false);
    }
  }

  const getToken = () => localStorage.getItem('superadmin_token')

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        const res = await fetch(`${API_URL}/admin/tenants/${tenantId}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        })
        if (!res.ok) throw new Error('Failed')
        setTenant(await res.json())
      } catch {
        router.push(`/${locale}/superadmin/tenants`)
      } finally {
        setLoading(false)
      }
    }
    fetchTenant()
  }, [tenantId, router, locale])

  const handleResetPassword = async () => {
    if (!selectedUser) return
    setResetting(true)
    try {
      const res = await fetch(`${API_URL}/admin/tenants/${tenantId}/users/${selectedUser.id}/reset-password`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      
      toast({
        title: t('tenantDetails.resetPassword'),
        description: t('tenantDetails.tempPassword', { password: data.temporaryPassword }),
      })
    } catch (error) {
      toast({
        title: t('loginFailed'),
        description: error instanceof Error ? error.message : t('invalidCredentials'),
        variant: 'destructive',
      })
    } finally {
      setResetting(false)
      setResetDialogOpen(false)
    }
  }

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.firstName || !newUser.lastName) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' })
      return
    }
    setAddingUser(true)
    try {
      const res = await fetch(`${API_URL}/admin/tenants/${tenantId}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(newUser),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Failed to create user')
      }
      toast({ title: 'Success', description: 'User created successfully' })
      setAddUserDialogOpen(false)
      setNewUser({ email: '', password: '', firstName: '', lastName: '', role: DEFAULT_ROLE })
      window.location.reload()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setAddingUser(false)
    }
  }

  const handleSetTrial = async () => {
    const days = parseInt(trialDays)
    if (isNaN(days) || days < 1) {
      toast({ title: 'Error', description: 'Please enter a valid number of days', variant: 'destructive' })
      return
    }
    setSettingTrial(true)
    try {
      const res = await fetch(`${API_URL}/admin/tenants/${tenantId}/trial`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ trialDays: days }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Failed to set trial')
      }
      toast({ title: 'Success', description: `Trial set for ${days} days` })
      setTrialDialogOpen(false)
      window.location.reload()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setSettingTrial(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return
    setDeletingUser(true)
    try {
      const res = await fetch(`${API_URL}/admin/tenants/${tenantId}/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Failed to delete user')
      }
      toast({ title: 'Success', description: 'User deleted successfully' })
      setDeleteUserDialogOpen(false)
      window.location.reload()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setDeletingUser(false)
    }
  }

  const handleToggleTenant = async () => {
    if (!tenant) return
    setTogglingStatus(true)
    try {
      const res = await fetch(`${API_URL}/admin/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ isActive: !tenant.isActive }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      toast({ title: 'Success', description: `Tenant ${tenant.isActive ? 'deactivated' : 'activated'}` })
      window.location.reload()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setTogglingStatus(false)
    }
  }

  const openEditTenantDialog = () => {
    if (!tenant) return
    setEditTenantData({
      name: tenant.name || '',
      companyName: tenant.companyName || '',
      vatNumber: tenant.vatNumber || '',
      address: tenant.address || '',
      city: tenant.city || '',
      country: tenant.country || '',
      phone: tenant.phone || '',
    })
    setEditTenantDialogOpen(true)
  }

  const handleEditTenant = async () => {
    setEditingTenant(true)
    try {
      const res = await fetch(`${API_URL}/admin/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(editTenantData),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Failed to update tenant')
      }
      toast({ title: 'Success', description: 'Tenant updated' })
      setEditTenantDialogOpen(false)
      window.location.reload()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setEditingTenant(false)
    }
  }

  const handleDeleteTenant = async () => {
    setDeletingTenant(true)
    try {
      const res = await fetch(`${API_URL}/admin/tenants/${tenantId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Failed to delete tenant')
      }
      toast({ title: 'Success', description: 'Tenant deleted' })
      router.push(`/${locale}/superadmin/tenants`)
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setDeletingTenant(false)
    }
  }

  const handleImpersonate = async () => {
    setImpersonating(true)
    try {
      const res = await fetch(`${API_URL}/admin/tenants/${tenantId}/impersonate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Failed to impersonate')
      }
      const data = await res.json()
      // Store tenant token and redirect
      localStorage.setItem('token', data.token)
      localStorage.setItem('impersonated', 'true')
      toast({ title: 'Success', description: `Logged in as ${data.user.name}` })
      window.location.href = `/${locale}/dashboard`
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setImpersonating(false)
    }
  }

  const getUsageColor = (pct: number) => {
    if (pct >= 90) return 'bg-red-500'
    if (pct >= 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader />
      </div>
    )
  }

  if (!tenant) return null

  return (
    <>
      <div className="flex items-center gap-3 mb-6 -mt-2">
        <Link href={`/${locale}/superadmin/tenants`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">{tenant.companyName || tenant.name}</h2>
          <p className="text-sm text-muted-foreground">{t('tenantDetails.title')}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {tenant.isActive ? t('tenants.active') : t('tenants.inactive')}
          </span>
          <Switch 
            checked={tenant.isActive} 
            onCheckedChange={handleToggleTenant}
            disabled={togglingStatus}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={openEditTenantDialog}>
            <Edit className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">{t('tenantDetails.edit') || 'Edit'}</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleImpersonate}
            disabled={impersonating}
          >
            {impersonating ? <Loader /> : (
              <>
                <LogIn className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">{t('tenantDetails.loginAs') || 'Login As'}</span>
              </>
            )}
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={() => setDeleteTenantDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">{t('tenantDetails.delete') || 'Delete'}</span>
          </Button>
        </div>
      </div>


      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {t('tenantDetails.companyInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('tenantDetails.status')}</span>
                {tenant.isActive ? (
                  <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" /> {t('tenants.active')}</Badge>
                ) : (
                  <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> {t('tenants.inactive')}</Badge>
                )}
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('tenantDetails.vat')}</span><span>{tenant.vatNumber || '-'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('tenantDetails.phone')}</span><span>{tenant.phone || '-'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('tenantDetails.address')}</span><span>{tenant.address || '-'}, {tenant.city}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('tenants.country') || 'Country'}</span><span>{tenant.country}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('tenantDetails.registered')}</span><span>{new Date(tenant.createdAt).toLocaleDateString('it-IT')}</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-green-600" />
                  {t('tenantDetails.subscription')}
                </CardTitle>
              </div>
              
              {/* Action Buttons - Below title */}
              <div className="flex flex-wrap gap-2">
                {/* No subscription: Show Trial and Activate */}
                {!tenant.subscription && (
                  <>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setTrialDialogOpen(true)}>
                      <Clock className="h-3.5 w-3.5" />
                      {t('tenantDetails.setTrial') || 'Trial'}
                    </Button>
                    <Button size="sm" variant="default" className="gap-1.5" onClick={() => {
                      setActivationData(prev => ({...prev, planId: ''}))
                      setSubscriptionDialogOpen(true)
                    }}>
                      <CreditCard className="h-3.5 w-3.5" />
                      {t('tenantDetails.activate') || 'Activate'}
                    </Button>
                  </>
                )}
                
                {/* Has subscription: Show Modify Plan and Adjust Time */}
                {tenant.subscription && (
                  <>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => {
                      if (tenant.subscription?.plan?.id) {
                        setActivationData(prev => ({...prev, planId: tenant.subscription!.plan!.id}))
                      }
                      setSubscriptionDialogOpen(true)
                    }}>
                      <Edit className="h-3.5 w-3.5" />
                      {t('tenantDetails.modifyPlan') || 'Change Plan'}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="gap-1.5"
                      onClick={() => setTimeAdjustDialogOpen(true)}
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      {t('tenantDetails.adjustTime') || 'Adjust Time'}
                    </Button>
                  </>
                )}


              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t('tenantDetails.plan')}</span>
                <Badge>{tenant.subscription?.plan?.displayName || t('tenantDetails.noPlan')}</Badge>
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('tenantDetails.status')}</span><span>{tenant.subscription?.status || '-'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('tenantDetails.startDate') || 'Inizio'}</span><span>{tenant.subscription?.currentPeriodStart ? new Date(tenant.subscription.currentPeriodStart).toLocaleDateString('it-IT') : '-'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('tenantDetails.expires')}</span><span>{tenant.subscription ? new Date(tenant.subscription.currentPeriodEnd).toLocaleDateString('it-IT') : '-'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('tenantDetails.interval') || 'Intervallo'}</span><span>{tenant.subscription?.interval || '-'}</span></div>

              
              <div className="pt-4 border-t space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground flex items-center gap-1"><Car className="h-3 w-3" /> {t('tenantDetails.vehicles')}</span>
                    <span>{tenant._count.vehicles}/{tenant.subscription?.plan?.maxVehicles || 0}</span>
                  </div>
                  <Progress value={tenant.usagePercent.vehicles} className={`h-2 ${getUsageColor(tenant.usagePercent.vehicles)}`} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> {t('tenantDetails.users')}</span>
                    <span>{tenant._count.users}/{tenant.subscription?.plan?.maxUsers || 0}</span>
                  </div>
                  <Progress value={tenant.usagePercent.users} className={`h-2 ${getUsageColor(tenant.usagePercent.users)}`} />
                </div>
              </div>

              {/* Subscription Actions */}
              {tenant.subscription && (
                <div className="pt-4 border-t space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t('tenantDetails.subscriptionActions') || 'Subscription Actions'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['ACTIVE', 'TRIAL'].includes(tenant.subscription.status) && (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-yellow-600 border-yellow-600 hover:bg-yellow-50 gap-1.5"
                          onClick={async (e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            if (!confirm(t('tenantDetails.confirmSuspend') || 'Suspend this subscription?')) return
                            try {
                              const res = await fetch(`${API_URL}/admin/tenants/${tenantId}/subscription/suspend`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
                                body: JSON.stringify({ reason: 'Suspended by SuperAdmin' })
                              })
                              if (!res.ok) {
                                const err = await res.json().catch(() => ({}))
                                throw new Error(err.message || 'Failed to suspend')
                              }
                              toast({ title: 'Success', description: 'Subscription suspended' })
                              window.location.reload()
                            } catch (error: any) { 
                              console.error('Suspend error:', error)
                              toast({ title: 'Error', description: error.message || 'Failed', variant: 'destructive' }) 
                            }
                          }}
                        >
                          <Clock className="h-3.5 w-3.5" />
                          {t('tenantDetails.suspend') || 'Suspend'}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-red-600 border-red-600 hover:bg-red-50 gap-1.5"
                          onClick={async (e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            if (!confirm(t('tenantDetails.confirmCancel') || 'Cancel this subscription?')) return
                            try {
                              const res = await fetch(`${API_URL}/admin/tenants/${tenantId}/subscription/cancel`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
                                body: JSON.stringify({ reason: 'Canceled by SuperAdmin' })
                              })
                              if (!res.ok) {
                                const err = await res.json().catch(() => ({}))
                                throw new Error(err.message || 'Failed to cancel')
                              }
                              toast({ title: 'Success', description: 'Subscription canceled' })
                              window.location.reload()
                            } catch (error: any) { 
                              console.error('Cancel error:', error)
                              toast({ title: 'Error', description: error.message || 'Failed', variant: 'destructive' }) 
                            }
                          }}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          {t('tenantDetails.cancelSubscription') || 'Cancel'}
                        </Button>
                      </>
                    )}
                    {['SUSPENDED', 'CANCELED', 'PAST_DUE'].includes(tenant.subscription.status) && (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-green-600 border-green-600 hover:bg-green-50 gap-1.5"
                          onClick={async (e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            try {
                              const res = await fetch(`${API_URL}/admin/tenants/${tenantId}/subscription/reactivate`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
                                body: JSON.stringify({ extensionDays: 0 })
                              })
                              if (!res.ok) {
                                const err = await res.json().catch(() => ({}))
                                throw new Error(err.message || 'Failed to reactivate')
                              }
                              toast({ title: 'Success', description: 'Subscription reactivated' })
                              window.location.reload()
                            } catch (error: any) { 
                              console.error('Reactivate error:', error)
                              toast({ title: 'Error', description: error.message || 'Failed', variant: 'destructive' }) 
                            }
                          }}
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          {t('tenantDetails.reactivateNormal') || 'Reactivate'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}


            </CardContent>
          </Card>


          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-blue-600" />
                {t('tenantDetails.referral')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{t('referrals.code')}</span><span className="font-mono">{tenant.referralCode}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('tenantDetails.tenantsReferred')}</span><span>{tenant.referrals?.length || 0}</span></div>
              {tenant.referred && (
                <div className="flex justify-between"><span className="text-muted-foreground">{t('tenantDetails.referredBy')}</span><span>{tenant.referred.referrer.name}</span></div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                {t('tenantDetails.users')} ({tenant.users.length})
              </CardTitle>
              <CardDescription>{t('tenantDetails.manageUsers')}</CardDescription>
            </div>
            <Button size="sm" onClick={() => setAddUserDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              {t('tenantDetails.addUser') || 'Add User'}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tenant.users.map(user => (
                <div key={user.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg bg-muted/50 gap-3">
                  {/* User Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{user.firstName} {user.lastName}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3 flex-shrink-0" /> 
                        <span className="truncate">{user.email}</span>
                      </p>
                    </div>
                  </div>
                  
                  {/* Actions - Wrap on mobile */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 ml-13 sm:ml-0">
                    <Badge variant="outline" className="text-xs">{user.role.name}</Badge>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('it-IT') : t('tenantDetails.never')}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => { setSelectedUser(user); setResetDialogOpen(true) }}
                      >
                        <Key className="h-3.5 w-3.5 sm:mr-1" />
                        <span className="hidden sm:inline">{t('tenantDetails.resetPassword')}</span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-8 text-destructive hover:text-destructive"
                        onClick={() => { setUserToDelete(user); setDeleteUserDialogOpen(true) }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-green-600" />
                {t('tenantDetails.paymentHistory') || 'Payment History'} ({tenant.subscriptionPayments?.length || 0})
              </CardTitle>
              <CardDescription>{t('tenantDetails.paymentHistoryDesc') || 'Recent subscription payments'}</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => {
              setPaymentData({ amount: '', paymentMethod: 'CASH', notes: '' })
              setAddPaymentDialogOpen(true)
            }}>
              <Plus className="h-4 w-4 mr-1" />
              {t('tenantDetails.addPayment') || 'Add Payment'}
            </Button>
          </CardHeader>

          <CardContent>
            {(!tenant.subscriptionPayments || tenant.subscriptionPayments.length === 0) ? (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>{t('tenantDetails.noPayments') || 'No payments yet'}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tenant.subscriptionPayments.map((payment: any) => (
                  <div key={payment.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg bg-muted/50 gap-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">€{Number(payment.amount)?.toFixed(2) || '0.00'}</p>
                        <p className="text-sm text-muted-foreground">{payment.provider || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-13 sm:ml-0">
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(payment.createdAt).toLocaleDateString('it-IT')}
                      </div>
                      {payment.description && (
                        <span className="text-xs text-muted-foreground max-w-[150px] truncate" title={payment.description}>
                          {payment.description}
                        </span>
                      )}

                      <Badge 
                        className={`cursor-pointer transition-all hover:opacity-80 ${
                          payment.status === 'SUCCEEDED' ? 'bg-green-600' : 
                          payment.status === 'FAILED' ? 'bg-red-600' : 
                          'bg-yellow-500 hover:bg-green-600'
                        }`}
                        onClick={async () => {
                          if (payment.status === 'SUCCEEDED') return; // Already paid
                          if (!confirm(t('tenantDetails.confirmMarkPaid') || 'Mark this payment as paid?')) return;
                          try {
                            const res = await fetch(`${API_URL}/admin/payments/${payment.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
                              body: JSON.stringify({ status: 'SUCCEEDED' })
                            });
                            if (!res.ok) throw new Error('Failed');
                            toast({ title: 'Success', description: t('tenantDetails.paymentMarkedPaid') || 'Payment marked as paid' });
                            window.location.reload();
                          } catch { toast({ title: 'Error', variant: 'destructive' }) }
                        }}
                        title={payment.status === 'PENDING' ? (t('tenantDetails.clickToMarkPaid') || 'Click to mark as paid') : ''}
                      >
                        {payment.status === 'PENDING' ? (t('tenantDetails.pending') || 'PENDING') : 
                         payment.status === 'SUCCEEDED' ? (t('tenantDetails.paid') || 'PAID') : payment.status}
                      </Badge>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('tenantDetails.resetPasswordTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUser ? t('tenantDetails.resetPasswordDesc', { 
                name: `${selectedUser.firstName} ${selectedUser.lastName}`, 
                email: selectedUser.email 
              }) : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('tenantDetails.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPassword} disabled={resetting}>
              {resetting && <Loader className="mr-2" />}
              {t('tenantDetails.resetPassword')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={subscriptionDialogOpen} onOpenChange={setSubscriptionDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>
                  {tenant?.subscription 
                    ? (t('tenantDetails.changePlanTitle') || 'Change Plan') 
                    : t('tenantDetails.activateTitle')}
                </DialogTitle>
                <DialogDescription>
                  {tenant?.subscription 
                    ? (t('tenantDetails.changePlanDesc') || 'Select a new plan. Duration will not be modified.')
                    : t('tenantDetails.activateDesc')}
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
                <div className="grid gap-2">
                    <Label className="text-sm font-medium">{t('tenantDetails.plan')}</Label>
                    <Select 
                        value={activationData.planId} 
                        onValueChange={(val) => setActivationData({...activationData, planId: val})}
                    >
                        <SelectTrigger className="w-full h-11">
                            <SelectValue placeholder={t('tenantDetails.selectPlan')} />
                        </SelectTrigger>
                        <SelectContent className="max-h-80">
                            {plans.map((plan: any) => (
                                <SelectItem key={plan.id} value={plan.id} className="py-3">
                                    {plan.displayName} - €{plan.price}/mo ({plan.maxVehicles} {t('tenantDetails.vehicles').toLowerCase()}, {plan.maxUsers} {t('tenantDetails.users').toLowerCase()})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                
                {/* Only show duration and payment for NEW subscriptions */}
                {!tenant?.subscription && (
                  <>
                    <div className="grid gap-2">
                        <Label className="text-sm font-medium">{t('tenantDetails.duration')}</Label>
                        <Select 
                            value={activationData.durationMonths} 
                            onValueChange={(val) => setActivationData({...activationData, durationMonths: val})}
                        >
                            <SelectTrigger className="w-full h-11">
                                <SelectValue placeholder={t('tenantDetails.duration')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1" className="py-3">{t('tenantDetails.months', { count: 1 })}</SelectItem>
                                <SelectItem value="3" className="py-3">{t('tenantDetails.months', { count: 3 })}</SelectItem>
                                <SelectItem value="6" className="py-3">{t('tenantDetails.months', { count: 6 })}</SelectItem>
                                <SelectItem value="12" className="py-3">{t('tenantDetails.year')}</SelectItem>
                                <SelectItem value="24" className="py-3">{t('tenantDetails.years', { count: 2 })}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label className="text-sm font-medium">{t('tenantDetails.paymentMethod')}</Label>
                        <Select 
                            value={activationData.paymentMethod} 
                            onValueChange={(val) => setActivationData({...activationData, paymentMethod: val})}
                        >
                            <SelectTrigger className="w-full h-11">
                                <SelectValue placeholder={t('tenantDetails.paymentMethod')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="CASH" className="py-3">{t('tenantDetails.cash')}</SelectItem>
                                <SelectItem value="STRIPE" className="py-3">Stripe</SelectItem>
                                <SelectItem value="PAYSERA" className="py-3">Paysera</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                  </>
                )}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setSubscriptionDialogOpen(false)}>{t('tenantDetails.cancel')}</Button>
                <Button 
                  onClick={async () => {
                    if (!activationData.planId) {
                      toast({ title: 'Error', description: t('tenantDetails.selectPlan'), variant: 'destructive' });
                      return;
                    }
                    setActivating(true);
                    try {
                      // Use different endpoint based on whether subscription exists
                      const endpoint = tenant?.subscription 
                        ? `${API_URL}/admin/tenants/${tenantId}/subscription/plan`
                        : `${API_URL}/admin/tenants/${tenantId}/subscription/activate`;
                      
                      const method = tenant?.subscription ? 'PATCH' : 'POST';
                      
                      const body = tenant?.subscription 
                        ? { planId: activationData.planId }
                        : {
                            planId: activationData.planId,
                            durationMonths: parseInt(activationData.durationMonths),
                            paymentMethod: activationData.paymentMethod
                          };
                      
                      const res = await fetch(endpoint, {
                        method,
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
                        body: JSON.stringify(body)
                      });
                      
                      if (!res.ok) {
                        const err = await res.json();
                        throw new Error(err.message || 'Failed');
                      }
                      
                      toast({ title: 'Success', description: tenant?.subscription ? 'Plan changed' : 'Subscription activated' });
                      setSubscriptionDialogOpen(false);
                      window.location.reload();
                    } catch (error: any) {
                      toast({ title: 'Error', description: error.message, variant: 'destructive' });
                    } finally {
                      setActivating(false);
                    }
                  }} 
                  disabled={activating}
                >
                    {activating && <Loader className="mr-2" />}
                    {tenant?.subscription 
                      ? (t('tenantDetails.confirmChangePlan') || 'Change Plan')
                      : t('tenantDetails.confirmActivation')}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Add User Dialog */}
      <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('tenantDetails.addUserTitle') || 'Add New User'}</DialogTitle>
            <DialogDescription>{t('tenantDetails.addUserDesc') || 'Create a new user for this tenant.'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('tenants.firstName') || 'First Name'} *</Label>
                <Input value={newUser.firstName} onChange={e => setNewUser({...newUser, firstName: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label>{t('tenants.lastName') || 'Last Name'} *</Label>
                <Input value={newUser.lastName} onChange={e => setNewUser({...newUser, lastName: e.target.value})} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{t('tenants.email') || 'Email'} *</Label>
              <Input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
            </div>
            <div className="grid gap-2">
              <Label>{t('tenants.password') || 'Password'} *</Label>
              <Input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
            </div>
            <div className="grid gap-2">
              <Label>{t('tenantDetails.role') || 'Role'}</Label>
              <Select value={newUser.role} onValueChange={val => setNewUser({...newUser, role: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map(role => (
                    <SelectItem key={role.id} value={role.name}>{role.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddUserDialogOpen(false)}>{t('tenantDetails.cancel') || 'Cancel'}</Button>
            <Button onClick={handleAddUser} disabled={addingUser}>
              {addingUser && <Loader className="mr-2" />}
              {t('tenantDetails.addUser') || 'Add User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Trial Dialog */}
      <Dialog open={trialDialogOpen} onOpenChange={setTrialDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('tenantDetails.setTrialTitle') || 'Set Trial Period'}</DialogTitle>
            <DialogDescription>{t('tenantDetails.setTrialDesc') || 'Start or extend the trial period for this tenant.'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t('tenantDetails.trialDays') || 'Trial Days'}</Label>
              <Input 
                type="number" 
                min="1" 
                value={trialDays} 
                onChange={e => setTrialDays(e.target.value)} 
                placeholder="14"
              />
              <p className="text-sm text-muted-foreground">{t('tenantDetails.trialDaysHint') || 'Number of days from today'}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrialDialogOpen(false)}>{t('tenantDetails.cancel') || 'Cancel'}</Button>
            <Button onClick={handleSetTrial} disabled={settingTrial}>
              {settingTrial && <Loader className="mr-2" />}
              {t('tenantDetails.setTrial') || 'Set Trial'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Time Dialog */}
      <Dialog open={timeAdjustDialogOpen} onOpenChange={setTimeAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('tenantDetails.adjustTimeTitle') || 'Adjust Subscription Time'}</DialogTitle>
            <DialogDescription>{t('tenantDetails.adjustTimeDesc') || 'Add or remove days from the subscription.'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t('tenantDetails.daysToAdjust') || 'Days to Adjust'}</Label>
              <Input 
                type="number" 
                value={adjustDays} 
                onChange={e => setAdjustDays(e.target.value)} 
                placeholder="30"
              />
              <p className="text-sm text-muted-foreground">{t('tenantDetails.adjustDaysHint') || 'Positive to extend, negative to reduce'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="text-red-600" onClick={() => setAdjustDays('-30')}>30d</Button>
              <Button size="sm" variant="outline" className="text-red-600" onClick={() => setAdjustDays('-7')}>7d</Button>
              <Button size="sm" variant="outline" className="text-green-600" onClick={() => setAdjustDays('7')}>7d</Button>
              <Button size="sm" variant="outline" className="text-green-600" onClick={() => setAdjustDays('30')}>30d</Button>
              <Button size="sm" variant="outline" className="text-green-600" onClick={() => setAdjustDays('90')}>90d</Button>
              <Button size="sm" variant="outline" className="text-green-600" onClick={() => setAdjustDays('365')}>1Y</Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTimeAdjustDialogOpen(false)}>{t('tenantDetails.cancel') || 'Cancel'}</Button>
            <Button 
              onClick={async () => {
                setAdjustingTime(true)
                try {
                  const days = parseInt(adjustDays)
                  if (isNaN(days)) throw new Error('Invalid number')
                  const res = await fetch(`${API_URL}/admin/tenants/${tenantId}/subscription/reactivate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
                    body: JSON.stringify({ extensionDays: days })
                  })
                  if (!res.ok) throw new Error('Failed')
                  toast({ title: 'Success', description: `${days > 0 ? '+' : ''}${days} days applied` })
                  setTimeAdjustDialogOpen(false)
                  window.location.reload()
                } catch (error: any) {
                  toast({ title: 'Error', description: error.message || 'Failed', variant: 'destructive' })
                } finally {
                  setAdjustingTime(false)
                }
              }} 
              disabled={adjustingTime}
            >
              {adjustingTime && <Loader className="mr-2" />}
              {t('tenantDetails.applyAdjustment') || 'Apply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Payment Dialog */}
      <Dialog open={addPaymentDialogOpen} onOpenChange={setAddPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('tenantDetails.addPaymentTitle') || 'Add Payment'}</DialogTitle>
            <DialogDescription>{t('tenantDetails.addPaymentDesc') || 'Register a manual cash payment for this tenant.'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t('tenantDetails.amount') || 'Amount'} (€)</Label>
              <Input 
                type="number" 
                step="0.01"
                min="0"
                value={paymentData.amount} 
                onChange={e => setPaymentData({...paymentData, amount: e.target.value})} 
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label>{t('tenantDetails.paymentMethod') || 'Payment Method'}</Label>
              <Select 
                value={paymentData.paymentMethod} 
                onValueChange={(val) => setPaymentData({...paymentData, paymentMethod: val})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">{t('tenantDetails.cash') || 'Cash'}</SelectItem>
                  <SelectItem value="BANK_TRANSFER">{t('tenantDetails.bankTransfer') || 'Bank Transfer'}</SelectItem>
                  <SelectItem value="OTHER">{t('tenantDetails.other') || 'Other'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t('tenantDetails.notes') || 'Notes'} ({t('tenantDetails.optional') || 'optional'})</Label>
              <Input 
                value={paymentData.notes} 
                onChange={e => setPaymentData({...paymentData, notes: e.target.value})} 
                placeholder={t('tenantDetails.notesPlaceholder') || 'Receipt number, etc.'}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddPaymentDialogOpen(false)}>{t('tenantDetails.cancel') || 'Cancel'}</Button>
            <Button 
              onClick={async () => {
                if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
                  toast({ title: 'Error', description: 'Enter a valid amount', variant: 'destructive' });
                  return;
                }
                setAddingPayment(true);
                try {
                  const res = await fetch(`${API_URL}/admin/tenants/${tenantId}/payments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
                    body: JSON.stringify({
                      amount: parseFloat(paymentData.amount),
                      paymentMethod: paymentData.paymentMethod,
                      notes: paymentData.notes || undefined
                    })
                  });
                  if (!res.ok) throw new Error('Failed to add payment');
                  toast({ title: 'Success', description: 'Payment added successfully' });
                  setAddPaymentDialogOpen(false);
                  window.location.reload();
                } catch (error: any) {
                  toast({ title: 'Error', description: error.message, variant: 'destructive' });
                } finally {
                  setAddingPayment(false);
                }
              }} 
              disabled={addingPayment}
            >
              {addingPayment && <Loader className="mr-2" />}
              {t('tenantDetails.addPayment') || 'Add Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}


      <AlertDialog open={deleteUserDialogOpen} onOpenChange={setDeleteUserDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('tenantDetails.deleteUserTitle') || 'Delete User?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('tenantDetails.deleteUserDesc') || `Are you sure you want to delete ${userToDelete?.firstName} ${userToDelete?.lastName}? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('tenantDetails.cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteUser} 
              disabled={deletingUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingUser && <Loader className="mr-2" />}
              {t('tenantDetails.delete') || 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Tenant Dialog */}
      <Dialog open={editTenantDialogOpen} onOpenChange={setEditTenantDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('tenantDetails.editTenant') || 'Edit Tenant'}</DialogTitle>
            <DialogDescription>{t('tenantDetails.editTenantDesc') || 'Update tenant information'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('tenants.name') || 'Name'}</Label>
                <Input value={editTenantData.name} onChange={e => setEditTenantData({...editTenantData, name: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label>{t('tenants.companyName') || 'Company Name'}</Label>
                <Input value={editTenantData.companyName} onChange={e => setEditTenantData({...editTenantData, companyName: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('tenantDetails.vat') || 'VAT Number'}</Label>
                <Input value={editTenantData.vatNumber} onChange={e => setEditTenantData({...editTenantData, vatNumber: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label>{t('tenantDetails.phone') || 'Phone'}</Label>
                <Input value={editTenantData.phone} onChange={e => setEditTenantData({...editTenantData, phone: e.target.value})} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{t('tenantDetails.address') || 'Address'}</Label>
              <Input value={editTenantData.address} onChange={e => setEditTenantData({...editTenantData, address: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('tenants.city') || 'City'}</Label>
                <Input value={editTenantData.city} onChange={e => setEditTenantData({...editTenantData, city: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label>{t('tenants.country') || 'Country'}</Label>
                <Input value={editTenantData.country} onChange={e => setEditTenantData({...editTenantData, country: e.target.value})} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTenantDialogOpen(false)}>{t('tenantDetails.cancel') || 'Cancel'}</Button>
            <Button onClick={handleEditTenant} disabled={editingTenant}>
              {editingTenant && <Loader className="mr-2" />}
              {t('tenantDetails.save') || 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Tenant Confirmation */}
      <AlertDialog open={deleteTenantDialogOpen} onOpenChange={setDeleteTenantDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('tenantDetails.deleteTenantTitle') || 'Delete Tenant?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('tenantDetails.deleteTenantDesc') || `Are you sure you want to delete "${tenant?.companyName || tenant?.name}"? This will deactivate the tenant and cancel their subscription.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('tenantDetails.cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteTenant} 
              disabled={deletingTenant}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingTenant && <Loader className="mr-2" />}
              {t('tenantDetails.delete') || 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
