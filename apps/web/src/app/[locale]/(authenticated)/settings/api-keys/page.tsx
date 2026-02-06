'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader } from '@/components/ui/loader'
import { useToast } from '@/components/ui/use-toast'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Plus,
  Key,
  Copy,
  Trash2,
  RefreshCw,
  Shield,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react'
import { apiKeysApi, ApiKey } from '@/lib/api'

export default function ApiKeysPage() {
  const t = useTranslations('ApiKeys')
  const tc = useTranslations('Common')
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newKeyData, setNewKeyData] = useState<{ key: string; name: string } | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    scopes: ['all'] as string[],
    expiresAt: '',
    rateLimit: 1000,
  })

  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const response = await apiKeysApi.getAll()
      return response.data
    },
  })

  const { data: scopes } = useQuery({
    queryKey: ['api-keys-scopes'],
    queryFn: async () => {
      const response = await apiKeysApi.getScopes()
      return response.data
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => apiKeysApi.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      setNewKeyData({ key: response.data.key, name: response.data.name })
      setIsCreateOpen(false)
      resetForm()
    },
    onError: () => {
      toast({
        title: tc('error'),
        description: t('createError'),
        variant: 'destructive',
      })
    },
  })

  const revokeMutation = useMutation({
    mutationFn: (id: string) => apiKeysApi.revoke(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      toast({
        title: t('revokeSuccess'),
        description: t('keyRevoked'),
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiKeysApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      toast({
        title: t('deleteSuccess'),
        description: t('keyDeleted'),
      })
    },
  })

  const regenerateMutation = useMutation({
    mutationFn: (id: string) => apiKeysApi.regenerate(id),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      setNewKeyData({ key: response.data.key, name: 'Regenerated Key' })
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      scopes: ['all'],
      expiresAt: '',
      rateLimit: 1000,
    })
  }

  const handleScopeToggle = (scope: string) => {
    setFormData(prev => {
      if (scope === 'all') {
        return { ...prev, scopes: prev.scopes.includes('all') ? [] : ['all'] }
      }
      const newScopes = prev.scopes.filter(s => s !== 'all')
      if (newScopes.includes(scope)) {
        return { ...prev, scopes: newScopes.filter(s => s !== scope) }
      }
      return { ...prev, scopes: [...newScopes, scope] }
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: t('copied'),
      description: t('keyCopied'),
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('title')}</h2>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('createKey')}
        </Button>
      </div>

      {/* Security Warning */}
      <Alert variant="warning">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t('securityWarning')}</AlertTitle>
        <AlertDescription>{t('securityMessage')}</AlertDescription>
      </Alert>

      {/* API Keys Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('name')}</TableHead>
                  <TableHead>{t('keyPreview')}</TableHead>
                  <TableHead>{t('scopes')}</TableHead>
                  <TableHead>{t('lastUsed')}</TableHead>
                  <TableHead>{t('usage')}</TableHead>
                  <TableHead>{tc('status')}</TableHead>
                  <TableHead className="text-right">{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys?.map((key: ApiKey) => (
                  <TableRow key={key.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{key.name}</p>
                        {key.description && (
                          <p className="text-xs text-muted-foreground">{key.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {key.keyPreview}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {key.scopes.slice(0, 3).map((scope) => (
                          <Badge key={scope} variant="outline" className="text-xs">
                            {scope}
                          </Badge>
                        ))}
                        {key.scopes.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{key.scopes.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {key.lastUsedAt
                        ? format(new Date(key.lastUsedAt), 'dd/MM/yyyy HH:mm')
                        : t('never')}
                    </TableCell>
                    <TableCell>{key.usageCount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={key.isActive ? 'success' : 'danger'}>
                        {key.isActive ? t('active') : t('revoked')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {key.isActive && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => regenerateMutation.mutate(key.id)}
                              title={t('regenerate')}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => revokeMutation.mutate(key.id)}
                              title={t('revoke')}
                            >
                              <Shield className="h-4 w-4 text-orange-600" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(key.id)}
                          title={tc('delete')}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!apiKeys || apiKeys.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      {t('noKeys')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Key Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('createKey')}</DialogTitle>
            <DialogDescription>{t('createDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('name')} *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t('namePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('description')}</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t('descriptionPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('scopes')}</Label>
              <div className="border rounded-lg p-3 space-y-2 max-h-[200px] overflow-y-auto">
                {scopes?.scopes?.map((scope: any) => (
                  <div key={scope.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={formData.scopes.includes(scope.id) || formData.scopes.includes('all')}
                      onCheckedChange={() => handleScopeToggle(scope.id)}
                      disabled={scope.id !== 'all' && formData.scopes.includes('all')}
                    />
                    <div>
                      <Label className="text-sm font-normal">{scope.name}</Label>
                      <p className="text-xs text-muted-foreground">{scope.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('expiresAt')} ({tc('optional')})</Label>
              <Input
                type="date"
                value={formData.expiresAt}
                onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('rateLimit')}</Label>
              <Input
                type="number"
                value={formData.rateLimit}
                onChange={(e) => setFormData(prev => ({ ...prev, rateLimit: parseInt(e.target.value) }))}
              />
              <p className="text-xs text-muted-foreground">{t('rateLimitHelp')}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.name || createMutation.isPending}
            >
              {createMutation.isPending && <Loader className="mr-2 h-4 w-4" />}
              {t('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Key Display Dialog */}
      <Dialog open={!!newKeyData} onOpenChange={() => setNewKeyData(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-green-600" />
              {t('keyCreated')}
            </DialogTitle>
            <DialogDescription>{t('keyCreatedDescription')}</DialogDescription>
          </DialogHeader>
          {newKeyData && (
            <div className="space-y-4">
              <Alert variant="warning">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t('saveKeyWarning')}</AlertTitle>
                <AlertDescription>{t('saveKeyMessage')}</AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>{t('yourApiKey')}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type={showKey ? 'text' : 'password'}
                    value={newKeyData.key}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(newKeyData.key)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setNewKeyData(null)}>{t('done')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
