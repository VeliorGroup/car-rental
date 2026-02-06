'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Activity, Search, User, Building2, RefreshCw } from 'lucide-react'
import { Loader } from '@/components/ui/loader'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface AuditLog {
  id: string
  tenantId: string | null
  userId: string | null
  action: string
  resource: string
  resourceId: string | null
  details: Record<string, unknown> | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  tenant?: { name: string; companyName: string }
  user?: { 
    id: string
    email: string
    firstName: string
    lastName: string
    tenant?: { id: string; name: string; companyName: string }
  }
}

export default function AuditLogsPage() {
  const params = useParams()
  const locale = params.locale as string
  const t = useTranslations('SuperAdmin')
  const { toast } = useToast()

  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [limit, setLimit] = useState(100)

  const getToken = () => localStorage.getItem('superadmin_token')

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/admin/activity-logs?limit=${limit}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!res.ok) throw new Error('Failed to fetch logs')
      const data = await res.json()
      setLogs(data)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [limit])

  const filteredLogs = logs.filter(log => {
    const tenantName = log.tenant?.name || log.user?.tenant?.name || ''
    const tenantCompanyName = log.tenant?.companyName || log.user?.tenant?.companyName || ''
    const matchesSearch = search === '' || 
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.resource.toLowerCase().includes(search.toLowerCase()) ||
      tenantName.toLowerCase().includes(search.toLowerCase()) ||
      tenantCompanyName.toLowerCase().includes(search.toLowerCase()) ||
      log.user?.email?.toLowerCase().includes(search.toLowerCase())
    
    const matchesFilter = filter === 'all' || log.action === filter

    return matchesSearch && matchesFilter
  })

  const getActionColor = (action: string) => {
    if (action.includes('DELETE') || action.includes('CANCEL')) return 'bg-red-600'
    if (action.includes('CREATE') || action.includes('REGISTER')) return 'bg-green-600'
    if (action.includes('LOGIN') || action.includes('IMPERSONATION')) return 'bg-blue-600'
    if (action.includes('UPDATE') || action.includes('RESET')) return 'bg-yellow-600'
    return 'bg-gray-600'
  }

  const uniqueActions = [...new Set(logs.map(log => log.action))]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            {t('auditLogs.title') || 'Audit Logs'}
          </h1>
          <p className="text-muted-foreground">{t('auditLogs.description') || 'System activity and security logs'}</p>
        </div>
        <Button variant="outline" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {t('auditLogs.refresh') || 'Refresh'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('auditLogs.search') || 'Search logs...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('auditLogs.allActions') || 'All Actions'}</SelectItem>
                {uniqueActions.map(action => (
                  <SelectItem key={action} value={action}>{action}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={limit.toString()} onValueChange={(v) => setLimit(parseInt(v))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="250">250</SelectItem>
                <SelectItem value="500">500</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {t('auditLogs.noLogs') || 'No logs found'}
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredLogs.map(log => (
                <div key={log.id} className="flex items-start gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={getActionColor(log.action)}>{log.action}</Badge>
                      <Badge variant="outline">{log.resource}</Badge>
                      {(log.tenant || log.user?.tenant) && (
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {log.tenant?.companyName || log.tenant?.name || log.user?.tenant?.companyName || log.user?.tenant?.name}
                        </span>
                      )}
                      {log.user && (
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {log.user.email}
                        </span>
                      )}
                    </div>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        {JSON.stringify(log.details).slice(0, 100)}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleDateString('it-IT')} {new Date(log.createdAt).toLocaleTimeString('it-IT')}
                  </div>


                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
