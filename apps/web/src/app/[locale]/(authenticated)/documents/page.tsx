'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Loader } from '@/components/ui/loader'
import { useToast } from '@/components/ui/use-toast'
import { useFilterBar } from '@/components/layout/filter-bar-context'
import {
  Plus,
  Search,
  FileText,
  Download,
  Trash2,
  Eye,
  AlertCircle,
  X,
  Upload,
  File,
  Image,
} from 'lucide-react'
import { documentsApi, Document } from '@/lib/api'

const DOCUMENT_TYPES = [
  { value: 'contract', label: 'Contract' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'registration', label: 'Registration' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'license', label: 'License' },
  { value: 'id_card', label: 'ID Card' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'other', label: 'Other' },
]

const ENTITY_TYPES = [
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'customer', label: 'Customer' },
  { value: 'booking', label: 'Booking' },
  { value: 'tenant', label: 'Company' },
]

export default function DocumentsPage() {
  const t = useTranslations('Documents')
  const tc = useTranslations('Common')
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { setPageFilters } = useFilterBar()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all')
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadData, setUploadData] = useState({
    type: 'other',
    name: '',
    description: '',
    entityType: 'tenant',
    entityId: '',
    expiryDate: '',
  })

  // Register filters
  useEffect(() => {
    setPageFilters(
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 w-[180px]"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder={t('type')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allTypes')}</SelectItem>
            {DOCUMENT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder={t('entityType')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allEntities')}</SelectItem>
            {ENTITY_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(search || typeFilter !== 'all' || entityTypeFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearch(''); setTypeFilter('all'); setEntityTypeFilter('all'); }}
            className="h-9"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    )
    return () => setPageFilters(null)
  }, [search, typeFilter, entityTypeFilter, setPageFilters, t])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['documents', page, search, typeFilter, entityTypeFilter],
    queryFn: async () => {
      const params: any = { page, limit: 20, search }
      if (typeFilter !== 'all') params.type = typeFilter
      if (entityTypeFilter !== 'all') params.entityType = entityTypeFilter
      const response = await documentsApi.getAll(params)
      return response.data
    },
  })

  const { data: stats } = useQuery({
    queryKey: ['documents-stats'],
    queryFn: async () => {
      const response = await documentsApi.getStats()
      return response.data
    },
  })

  const { data: expiring } = useQuery({
    queryKey: ['documents-expiring'],
    queryFn: async () => {
      const response = await documentsApi.getExpiring(30)
      return response.data
    },
  })

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error('No file selected')
      const formData = new FormData()
      formData.append('file', selectedFile)
      Object.entries(uploadData).forEach(([key, value]) => {
        if (value) formData.append(key, value)
      })
      const response = await documentsApi.upload(formData)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents-stats'] })
      setIsUploadOpen(false)
      setSelectedFile(null)
      setUploadData({
        type: 'other',
        name: '',
        description: '',
        entityType: 'tenant',
        entityId: '',
        expiryDate: '',
      })
      toast({
        title: t('uploadSuccess'),
        description: t('documentUploaded'),
      })
    },
    onError: () => {
      toast({
        title: tc('error'),
        description: t('uploadError'),
        variant: 'destructive',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents-stats'] })
      toast({
        title: t('deleteSuccess'),
        description: t('documentDeleted'),
      })
    },
  })

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-4 w-4" />
    return <File className="h-4 w-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('title')}</h2>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <Button onClick={() => setIsUploadOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('uploadDocument')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalDocuments')}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('expiringSoon')}</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats?.expiringSoon || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('contracts')}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.byType?.contract || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('insurance')}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.byType?.insurance || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Expiring Documents Alert */}
      {expiring && expiring.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/20">
          <CardHeader>
            <CardTitle className="text-orange-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              {t('expiringDocuments')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expiring.slice(0, 5).map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between text-sm">
                  <span>{doc.name}</span>
                  <Badge variant="outline" className="text-orange-600">
                    {t('expiresOn')} {format(new Date(doc.expiryDate), 'dd/MM/yyyy')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertCircle className="h-10 w-10 text-destructive mb-3" />
              <p className="text-sm font-medium text-destructive">{tc('error')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('loadError') || 'Failed to load documents. Please try again.'}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['documents'] })}
              >
                {tc('retry') || 'Retry'}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('name')}</TableHead>
                  <TableHead>{t('type')}</TableHead>
                  <TableHead>{t('entityType')}</TableHead>
                  <TableHead>{t('size')}</TableHead>
                  <TableHead>{t('expiryDate')}</TableHead>
                  <TableHead>{t('uploadedAt')}</TableHead>
                  <TableHead className="text-right">{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.documents?.map((doc: Document) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getFileIcon(doc.mimeType)}
                        <span className="font-medium">{doc.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{doc.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{doc.entityType}</Badge>
                    </TableCell>
                    <TableCell>{formatFileSize(doc.fileSize)}</TableCell>
                    <TableCell>
                      {doc.expiryDate ? (
                        <span className={
                          new Date(doc.expiryDate) < new Date() ? 'text-red-500' :
                          new Date(doc.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? 'text-orange-500' : ''
                        }>
                          {format(new Date(doc.expiryDate), 'dd/MM/yyyy')}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>{format(new Date(doc.createdAt), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {doc.url && (
                          <>
                            <Button variant="ghost" size="sm" asChild>
                              <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                <Eye className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button variant="ghost" size="sm" asChild>
                              <a href={doc.url} download={doc.fileName}>
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(doc.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!data?.documents || data.documents.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      {tc('noResults')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          {tc('previous')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => p + 1)}
          disabled={!data?.documents || data.documents.length < 20}
        >
          {tc('next')}
        </Button>
      </div>

      {/* Upload Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('uploadDocument')}</DialogTitle>
            <DialogDescription>{t('uploadDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('file')}</Label>
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <File className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">{t('clickToUpload')}</p>
                  </>
                )}
              </div>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setSelectedFile(file)
                    setUploadData(prev => ({ ...prev, name: file.name.replace(/\.[^/.]+$/, '') }))
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('name')}</Label>
              <Input
                value={uploadData.name}
                onChange={(e) => setUploadData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('type')}</Label>
              <Select
                value={uploadData.type}
                onValueChange={(v) => setUploadData(prev => ({ ...prev, type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('expiryDate')} ({tc('optional')})</Label>
              <Input
                type="date"
                value={uploadData.expiryDate}
                onChange={(e) => setUploadData(prev => ({ ...prev, expiryDate: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('description')} ({tc('optional')})</Label>
              <Input
                value={uploadData.description}
                onChange={(e) => setUploadData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button
              onClick={() => uploadMutation.mutate()}
              disabled={!selectedFile || !uploadData.name || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? <Loader className="mr-2 h-4 w-4" /> : null}
              {t('upload')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
