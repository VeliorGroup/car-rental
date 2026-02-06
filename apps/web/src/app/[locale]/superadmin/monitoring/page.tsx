'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader } from '@/components/ui/loader'
import { 
  Activity, Server, Database, HardDrive, Cpu, MemoryStick,
  ExternalLink, RefreshCw, CheckCircle, XCircle, AlertTriangle,
  BarChart3, Clock, Wifi, Shield
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
const GRAFANA_URL = process.env.NEXT_PUBLIC_GRAFANA_URL || 'http://localhost:3002'
const PROMETHEUS_URL = process.env.NEXT_PUBLIC_PROMETHEUS_URL || 'http://localhost:9090'
const ALERTMANAGER_URL = process.env.NEXT_PUBLIC_ALERTMANAGER_URL || 'http://localhost:9093'

interface HealthData {
  status: 'ok' | 'degraded' | 'error'
  timestamp: string
  uptime: number
  memory: {
    used: number
    total: number
    percentage: number
  }
  database: 'connected' | 'disconnected'
  version: string
}

interface SystemStats {
  totalTenants: number
  activeTenants: number
  totalVehicles: number
  totalBookings: number
  totalCustomers: number
  dbSize?: string
}

export default function MonitoringPage() {
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string
  const [health, setHealth] = useState<HealthData | null>(null)
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const getToken = () => localStorage.getItem('superadmin_token')

  const fetchData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    try {
      const token = getToken()
      const headers = { Authorization: `Bearer ${token}` }
      
      // Fetch health status (public endpoint)
      const healthRes = await fetch(`${API_URL}/health`)
      if (healthRes.ok) {
        setHealth(await healthRes.json())
      }

      // Fetch system stats
      const statsRes = await fetch(`${API_URL}/admin/system-stats`, { headers })
      if (statsRes.ok) {
        setSystemStats(await statsRes.json())
      }

      setLastRefresh(new Date())
    } catch (error) {
      console.error('Error fetching monitoring data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchData(), 30000)
    return () => clearInterval(interval)
  }, [])

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (days > 0) return `${days}d ${hours}h ${minutes}m`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok':
      case 'connected':
        return 'text-green-600 bg-green-100 dark:bg-green-900/30'
      case 'degraded':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30'
      case 'error':
      case 'disconnected':
        return 'text-red-600 bg-red-100 dark:bg-red-900/30'
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case 'error':
      case 'disconnected':
        return <XCircle className="h-5 w-5 text-red-600" />
      default:
        return <Activity className="h-5 w-5 text-gray-600" />
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Server Monitoring
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitora lo stato del server, le metriche e i servizi
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            Ultimo aggiornamento: {lastRefresh.toLocaleTimeString('it-IT')}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchData(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Aggiorna
          </Button>
        </div>
      </div>

      {/* External Services */}
      <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Servizi di monitoring esterni
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                Per utilizzare Grafana, Prometheus e Alertmanager, avvia i servizi con: 
                <code className="bg-amber-100 dark:bg-amber-900 px-1.5 py-0.5 rounded ml-1">
                  docker-compose -f docker-compose.monitoring.yml up -d
                </code>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-orange-500" />
                Grafana
              </div>
              <Badge variant="outline" className="text-xs">Dashboard</Badge>
            </CardTitle>
            <CardDescription>Visualizzazione metriche e dashboard</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <a 
              href={GRAFANA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Apri Grafana
            </a>
            <p className="text-xs text-muted-foreground text-center">{GRAFANA_URL}</p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-red-500" />
                Prometheus
              </div>
              <Badge variant="outline" className="text-xs">Metriche</Badge>
            </CardTitle>
            <CardDescription>Raccolta e query delle metriche</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <a 
              href={PROMETHEUS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Apri Prometheus
            </a>
            <p className="text-xs text-muted-foreground text-center">{PROMETHEUS_URL}</p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-purple-500" />
                Alertmanager
              </div>
              <Badge variant="outline" className="text-xs">Alert</Badge>
            </CardTitle>
            <CardDescription>Gestione notifiche e alert</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <a 
              href={ALERTMANAGER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Apri Alertmanager
            </a>
            <p className="text-xs text-muted-foreground text-center">{ALERTMANAGER_URL}</p>
          </CardContent>
        </Card>
      </div>

      {/* Server Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            Stato del Server
          </CardTitle>
          <CardDescription>Health check e informazioni di sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status */}
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Stato</span>
                {getStatusIcon(health?.status || 'unknown')}
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(health?.status || 'unknown')}>
                  {health?.status === 'ok' ? 'Operativo' : 
                   health?.status === 'degraded' ? 'Degradato' : 'Errore'}
                </Badge>
              </div>
            </div>

            {/* Uptime */}
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Uptime</span>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">
                {health ? formatUptime(health.uptime) : '-'}
              </div>
            </div>

            {/* Memory */}
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Memoria</span>
                <MemoryStick className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">
                {health?.memory?.used || 0} MB
              </div>
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    (health?.memory?.percentage || 0) > 80 ? 'bg-red-500' :
                    (health?.memory?.percentage || 0) > 60 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(health?.memory?.percentage || 0, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {health?.memory?.percentage?.toFixed(1) || 0}% utilizzata
              </p>
            </div>

            {/* Database */}
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Database</span>
                <Database className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(health?.database || 'unknown')}
                <span className="font-medium">
                  {health?.database === 'connected' ? 'Connesso' : 'Disconnesso'}
                </span>
              </div>
            </div>
          </div>

          {/* Version Info */}
          <div className="mt-4 p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-muted-foreground">Versione API: </span>
                <span className="font-mono font-medium">{health?.version || '-'}</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Ultimo check: </span>
                <span className="font-mono">
                  {health?.timestamp ? new Date(health.timestamp).toLocaleString('it-IT') : '-'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Statistics */}
      {systemStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-primary" />
              Statistiche Database
            </CardTitle>
            <CardDescription>Panoramica dei dati nel sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="p-4 rounded-lg border bg-card text-center">
                <div className="text-3xl font-bold text-primary">{systemStats.totalTenants}</div>
                <div className="text-sm text-muted-foreground">Tenant Totali</div>
                <div className="text-xs text-green-600 mt-1">{systemStats.activeTenants} attivi</div>
              </div>
              <div className="p-4 rounded-lg border bg-card text-center">
                <div className="text-3xl font-bold text-blue-600">{systemStats.totalVehicles}</div>
                <div className="text-sm text-muted-foreground">Veicoli</div>
              </div>
              <div className="p-4 rounded-lg border bg-card text-center">
                <div className="text-3xl font-bold text-green-600">{systemStats.totalBookings}</div>
                <div className="text-sm text-muted-foreground">Prenotazioni</div>
              </div>
              <div className="p-4 rounded-lg border bg-card text-center">
                <div className="text-3xl font-bold text-purple-600">{systemStats.totalCustomers}</div>
                <div className="text-sm text-muted-foreground">Clienti</div>
              </div>
              {systemStats.dbSize && (
                <div className="p-4 rounded-lg border bg-card text-center">
                  <div className="text-3xl font-bold text-orange-600">{systemStats.dbSize}</div>
                  <div className="text-sm text-muted-foreground">Dimensione DB</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5 text-primary" />
            Endpoint API
          </CardTitle>
          <CardDescription>Link rapidi agli endpoint di monitoring</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => window.open(`${API_URL}/health`, '_blank')}
            >
              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
              /health
            </Button>
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => window.open(`${API_URL}/metrics`, '_blank')}
            >
              <BarChart3 className="h-4 w-4 mr-2 text-blue-600" />
              /metrics
            </Button>
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => window.open(`${API_URL}/api/docs`, '_blank')}
            >
              <Server className="h-4 w-4 mr-2 text-purple-600" />
              /api/docs (Swagger)
            </Button>
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => window.open(`${API_URL}/api/v1`, '_blank')}
            >
              <Cpu className="h-4 w-4 mr-2 text-orange-600" />
              /api/v1
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
