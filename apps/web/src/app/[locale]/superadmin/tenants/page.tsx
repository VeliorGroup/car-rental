'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { 
  Building2, Search, ChevronRight,
  Users, Car, Filter, CheckCircle, XCircle, Plus
} from 'lucide-react'
import { Loader } from '@/components/ui/loader'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface Tenant {
  id: string
  name: string
  companyName: string
  country: string
  isActive: boolean
  createdAt: string
  subscription: { plan: string; status: string; currentPeriodEnd: string } | null
  usage: { vehicles: number; maxVehicles: number; users: number; maxUsers: number }
  bookingsCount: number
  referralsCount: number
}

export default function TenantsPage() {
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  const t = useTranslations('SuperAdmin')
  const { toast } = useToast()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Create Tenant State
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newTenant, setNewTenant] = useState({
    name: '',
    companyName: '',
    subdomain: '',
    country: 'AL',
    adminEmail: '',
    adminPassword: '',
    adminFirstName: '',
    adminLastName: '',
  })

  const getToken = () => localStorage.getItem('superadmin_token')

  const fetchTenants = async () => {
    try {
      const token = getToken()
      const res = await fetch(`${API_URL}/admin/tenants`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setTenants(data)
      setFilteredTenants(data)
    } catch {
      router.push(`/${locale}/superadmin/login`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTenants()
  }, [router, locale])

  useEffect(() => {
    let result = tenants
    
    if (search) {
      result = result.filter(t => 
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.companyName?.toLowerCase().includes(search.toLowerCase())
      )
    }
    
    if (statusFilter !== 'all') {
      if (statusFilter === 'active') result = result.filter(t => t.isActive)
      if (statusFilter === 'inactive') result = result.filter(t => !t.isActive)
      if (statusFilter === 'trial') result = result.filter(t => t.subscription?.status === 'TRIAL')
    }
    
    setFilteredTenants(result)
  }, [search, statusFilter, tenants])

  const getUsageColor = (current: number, max: number) => {
    const pct = (current / max) * 100
    if (pct >= 90) return 'text-red-600'
    if (pct >= 70) return 'text-yellow-600'
    return 'text-green-600'
  }

  const handleCreateTenant = async () => {
    if (!newTenant.name || !newTenant.subdomain || !newTenant.adminEmail || !newTenant.adminPassword || !newTenant.adminFirstName || !newTenant.adminLastName) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' })
      return
    }
    setCreating(true)
    try {
      const res = await fetch(`${API_URL}/admin/tenants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(newTenant),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Failed to create tenant')
      }
      toast({ title: 'Success', description: 'Tenant created successfully' })
      setCreateDialogOpen(false)
      setNewTenant({ name: '', companyName: '', subdomain: '', country: 'AL', adminEmail: '', adminPassword: '', adminFirstName: '', adminLastName: '' })
      fetchTenants()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setCreating(false)
    }
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
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('tenants.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40 h-10">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder={t('tenants.status')} />
            </SelectTrigger>
            <SelectContent>
            <SelectItem value="all" className="py-3">{t('tenants.allStatus') || 'All Status'}</SelectItem>
            <SelectItem value="active" className="py-3">{t('tenants.active')}</SelectItem>
            <SelectItem value="inactive" className="py-3">{t('tenants.inactive')}</SelectItem>
            <SelectItem value="trial" className="py-3">{t('tenants.trial')}</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setCreateDialogOpen(true)} className="whitespace-nowrap">
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">{t('tenants.create') || 'Create Tenant'}</span>
        </Button>
        </div>
      </div>

      <div className="text-sm text-muted-foreground mb-4">
        {t('tenants.showingCount', { count: filteredTenants.length, total: tenants.length }) || `Showing ${filteredTenants.length} of ${tenants.length} tenants`}
      </div>

      <div className="space-y-3">
        {filteredTenants.map(tenant => (
          <Link key={tenant.id} href={`/${locale}/superadmin/tenants/${tenant.id}`}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="p-4">
                {/* Mobile: Stack vertically */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* Tenant Info */}
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">{tenant.companyName || tenant.name}</h3>
                        {tenant.isActive ? (
                          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                        <span>{tenant.country}</span>
                        <span>•</span>
                        <span>{new Date(tenant.createdAt).toLocaleDateString('it-IT')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stats - Responsive Grid */}
                  <div className="flex flex-wrap items-center gap-3 md:gap-6">
                    {/* Plan Badge */}
                    <div className="text-left md:text-right">
                      <Badge variant={tenant.subscription?.status === 'TRIAL' ? 'secondary' : 'default'} className="text-xs">
                        {tenant.subscription?.plan || t('tenantDetails.noPlan')}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-0.5">{tenant.subscription?.status || '-'}</p>
                    </div>

                    {/* Usage Bars - Hide on very small screens */}
                    <div className="hidden sm:block w-28 md:w-32">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Car className="h-3 w-3" /> {t('tenantDetails.vehicles')}
                        </span>
                        <span className={getUsageColor(tenant.usage.vehicles, tenant.usage.maxVehicles)}>
                          {tenant.usage.vehicles}/{tenant.usage.maxVehicles}
                        </span>
                      </div>
                      <Progress 
                        value={(tenant.usage.vehicles / tenant.usage.maxVehicles) * 100} 
                        className="h-1"
                      />
                      <div className="flex items-center justify-between text-xs mt-2 mb-1">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Users className="h-3 w-3" /> {t('tenantDetails.users') || 'Users'}
                        </span>
                        <span className={getUsageColor(tenant.usage.users, tenant.usage.maxUsers)}>
                          {tenant.usage.users}/{tenant.usage.maxUsers}
                        </span>
                      </div>
                      <Progress 
                        value={(tenant.usage.users / tenant.usage.maxUsers) * 100} 
                        className="h-1"
                      />
                    </div>

                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Create Tenant Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('tenants.createTitle') || 'Create New Tenant'}</DialogTitle>
            <DialogDescription>{t('tenants.createDesc') || 'Create a new tenant with an admin user and 14-day trial.'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('tenants.name') || 'Tenant Name'} *</Label>
                <Input value={newTenant.name} onChange={e => setNewTenant({...newTenant, name: e.target.value})} placeholder="My Company" />
              </div>
              <div className="grid gap-2">
                <Label>{t('tenants.companyName') || 'Company Name'}</Label>
                <Input value={newTenant.companyName} onChange={e => setNewTenant({...newTenant, companyName: e.target.value})} placeholder="My Company LLC" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('tenants.subdomain') || 'Subdomain'} *</Label>
                <Input value={newTenant.subdomain} onChange={e => setNewTenant({...newTenant, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})} placeholder="mycompany" />
              </div>
              <div className="grid gap-2">
                <Label>{t('tenants.country') || 'Country'}</Label>
                <Select value={newTenant.country} onValueChange={v => setNewTenant({...newTenant, country: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AL">Albania</SelectItem>
                    <SelectItem value="XK">Kosovo</SelectItem>
                    <SelectItem value="MK">North Macedonia</SelectItem>
                    <SelectItem value="IT">Italy</SelectItem>
                    <SelectItem value="DE">Germany</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">{t('tenants.adminUser') || 'Admin User'}</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>{t('tenants.firstName') || 'First Name'} *</Label>
                  <Input value={newTenant.adminFirstName} onChange={e => setNewTenant({...newTenant, adminFirstName: e.target.value})} />
                </div>
                <div className="grid gap-2">
                  <Label>{t('tenants.lastName') || 'Last Name'} *</Label>
                  <Input value={newTenant.adminLastName} onChange={e => setNewTenant({...newTenant, adminLastName: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="grid gap-2">
                  <Label>{t('tenants.email') || 'Email'} *</Label>
                  <Input type="email" value={newTenant.adminEmail} onChange={e => setNewTenant({...newTenant, adminEmail: e.target.value})} />
                </div>
                <div className="grid gap-2">
                  <Label>{t('tenants.password') || 'Password'} *</Label>
                  <Input type="password" value={newTenant.adminPassword} onChange={e => setNewTenant({...newTenant, adminPassword: e.target.value})} />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>{t('tenantDetails.cancel') || 'Cancel'}</Button>
            <Button onClick={handleCreateTenant} disabled={creating}>
              {creating && <Loader className="mr-2" />}
              {t('tenants.create') || 'Create Tenant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
