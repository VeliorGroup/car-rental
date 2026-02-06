'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Loader } from '@/components/ui/loader'
import { useFilterBar } from '@/components/layout/filter-bar-context'
import {
  Search,
  Eye,
  History,
  User,
  Shield,
  FileText,
  X,
} from 'lucide-react'
import { auditLogsApi, AuditLog } from '@/lib/api'

const ACTION_TYPES = [
  { value: 'CREATE', label: 'Create', color: 'success' },
  { value: 'UPDATE', label: 'Update', color: 'info' },
  { value: 'DELETE', label: 'Delete', color: 'danger' },
  { value: 'LOGIN', label: 'Login', color: 'secondary' },
  { value: 'LOGOUT', label: 'Logout', color: 'secondary' },
  { value: 'OVERRIDE', label: 'Override', color: 'warning' },
]

const RESOURCE_TYPES = [
  'Booking',
  'Vehicle',
  'Customer',
  'User',
  'Caution',
  'Damage',
  'Maintenance',
  'Document',
  'EmailTemplate',
  'ApiKey',
  'FuelLog',
]

export default function AuditLogsPage() {
  const t = useTranslations('AuditLogs')
  const tc = useTranslations('Common')
  const { setPageFilters } = useFilterBar()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [resourceFilter, setResourceFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  // Register filters
  useEffect(() => {
    setPageFilters(
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 w-[180px]"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder={t('action')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allActions')}</SelectItem>
            {ACTION_TYPES.map((action) => (
              <SelectItem key={action.value} value={action.value}>
                {action.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={resourceFilter} onValueChange={setResourceFilter}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder={t('resource')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allResources')}</SelectItem>
            {RESOURCE_TYPES.map((resource) => (
              <SelectItem key={resource} value={resource}>
                {resource}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-[140px] h-9"
          placeholder={t('from')}
        />
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-[140px] h-9"
          placeholder={t('to')}
        />
        {(search || actionFilter !== 'all' || resourceFilter !== 'all' || startDate || endDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('')
              setActionFilter('all')
              setResourceFilter('all')
              setStartDate('')
              setEndDate('')
            }}
            className="h-9"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    )
    return () => setPageFilters(null)
  }, [search, actionFilter, resourceFilter, startDate, endDate, setPageFilters, t])

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, search, actionFilter, resourceFilter, startDate, endDate],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit: 50 }
      if (search) params.search = search
      if (actionFilter !== 'all') params.action = actionFilter
      if (resourceFilter !== 'all') params.resource = resourceFilter
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      const response = await auditLogsApi.getAll(params)
      return response.data
    },
  })

  const getActionBadge = (action: string) => {
    if (action.includes('CREATE')) return <Badge variant="success">{action}</Badge>
    if (action.includes('UPDATE')) return <Badge variant="info">{action}</Badge>
    if (action.includes('DELETE')) return <Badge variant="danger">{action}</Badge>
    if (action.includes('OVERRIDE')) return <Badge variant="warning">{action}</Badge>
    if (action.includes('LOGIN') || action.includes('LOGOUT')) return <Badge variant="secondary">{action}</Badge>
    return <Badge variant="outline">{action}</Badge>
  }

  const formatChanges = (oldValue: Record<string, unknown> | null, newValue: Record<string, unknown> | null) => {
    if (!oldValue && !newValue) return null
    const changes: { field: string; old: unknown; new: unknown }[] = []

    if (newValue && typeof newValue === 'object') {
      Object.keys(newValue).forEach(key => {
        const oldVal = oldValue?.[key]
        const newVal = newValue[key]
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          changes.push({ field: key, old: oldVal, new: newVal })
        }
      })
    }

    return changes
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('title')}</h2>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalLogs')}</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('creates')}</CardTitle>
            <FileText className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {data?.logs?.filter((l: AuditLog) => l.action.includes('CREATE')).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('updates')}</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {data?.logs?.filter((l: AuditLog) => l.action.includes('UPDATE')).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('deletes')}</CardTitle>
            <FileText className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {data?.logs?.filter((l: AuditLog) => l.action.includes('DELETE')).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Audit Logs Table */}
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
                  <TableHead>{t('timestamp')}</TableHead>
                  <TableHead>{t('user')}</TableHead>
                  <TableHead>{t('action')}</TableHead>
                  <TableHead>{t('resource')}</TableHead>
                  <TableHead>{t('resourceId')}</TableHead>
                  <TableHead>{t('ipAddress')}</TableHead>
                  <TableHead className="text-right">{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.logs?.map((log: AuditLog) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      {log.user ? (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{log.user.firstName} {log.user.lastName}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">{t('system')}</span>
                      )}
                    </TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.resource}</Badge>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {log.resourceId?.slice(-8) || '-'}
                      </code>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.ipAddress || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!data?.logs || data.logs.length === 0) && (
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
        <span className="text-sm text-muted-foreground">
          {t('page')} {page}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => p + 1)}
          disabled={!data?.logs || data.logs.length < 50}
        >
          {tc('next')}
        </Button>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('logDetails')}</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('timestamp')}</p>
                  <p>{format(new Date(selectedLog.createdAt), 'dd/MM/yyyy HH:mm:ss')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('user')}</p>
                  <p>{selectedLog.user ? `${selectedLog.user.firstName} ${selectedLog.user.lastName}` : t('system')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('action')}</p>
                  {getActionBadge(selectedLog.action)}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('resource')}</p>
                  <p>{selectedLog.resource}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('resourceId')}</p>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{selectedLog.resourceId || '-'}</code>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('ipAddress')}</p>
                  <p>{selectedLog.ipAddress || '-'}</p>
                </div>
              </div>

              {(selectedLog.oldValue || selectedLog.newValue) && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{t('changes')}</p>
                  <div className="bg-muted rounded-lg p-4">
                    {selectedLog.oldValue && (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-red-500 mb-1">{t('oldValue')}</p>
                        <pre className="text-xs overflow-x-auto">
                          {JSON.stringify(selectedLog.oldValue, null, 2)}
                        </pre>
                      </div>
                    )}
                    {selectedLog.newValue && (
                      <div>
                        <p className="text-xs font-medium text-green-500 mb-1">{t('newValue')}</p>
                        <pre className="text-xs overflow-x-auto">
                          {JSON.stringify(selectedLog.newValue, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
