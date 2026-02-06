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
  Sparkles, Plus, Pencil, Trash2, Check, X
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

interface Feature {
  id: string
  name: string
  displayName: string
  description: string | null
  icon: string | null
  isActive: boolean
  sortOrder: number
  _count: { planFeatures: number }
}

export default function FeaturesPage() {
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  const t = useTranslations('SuperAdmin')
  const { toast } = useToast()
  
  const [features, setFeatures] = useState<Feature[]>([])
  const [loading, setLoading] = useState(true)
  
  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [featureToDelete, setFeatureToDelete] = useState<Feature | null>(null)
  const [deleting, setDeleting] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    icon: '',
    sortOrder: '0',
  })

  const getToken = () => localStorage.getItem('superadmin_token')

  const fetchFeatures = async () => {
    try {
      const token = getToken()
      if (!token) {
        router.push(`/${locale}/superadmin/login`)
        return
      }
      const res = await fetch(`${API_URL}/admin/features`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        console.error('Failed to fetch features:', res.status)
        setFeatures([])
        return
      }
      setFeatures(await res.json())
    } catch (error) {
      console.error('Error fetching features:', error)
      setFeatures([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFeatures()
  }, [])

  const openCreateDialog = () => {
    setEditingFeature(null)
    setFormData({
      name: '',
      displayName: '',
      description: '',
      icon: '',
      sortOrder: '0',
    })
    setDialogOpen(true)
  }

  const openEditDialog = (feature: Feature) => {
    setEditingFeature(feature)
    setFormData({
      name: feature.name,
      displayName: feature.displayName,
      description: feature.description || '',
      icon: feature.icon || '',
      sortOrder: feature.sortOrder.toString(),
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.displayName) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: formData.name,
        displayName: formData.displayName,
        description: formData.description || undefined,
        icon: formData.icon || undefined,
        sortOrder: parseInt(formData.sortOrder) || 0,
      }

      const url = editingFeature 
        ? `${API_URL}/admin/features/${editingFeature.id}` 
        : `${API_URL}/admin/features`
      
      const res = await fetch(url, {
        method: editingFeature ? 'PATCH' : 'POST',
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
          : (err.message || 'Failed to save feature')
        throw new Error(errorMessage)
      }

      toast({ title: 'Success', description: editingFeature ? 'Feature updated' : 'Feature created' })
      setDialogOpen(false)
      fetchFeatures()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || String(error), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!featureToDelete) return
    setDeleting(true)
    try {
      const res = await fetch(`${API_URL}/admin/features/${featureToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to delete')
      
      toast({ 
        title: 'Success', 
        description: data.deactivated ? 'Feature deactivated (used by plans)' : 'Feature deleted' 
      })
      setDeleteDialogOpen(false)
      fetchFeatures()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleActive = async (feature: Feature) => {
    try {
      const res = await fetch(`${API_URL}/admin/features/${feature.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ isActive: !feature.isActive }),
      })
      if (!res.ok) throw new Error('Failed')
      fetchFeatures()
    } catch {
      toast({ title: 'Error', description: 'Failed to update feature', variant: 'destructive' })
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold">{t('features.title') || 'Plan Features'}</h2>
          <p className="text-sm text-muted-foreground">{t('features.subtitle') || 'Manage features available for subscription plans'}</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          {t('features.create') || 'Create Feature'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map(feature => (
          <Card key={feature.id} className={!feature.isActive ? 'opacity-60' : ''}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-base">{feature.displayName}</CardTitle>
                    <CardDescription className="text-xs font-mono">{feature.name}</CardDescription>
                  </div>
                </div>
                <Switch 
                  checked={feature.isActive} 
                  onCheckedChange={() => handleToggleActive(feature)}
                />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {feature.description && (
                <p className="text-sm text-muted-foreground mb-3">{feature.description}</p>
              )}
              
              <div className="flex justify-between items-center pt-2 border-t">
                <Badge variant="secondary">
                  {feature._count.planFeatures} {feature._count.planFeatures === 1 ? 'plan' : 'plans'}
                </Badge>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEditDialog(feature)} title="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-destructive hover:text-destructive"
                    onClick={() => { setFeatureToDelete(feature); setDeleteDialogOpen(true) }}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {features.length === 0 && (
        <div className="text-center py-12">
          <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">No features yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Create your first feature to assign to plans</p>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Create Feature
          </Button>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingFeature ? 'Edit Feature' : 'Create Feature'}</DialogTitle>
            <DialogDescription>
              {editingFeature ? 'Update feature details' : 'Create a new feature for subscription plans'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Name (unique) *</Label>
              <Input 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                placeholder="email_support"
                disabled={!!editingFeature}
              />
              <p className="text-xs text-muted-foreground">Unique identifier, use snake_case</p>
            </div>
            <div className="grid gap-2">
              <Label>Display Name *</Label>
              <Input 
                value={formData.displayName} 
                onChange={e => setFormData({...formData, displayName: e.target.value})} 
                placeholder="Email Support"
              />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})} 
                placeholder="Brief description of this feature..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Icon Name</Label>
                <Input 
                  value={formData.icon} 
                  onChange={e => setFormData({...formData, icon: e.target.value})} 
                  placeholder="mail"
                />
                <p className="text-xs text-muted-foreground">Lucide icon name</p>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader className="mr-2" />}
              {editingFeature ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Feature</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{featureToDelete?.displayName}"? 
              {featureToDelete?._count?.planFeatures ? ` This feature is used by ${featureToDelete._count.planFeatures} plan(s) and will be deactivated instead.` : ''}
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
    </>
  )
}
