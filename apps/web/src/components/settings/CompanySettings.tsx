'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import api from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PiUploadSimple, PiX, PiImage, PiBuildings } from 'react-icons/pi'
import { Loader } from '@/components/ui/loader'
import { useAuthStore } from '@/lib/store/auth'
import Image from 'next/image'

export function CompanySettings() {
  const t = useTranslations('Settings')
  const { user } = useAuthStore()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [formData, setFormData] = useState({
      companyName: '',
      vatNumber: '',
      address: '',
      city: '',
      country: '',
      phone: '',
      logoUrl: '',
      contractTerms: ''
  })

  const { data: tenantData, isLoading } = useQuery({
      queryKey: ['tenant', 'me'],
      queryFn: async () => {
          const res = await api.get('/tenants/me');
          return res.data;
      },
      enabled: !!user,
  })

  useEffect(() => {
      if (tenantData) {
          setFormData({
              companyName: tenantData.companyName || '',
              vatNumber: tenantData.vatNumber || '',
              address: tenantData.address || '',
              city: tenantData.city || '',
              country: tenantData.country || '',
              phone: tenantData.phone || '',
              logoUrl: tenantData.logoUrl || '',
              contractTerms: tenantData.contractTerms || ''
          })
          if (tenantData.logoUrl) {
            setLogoPreview(tenantData.logoUrl)
          }
      }
  }, [tenantData])

  const handleUpdate = async () => {
      try {
          setIsSaving(true)
          await api.put('/tenants/me', formData)
          queryClient.invalidateQueries({ queryKey: ['tenant', 'me'] })
          toast({
              title: "Success",
              description: t('company.updateSuccess') || "Company details updated successfully",
          })
      } catch (error: any) {
          console.error(error)
          toast({
              variant: "destructive",
              title: "Error",
              description: error.response?.data?.message || "Failed to update company details",
          })
      } finally {
          setIsSaving(false)
      }
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Error",
        description: t('company.logo.invalidType') || "Please upload an image file",
      })
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Error",
        description: t('company.logo.tooLarge') || "Image must be less than 2MB",
      })
      return
    }

    setIsUploadingLogo(true)

    try {
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      // Upload to server
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('type', 'logo')

      const response = await api.post('/upload/logo', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      const logoUrl = response.data.url || response.data.key
      setFormData(prev => ({ ...prev, logoUrl }))
      
      // Save to tenant
      await api.put('/tenants/me', { ...formData, logoUrl })
      queryClient.invalidateQueries({ queryKey: ['tenant', 'me'] })

      toast({
        title: "Success",
        description: t('company.logo.uploadSuccess') || "Logo uploaded successfully",
      })
    } catch (error: any) {
      console.error('Logo upload error:', error)
      setLogoPreview(formData.logoUrl || null)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.message || t('company.logo.uploadError') || "Failed to upload logo",
      })
    } finally {
      setIsUploadingLogo(false)
    }
  }

  const handleRemoveLogo = async () => {
    try {
      setFormData(prev => ({ ...prev, logoUrl: '' }))
      setLogoPreview(null)
      await api.put('/tenants/me', { ...formData, logoUrl: '' })
      queryClient.invalidateQueries({ queryKey: ['tenant', 'me'] })
      toast({
        title: "Success",
        description: t('company.logo.removeSuccess') || "Logo removed",
      })
    } catch (error) {
      console.error(error)
    }
  }

  if (isLoading) {
      return (
        <div className="flex justify-center py-8">
          <Loader  />
        </div>
      )
  }

  return (
      <div className="space-y-8">
          {/* Company Logo Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PiImage className="h-5 w-5" />
                {t('company.logo.title') || 'Company Logo'}
              </CardTitle>
              <CardDescription>
                {t('company.logo.description') || 'Upload your company logo. It will appear on contracts, invoices, and documents.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-6">
                {/* Logo Preview */}
                <div className="relative">
                  <div className="w-32 h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center bg-muted/50 overflow-hidden">
                    {logoPreview ? (
                      <Image
                        src={logoPreview}
                        alt="Company logo"
                        fill
                        className="object-contain p-2"
                      />
                    ) : (
                      <PiBuildings className="h-12 w-12 text-muted-foreground/40" />
                    )}
                    {isUploadingLogo && (
                      <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                        <Loader />
                      </div>
                    )}
                  </div>
                  {logoPreview && (
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                      onClick={handleRemoveLogo}
                    >
                      <PiX className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {/* Upload Instructions */}
                <div className="flex-1 space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingLogo}
                  >
                    <PiUploadSimple className="mr-2 h-4 w-4" />
                    {t('company.logo.upload') || 'Upload Logo'}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    {t('company.logo.hint') || 'PNG, JPG or SVG. Max 2MB. Recommended: 200x200px'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company Details Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PiBuildings className="h-5 w-5" />
                {t('company.title')}
              </CardTitle>
              <CardDescription>
                {t('company.description') || 'Manage your organization details.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 max-w-xl">
                  <div className="grid gap-2">
                    <Label htmlFor="companyName">{t('company.name')} <span className="text-red-500">*</span></Label>
                    <Input 
                      id="companyName" 
                      placeholder="Your Company Ltd." 
                      value={formData.companyName}
                      onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="vatNumber">{t('company.vat')}</Label>
                    <Input 
                      id="vatNumber" 
                      placeholder="VAT Number" 
                      value={formData.vatNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, vatNumber: e.target.value }))}
                    />
                  </div>
                   <div className="grid gap-2">
                    <Label htmlFor="address">{t('company.address')}</Label>
                    <Input 
                      id="address" 
                      placeholder="Address" 
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    />
                  </div>
                   <div className="grid gap-2">
                     <Label htmlFor="city">{t('company.city')}</Label>
                    <Input 
                      id="city" 
                      placeholder="City" 
                      value={formData.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    />
                  </div>
                   <div className="grid gap-2">
                     <Label htmlFor="country">{t('company.country')}</Label>
                    <Input 
                      id="country" 
                      placeholder="Country" 
                      value={formData.country}
                      onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">{t('company.phone')}</Label>
                    <Input 
                      id="phone" 
                      placeholder="Phone" 
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                      <Button 
                          onClick={handleUpdate}
                          disabled={isSaving}
                      >
                          {isSaving && <Loader className="mr-2" />}
                          {t('company.save')}
                      </Button>
                  </div>
                </div>
            </CardContent>
          </Card>

          {/* Contract Terms Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📄 {t('company.contractTerms.title') || 'Contract Terms & Conditions'}
              </CardTitle>
              <CardDescription>
                {t('company.contractTerms.description') || 'Customize the terms and conditions that appear on rental contracts. Each line will be displayed as a separate term.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-w-2xl">
                <div className="grid gap-2">
                  <Label htmlFor="contractTerms">
                    {t('company.contractTerms.label') || 'Terms & Conditions'}
                  </Label>
                  <Textarea
                    id="contractTerms"
                    placeholder={`${t('company.contractTerms.placeholder') || 'Enter your contract terms, one per line:\n• Collision Damage (CDW) coverage applies to...\n• The vehicle must be returned with the same fuel level\n• Smoking in the vehicle is prohibited'}`}
                    value={formData.contractTerms}
                    onChange={(e) => setFormData(prev => ({ ...prev, contractTerms: e.target.value }))}
                    rows={8}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('company.contractTerms.hint') || 'Tip: Start each term with • or number for better formatting. These terms will appear in the contract PDF.'}
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <Button 
                    onClick={handleUpdate}
                    disabled={isSaving}
                  >
                    {isSaving && <Loader className="mr-2" />}
                    {t('company.save')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
      </div>
  )
}
