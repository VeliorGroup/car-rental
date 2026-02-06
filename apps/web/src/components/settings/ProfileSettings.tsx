'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/lib/store/auth'
import api from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { PiCamera, PiTrash } from 'react-icons/pi'
import { Loader } from '@/components/ui/loader'

export function ProfileSettings() {
  const t = useTranslations('Settings')
  const { user, setUser } = useAuthStore()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
     firstName: '',
     lastName: '',
     phone: ''
  })

  useEffect(() => {
    if (user) {
        setFormData({
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            phone: user.phone || ''
        })
    }
  }, [user])

  const handleUpdate = async () => {
      try {
          setIsSaving(true)
          await api.put('/auth/profile', formData)
          if (user) {
             setUser({ ...user, ...formData }) 
          }
          toast({
              title: "Success",
              description: "Profile updated successfully",
          })
      } catch (error: any) {
          console.error(error)
          toast({
              variant: "destructive",
              title: "Error",
              description: error.response?.data?.message || "Failed to update profile",
          })
      } finally {
          setIsSaving(false)
      }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select an image file",
      })
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        variant: "destructive",
        title: "Error",
        description: "Image must be less than 5MB",
      })
      return
    }

    try {
      setIsUploadingAvatar(true)
      const formData = new FormData()
      formData.append('avatar', file)
      
      const response = await api.post('/auth/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      if (user && response.data.avatar) {
        setUser({ ...user, avatar: response.data.avatar })
      }
      
      toast({
        title: "Success",
        description: "Profile photo updated",
      })
    } catch (error: any) {
      console.error(error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.message || "Failed to upload photo",
      })
    } finally {
      setIsUploadingAvatar(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveAvatar = async () => {
    try {
      setIsUploadingAvatar(true)
      await api.delete('/auth/avatar')
      
      if (user) {
        setUser({ ...user, avatar: undefined })
      }
      
      toast({
        title: "Success",
        description: "Profile photo removed",
      })
    } catch (error: any) {
      console.error(error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.message || "Failed to remove photo",
      })
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const userInitial = user?.firstName?.[0]?.toUpperCase() || 'U'

  return (
      <div className="space-y-6">
        <div>
            <h3 className="text-lg font-medium">{t('profile.title')}</h3>
            <p className="text-sm text-muted-foreground">{t('profile.description')}</p>
        </div>
        
        {/* Avatar Section */}
        <div className="flex items-center gap-6">
          <div className="relative group">
            {user?.avatar ? (
              <img 
                src={user.avatar} 
                alt="Profile" 
                className="h-20 w-20 rounded-xl object-cover border-2 border-border"
              />
            ) : (
              <div className="h-20 w-20 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-2xl font-semibold">
                {userInitial}
              </div>
            )}
            {/* Overlay on hover */}
            <div className="absolute inset-0 rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <PiCamera className="h-4 w-4 text-white" />
              </button>
              {user?.avatar && (
                <button
                  onClick={handleRemoveAvatar}
                  disabled={isUploadingAvatar}
                  className="p-2 rounded-full bg-white/20 hover:bg-red-500/80 transition-colors"
                >
                  <PiTrash className="h-4 w-4 text-white" />
                </button>
              )}
            </div>
            {isUploadingAvatar && (
              <div className="absolute inset-0 rounded-xl bg-black/50 flex items-center justify-center">
                <Loader />
              </div>
            )}
          </div>
          <div>
            <h4 className="font-medium">{t('profile.photo') || 'Profile Photo'}</h4>
            <p className="text-sm text-muted-foreground">
              {t('profile.photoDescription') || 'JPG, PNG or GIF. Max 5MB.'}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
            >
              {isUploadingAvatar ? (
                <>
                  <Loader className="mr-2" />
                  {t('profile.uploading') || 'Uploading...'}
                </>
              ) : (
                t('profile.changePhoto') || 'Change Photo'
              )}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 max-w-xl">
            <div className="grid gap-2">
            <Label htmlFor="email">{t('profile.email')} <span className="text-red-500">*</span></Label>
            <Input id="email" value={user?.email || ''} disabled className="bg-muted" />
            </div>
            <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label htmlFor="firstName">{t('profile.firstName')} <span className="text-red-500">*</span></Label>
                <Input 
                id="firstName" 
                value={formData.firstName} 
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="lastName">{t('profile.lastName')} <span className="text-red-500">*</span></Label>
                <Input 
                id="lastName" 
                value={formData.lastName} 
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                />
            </div>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="phone">{t('profile.phone')}</Label>
                <Input 
                id="phone" 
                value={formData.phone} 
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+1 234 567 890"
                />
            </div>
            <div className="flex justify-end">
                <Button 
                    onClick={handleUpdate}
                    disabled={isSaving}
                >
                    {isSaving && <Loader className="mr-2" />}
                    {t('profile.save')}
                </Button>
            </div>
        </div>
      </div>
  )
}
