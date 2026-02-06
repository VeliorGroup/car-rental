'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader } from '@/components/ui/loader'
import { useToast } from '@/components/ui/use-toast'
import {
  Plus,
  Mail,
  Eye,
  Pencil,
  Trash2,
  Send,
  Code,
  FileText,
} from 'lucide-react'
import { emailTemplatesApi, EmailTemplate } from '@/lib/api'

const TEMPLATE_TYPES = [
  { value: 'booking_confirmation', label: 'Booking Confirmation' },
  { value: 'booking_reminder', label: 'Booking Reminder' },
  { value: 'checkout_complete', label: 'Checkout Complete' },
  { value: 'checkin_complete', label: 'Check-in Complete' },
  { value: 'booking_cancelled', label: 'Booking Cancelled' },
  { value: 'caution_held', label: 'Caution Held' },
  { value: 'caution_released', label: 'Caution Released' },
  { value: 'caution_charged', label: 'Caution Charged' },
  { value: 'damage_reported', label: 'Damage Reported' },
  { value: 'maintenance_scheduled', label: 'Maintenance Scheduled' },
  { value: 'license_expiring', label: 'License Expiring' },
  { value: 'insurance_expiring', label: 'Insurance Expiring' },
  { value: 'welcome', label: 'Welcome' },
  { value: 'password_reset', label: 'Password Reset' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'custom', label: 'Custom' },
]

export default function EmailTemplatesPage() {
  const t = useTranslations('EmailTemplates')
  const tc = useTranslations('Common')
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [previewData, setPreviewData] = useState<{ subject: string; html: string } | null>(null)
  const [testEmail, setTestEmail] = useState('')
  const [formData, setFormData] = useState({
    type: 'custom',
    name: '',
    subject: '',
    htmlContent: '',
    textContent: '',
    isActive: true,
  })

  const { data: templates, isLoading } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const response = await emailTemplatesApi.getAll()
      return response.data
    },
  })

  const { data: defaults } = useQuery({
    queryKey: ['email-templates-defaults'],
    queryFn: async () => {
      const response = await emailTemplatesApi.getDefaults()
      return response.data
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => emailTemplatesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] })
      setIsEditorOpen(false)
      resetForm()
      toast({
        title: t('createSuccess'),
        description: t('templateCreated'),
      })
    },
    onError: () => {
      toast({
        title: tc('error'),
        description: t('createError'),
        variant: 'destructive',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => emailTemplatesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] })
      setIsEditorOpen(false)
      resetForm()
      toast({
        title: t('updateSuccess'),
        description: t('templateUpdated'),
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => emailTemplatesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] })
      toast({
        title: t('deleteSuccess'),
        description: t('templateDeleted'),
      })
    },
  })

  const previewMutation = useMutation({
    mutationFn: (templateId: string) => emailTemplatesApi.preview({ templateId }),
    onSuccess: (response) => {
      setPreviewData(response.data)
      setIsPreviewOpen(true)
    },
  })

  const sendTestMutation = useMutation({
    mutationFn: ({ templateId, email }: { templateId: string; email: string }) =>
      emailTemplatesApi.sendTest({ templateId, recipientEmail: email }),
    onSuccess: () => {
      toast({
        title: t('testSent'),
        description: t('testEmailSent'),
      })
    },
    onError: () => {
      toast({
        title: tc('error'),
        description: t('testError'),
        variant: 'destructive',
      })
    },
  })

  const resetForm = () => {
    setSelectedTemplate(null)
    setFormData({
      type: 'custom',
      name: '',
      subject: '',
      htmlContent: '',
      textContent: '',
      isActive: true,
    })
  }

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template)
    setFormData({
      type: template.type,
      name: template.name,
      subject: template.subject,
      htmlContent: template.htmlContent,
      textContent: template.textContent || '',
      isActive: template.isActive,
    })
    setIsEditorOpen(true)
  }

  const handleCreate = () => {
    resetForm()
    setIsEditorOpen(true)
  }

  const handleSave = () => {
    if (selectedTemplate) {
      updateMutation.mutate({ id: selectedTemplate.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('title')}</h2>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t('createTemplate')}
        </Button>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates?.map((template: EmailTemplate) => (
            <Card key={template.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {template.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {TEMPLATE_TYPES.find(t => t.value === template.type)?.label || template.type}
                    </CardDescription>
                  </div>
                  <Badge variant={template.isActive ? 'success' : 'secondary'}>
                    {template.isActive ? t('active') : t('inactive')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {t('subject')}: {template.subject}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => previewMutation.mutate(template.id)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    {t('preview')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(template)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    {tc('edit')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(template.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Default Templates */}
          {defaults?.map((template: any) => {
            const hasCustom = templates?.some((t: EmailTemplate) => t.type === template.type)
            if (hasCustom) return null
            return (
              <Card key={template.type} className="relative opacity-60 border-dashed">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {template.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {t('defaultTemplate')}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">{t('default')}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('subject')}: {template.subject}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFormData({
                        type: template.type,
                        name: template.name.replace('Default ', ''),
                        subject: template.subject,
                        htmlContent: '',
                        textContent: '',
                        isActive: true,
                      })
                      setIsEditorOpen(true)
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {t('customize')}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? t('editTemplate') : t('createTemplate')}
            </DialogTitle>
            <DialogDescription>{t('editorDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('name')}</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('type')}</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('subject')}</Label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder={t('subjectPlaceholder')}
              />
            </div>

            <Tabs defaultValue="html">
              <TabsList>
                <TabsTrigger value="html">
                  <Code className="h-4 w-4 mr-1" />
                  HTML
                </TabsTrigger>
                <TabsTrigger value="text">
                  <FileText className="h-4 w-4 mr-1" />
                  {t('plainText')}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="html">
                <div className="space-y-2">
                  <Label>{t('htmlContent')}</Label>
                  <Textarea
                    value={formData.htmlContent}
                    onChange={(e) => setFormData(prev => ({ ...prev, htmlContent: e.target.value }))}
                    className="min-h-[300px] font-mono text-sm"
                    placeholder={t('htmlPlaceholder')}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('variablesHelp')}
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="text">
                <div className="space-y-2">
                  <Label>{t('textContent')} ({tc('optional')})</Label>
                  <Textarea
                    value={formData.textContent}
                    onChange={(e) => setFormData(prev => ({ ...prev, textContent: e.target.value }))}
                    className="min-h-[300px] font-mono text-sm"
                    placeholder={t('textPlaceholder')}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, isActive: v }))}
              />
              <Label>{t('activeTemplate')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditorOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.name || !formData.subject || createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader className="mr-2 h-4 w-4" />
              )}
              {tc('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{t('preview')}</DialogTitle>
          </DialogHeader>
          {previewData && (
            <div className="space-y-4">
              <div>
                <Label>{t('subject')}</Label>
                <p className="mt-1 p-2 bg-muted rounded">{previewData.subject}</p>
              </div>
              <div>
                <Label>{t('content')}</Label>
                <div
                  className="mt-1 p-4 bg-white rounded border max-h-[400px] overflow-auto"
                  dangerouslySetInnerHTML={{ __html: previewData.html }}
                />
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="email"
                  placeholder={t('testEmailPlaceholder')}
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
                <Button
                  onClick={() => {
                    if (selectedTemplate && testEmail) {
                      sendTestMutation.mutate({ templateId: selectedTemplate.id, email: testEmail })
                    }
                  }}
                  disabled={!testEmail || sendTestMutation.isPending}
                >
                  <Send className="h-4 w-4 mr-1" />
                  {t('sendTest')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
