'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader } from '@/components/ui/loader'
import { useToast } from '@/components/ui/use-toast'
import {
  FileSpreadsheet,
  FileText,
  Download,
  Calendar,
  Car,
  Users,
  DollarSign,
  Wrench,
  AlertTriangle,
  Shield,
  BarChart3,
} from 'lucide-react'
import { reportsApi } from '@/lib/api'

const REPORT_TYPES = [
  { id: 'bookings', name: 'Bookings Report', icon: Calendar, description: 'All bookings with customer and vehicle details' },
  { id: 'vehicles', name: 'Vehicles Report', icon: Car, description: 'Fleet inventory with status and details' },
  { id: 'customers', name: 'Customers Report', icon: Users, description: 'Customer database with booking history' },
  { id: 'revenue', name: 'Revenue Report', icon: DollarSign, description: 'Revenue breakdown by date' },
  { id: 'maintenance', name: 'Maintenance Report', icon: Wrench, description: 'Maintenance records and costs' },
  { id: 'damages', name: 'Damages Report', icon: AlertTriangle, description: 'Damage records and costs' },
  { id: 'cautions', name: 'Cautions Report', icon: Shield, description: 'Caution/deposit status' },
  { id: 'fleet_utilization', name: 'Fleet Utilization', icon: BarChart3, description: 'Vehicle utilization rates' },
]

const EXPORT_FORMATS = [
  { id: 'excel', name: 'Excel (.xlsx)', icon: FileSpreadsheet },
  { id: 'csv', name: 'CSV (.csv)', icon: FileText },
  { id: 'pdf', name: 'PDF (.pdf)', icon: FileText },
]

export default function ReportsPage() {
  const t = useTranslations('Reports')
  const tc = useTranslations('Common')
  const { toast } = useToast()

  const [selectedType, setSelectedType] = useState<string>('bookings')
  const [selectedFormat, setSelectedFormat] = useState<string>('excel')
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [status, setStatus] = useState<string>('')

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await reportsApi.generate({
        type: selectedType,
        format: selectedFormat,
        startDate,
        endDate,
        status: status || undefined,
      })
      return response.data
    },
    onSuccess: (data) => {
      // Create download link
      const blob = new Blob([data], { 
        type: selectedFormat === 'excel' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : selectedFormat === 'pdf' 
            ? 'application/pdf' 
            : 'text/csv'
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${selectedType}_report_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.${
        selectedFormat === 'excel' ? 'xlsx' : selectedFormat
      }`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast({
        title: t('reportGenerated'),
        description: t('reportDownloaded'),
      })
    },
    onError: () => {
      toast({
        title: tc('error'),
        description: t('generateError'),
        variant: 'destructive',
      })
    },
  })

  const selectedReportType = REPORT_TYPES.find(r => r.id === selectedType)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('title')}</h2>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Report Type Selection */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('selectReportType')}</CardTitle>
            <CardDescription>{t('chooseReport')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {REPORT_TYPES.map((report) => {
                const Icon = report.icon
                return (
                  <button
                    key={report.id}
                    onClick={() => setSelectedType(report.id)}
                    className={`p-4 rounded-lg border-2 text-left transition-all hover:border-primary/50 ${
                      selectedType === report.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border'
                    }`}
                  >
                    <Icon className={`h-8 w-8 mb-2 ${
                      selectedType === report.id ? 'text-primary' : 'text-muted-foreground'
                    }`} />
                    <h4 className="font-medium text-sm">{report.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {report.description}
                    </p>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Export Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t('exportSettings')}</CardTitle>
            <CardDescription>{t('configureExport')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('format')}</Label>
              <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPORT_FORMATS.map((format) => {
                    const Icon = format.icon
                    return (
                      <SelectItem key={format.id} value={format.id}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {format.name}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('startDate')}</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('endDate')}</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            {['bookings', 'maintenance', 'damages', 'cautions'].includes(selectedType) && (
              <div className="space-y-2">
                <Label>{tc('status')}</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('allStatuses')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t('allStatuses')}</SelectItem>
                    {selectedType === 'bookings' && (
                      <>
                        <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                        <SelectItem value="CHECKED_OUT">Checked Out</SelectItem>
                        <SelectItem value="CHECKED_IN">Checked In</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </>
                    )}
                    {selectedType === 'maintenance' && (
                      <>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                      </>
                    )}
                    {selectedType === 'damages' && (
                      <>
                        <SelectItem value="REPORTED">Reported</SelectItem>
                        <SelectItem value="ASSESSED">Assessed</SelectItem>
                        <SelectItem value="REPAIRED">Repaired</SelectItem>
                        <SelectItem value="RESOLVED">Resolved</SelectItem>
                      </>
                    )}
                    {selectedType === 'cautions' && (
                      <>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="HELD">Held</SelectItem>
                        <SelectItem value="RELEASED">Released</SelectItem>
                        <SelectItem value="FULLY_CHARGED">Charged</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              className="w-full"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <>
                  <Loader className="mr-2 h-4 w-4" />
                  {t('generating')}
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  {t('generateReport')}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Selected Report Info */}
      {selectedReportType && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <selectedReportType.icon className="h-5 w-5" />
              {selectedReportType.name}
            </CardTitle>
            <CardDescription>{selectedReportType.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              <p>{t('reportWillInclude')}</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                {selectedType === 'bookings' && (
                  <>
                    <li>Customer details</li>
                    <li>Vehicle information</li>
                    <li>Booking dates and duration</li>
                    <li>Pricing and totals</li>
                  </>
                )}
                {selectedType === 'vehicles' && (
                  <>
                    <li>Vehicle specifications</li>
                    <li>Current status</li>
                    <li>Mileage and location</li>
                    <li>Insurance expiry dates</li>
                  </>
                )}
                {selectedType === 'customers' && (
                  <>
                    <li>Contact information</li>
                    <li>License details</li>
                    <li>Booking history summary</li>
                    <li>Total spent</li>
                  </>
                )}
                {selectedType === 'revenue' && (
                  <>
                    <li>Daily revenue breakdown</li>
                    <li>Booking count per day</li>
                    <li>Discounts applied</li>
                  </>
                )}
                {selectedType === 'fleet_utilization' && (
                  <>
                    <li>Utilization rate per vehicle</li>
                    <li>Rented days vs total days</li>
                    <li>Booking count per vehicle</li>
                  </>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
