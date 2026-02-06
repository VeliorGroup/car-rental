'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import api from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { Loader } from '@/components/ui/loader'

interface BranchFormProps {
  initialData?: any
  onSuccess?: () => void
  onCancel?: () => void
}

export function BranchForm({ initialData, onSuccess, onCancel }: BranchFormProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const t = useTranslations('Branches')
  const tc = useTranslations('Common')
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    country: 'AL',
    phone: '',
    email: '',
    isActive: true,
    isDefault: false,
    notes: '',
  })

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        code: initialData.code || '',
        address: initialData.address || '',
        city: initialData.city || '',
        country: initialData.country || 'AL',
        phone: initialData.phone || '',
        email: initialData.email || '',
        isActive: initialData.isActive ?? true,
        isDefault: initialData.isDefault ?? false,
        notes: initialData.notes || '',
      })
    }
  }, [initialData])

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (initialData?.id) {
        const response = await api.patch(`/branches/${initialData.id}`, data)
        return response.data
      } else {
        const response = await api.post('/branches', data)
        return response.data
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] })
      queryClient.invalidateQueries({ queryKey: ['branches-stats'] })
      if (initialData?.id) {
        queryClient.invalidateQueries({ queryKey: ['branch', initialData.id] })
        toast({ title: t('updateSuccess') })
      } else {
        toast({ title: t('createSuccess') })
      }
      onSuccess?.()
    },
    onError: (error: any) => {
      const errorData = error.response?.data;
      let errorMessage = 'Error';
      if (typeof errorData?.message === 'string') {
        errorMessage = errorData.message;
      } else if (Array.isArray(errorData?.message)) {
        errorMessage = errorData.message.join(', ');
      }
      toast({ 
        title: initialData?.id ? t('updateError') : t('createError'), 
        description: errorMessage,
        variant: 'destructive' 
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.code || !formData.address || !formData.city) {
      toast({ title: t('requiredFields'), variant: 'destructive' })
      return
    }
    mutation.mutate(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name">{tc('name')} <span className="text-red-500">*</span></Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={t('namePlaceholder')}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="code">{t('code')} <span className="text-red-500">*</span></Label>
          <Input
            id="code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            placeholder="TIR"
            maxLength={10}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="address">{t('address')} <span className="text-red-500">*</span></Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder={t('addressPlaceholder')}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="city">{t('city')} <span className="text-red-500">*</span></Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            placeholder={t('cityPlaceholder')}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="country">{t('country')}</Label>
          <Input
            id="country"
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            placeholder="AL"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="phone">{t('phone')}</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+355 4 123 4567"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">{t('email')}</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="branch@company.com"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notes">{t('notes')}</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder={t('notesPlaceholder')}
          rows={3}
        />
      </div>

      <div className="flex items-center space-x-8">
        <div className="flex items-center space-x-2">
          <Switch
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
          />
          <Label htmlFor="isActive">{t('active')}</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="isDefault"
            checked={formData.isDefault}
            onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
          />
          <Label htmlFor="isDefault">{t('setAsDefault')}</Label>
        </div>
      </div>

      <div className="flex justify-end gap-4 border-t pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {tc('cancel')}
          </Button>
        )}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && <Loader className="mr-2" />}
          {tc('save')}
        </Button>
      </div>
    </form>
  )
}
