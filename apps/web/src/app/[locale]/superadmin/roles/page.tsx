'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader } from '@/components/ui/loader'
import { Plus, Pencil, Trash2, Users, Shield } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { Textarea } from '@/components/ui/textarea'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface Role {
  id: string
  name: string
  description: string | null
  permissions: string[]
  _count: { users: number }
  createdAt: string
}

export default function RolesPage() {
  const t = useTranslations('SuperAdmin')
  const { toast } = useToast()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })

  const getToken = () => {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem('superadmin_token') || ''
  }

  const loadRoles = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/roles`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      if (!res.ok) throw new Error('Failed to load roles')
      const data = await res.json()
      setRoles(data)
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load roles', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRoles()
  }, [])

  const openCreateDialog = () => {
    setEditingRole(null)
    setFormData({ name: '', description: '' })
    setDialogOpen(true)
  }

  const openEditDialog = (role: Role) => {
    setEditingRole(role)
    setFormData({
      name: role.name,
      description: role.description || '',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Error', description: 'Name is required', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const url = editingRole 
        ? `${API_URL}/admin/roles/${editingRole.id}`
        : `${API_URL}/admin/roles`
      
      const res = await fetch(url, {
        method: editingRole ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || undefined,
        })
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Failed to save')
      }

      toast({ title: 'Success', description: editingRole ? 'Role updated' : 'Role created' })
      setDialogOpen(false)
      loadRoles()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!roleToDelete) return

    try {
      const res = await fetch(`${API_URL}/admin/roles/${roleToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` }
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Failed to delete')
      }

      toast({ title: 'Success', description: 'Role deleted' })
      setDeleteDialogOpen(false)
      setRoleToDelete(null)
      loadRoles()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('roles.title') || 'User Roles'}</h1>
          <p className="text-muted-foreground">{t('roles.subtitle') || 'Manage roles available to tenants'}</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          {t('roles.create') || 'Create Role'}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {roles.map(role => (
          <Card key={role.id} className="relative group">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{role.name}</CardTitle>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {role._count.users} {t('roles.users') || 'users'}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(role)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => {
                      setRoleToDelete(role)
                      setDeleteDialogOpen(true)
                    }}
                    disabled={role._count.users > 0}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {role.description || t('roles.noDescription') || 'No description'}
              </p>
            </CardContent>
          </Card>
        ))}

        {roles.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t('roles.empty') || 'No roles defined yet'}</p>
            <Button variant="outline" className="mt-4" onClick={openCreateDialog}>
              {t('roles.createFirst') || 'Create your first role'}
            </Button>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRole ? (t('roles.edit') || 'Edit Role') : (t('roles.create') || 'Create Role')}
            </DialogTitle>
            <DialogDescription>
              {editingRole 
                ? (t('roles.editDesc') || 'Update the role details')
                : (t('roles.createDesc') || 'Create a new role for the platform')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t('roles.name') || 'Name'} *</Label>
              <Input 
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                placeholder="ADMIN"
              />
              <p className="text-xs text-muted-foreground">{t('roles.nameHint') || 'Will be converted to uppercase'}</p>
            </div>
            <div className="grid gap-2">
              <Label>{t('roles.description') || 'Description'}</Label>
              <Textarea 
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Full access to all features"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader className="mr-2 h-4 w-4" />}
              {editingRole ? (t('common.save') || 'Save') : (t('common.create') || 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('roles.deleteTitle') || 'Delete Role?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('roles.deleteDesc') || `Are you sure you want to delete "${roleToDelete?.name}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete') || 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
