'use client'

import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { PiDownloadSimple, PiReceipt } from 'react-icons/pi'
import { Loader } from '@/components/ui/loader'
import api from '@/lib/api'

interface Payment {
  id: string
  date: string
  amount: number
  status: 'PAID' | 'PENDING' | 'FAILED'
  method: string
}

export function PaymentsTab() {
  const t = useTranslations('Settings')

  // TODO: Replace with actual API when payment system is implemented
  const { data: payments = [], isLoading } = useQuery<Payment[]>({
    queryKey: ['tenant-payments'],
    queryFn: async () => {
      // For now, return empty array - will be replaced with actual API
      // const res = await api.get('/tenants/me/payments')
      // return res.data
      return []
    },
  })

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'default'
      case 'PENDING':
        return 'secondary'
      case 'FAILED':
        return 'destructive'
      default:
        return 'outline'
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
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">{t('payments.title')}</h3>
        <p className="text-sm text-muted-foreground">{t('payments.description')}</p>
      </div>

      {payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-md">
          <PiReceipt className="h-12 w-12 text-muted-foreground mb-4" />
          <h4 className="text-lg font-medium mb-2">{t('payments.empty')}</h4>
          <p className="text-sm text-muted-foreground max-w-sm">
            {t('payments.emptyDesc')}
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('payments.invoice')}</TableHead>
                <TableHead>{t('payments.date')}</TableHead>
                <TableHead>{t('payments.amount')}</TableHead>
                <TableHead>{t('payments.status')}</TableHead>
                <TableHead>{t('payments.method')}</TableHead>
                <TableHead className="text-right">{t('payments.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">{payment.id}</TableCell>
                  <TableCell>{new Date(payment.date).toLocaleDateString('it-IT')}</TableCell>

                  <TableCell>€{payment.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(payment.status) as any}>
                      {t(`payments.status_${payment.status.toLowerCase()}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>{payment.method}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon">
                      <PiDownloadSimple className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
