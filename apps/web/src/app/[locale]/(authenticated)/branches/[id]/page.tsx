'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Edit, MapPin, Phone, Mail, Car, Building2, Eye } from 'lucide-react'
import Link from 'next/link'
import { Loader } from '@/components/ui/loader'
import { useTranslations } from 'next-intl'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface BranchDetail {
  id: string
  name: string
  code: string
  address: string
  city: string
  country: string
  phone: string | null
  email: string | null
  isActive: boolean
  isDefault: boolean
  _count: {
    vehicles: number
    pickupBookings: number
    dropoffBookings: number
  }
}

export default function BranchDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const locale = params.locale as string || 'en'
  const t = useTranslations('Branches')
  const tc = useTranslations('Common')

  const { data: branch, isLoading } = useQuery<BranchDetail>({
    queryKey: ['branch', id],
    queryFn: async () => {
      const response = await api.get(`/branches/${id}`)
      return response.data
    },
  })

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader /></div>
  }

  if (!branch) {
    return <div>{tc('noResults')}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                {branch.name}
              </h2>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Badge variant="secondary" className="font-mono">{branch.code}</Badge>
                {branch.isDefault && <Badge variant="outline">{t('default')}</Badge>}
                <Badge variant={branch.isActive ? 'default' : 'secondary'}>
                  {branch.isActive ? t('active') : t('inactive')}
                </Badge>
              </div>
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <Link href={`/${locale}/branches/${id}/edit`}>
            <Button>
              <Edit className="mr-2 h-4 w-4" />
              {tc('edit')}
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t('details')}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> 
                  {t('address')}
                </dt>
                <dd className="mt-1">
                  <p>{branch.address}</p>
                  <p>{branch.city}, {branch.country}</p>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Phone className="h-4 w-4" /> 
                  {t('phone')}
                </dt>
                <dd className="mt-1">
                  {branch.phone ? (
                    <a href={`tel:${branch.phone}`} className="hover:text-primary">{branch.phone}</a>
                  ) : '-'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4" /> 
                  {t('email')}
                </dt>
                <dd className="mt-1">
                  {branch.email ? (
                    <a href={`mailto:${branch.email}`} className="hover:text-primary">{branch.email}</a>
                  ) : '-'}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{tc('stats')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Car className="h-4 w-4" />
                {tc('totalVehicles')}
              </div>
              <div className="text-2xl font-bold">{branch._count?.vehicles || 0}</div>
            </div>
            {/* Add more stats as needed */}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="vehicles" className="w-full">
        <TabsList>
          <TabsTrigger value="vehicles">{tc('vehicles')}</TabsTrigger>
        </TabsList>
        <TabsContent value="vehicles" className="space-y-4">
          <Card>
            <CardContent className="p-0">
               <VehicleList branchId={id} locale={locale} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function VehicleList({ branchId, locale }: { branchId: string; locale: string }) {
  const t = useTranslations('Vehicles')
  const tc = useTranslations('Common')
  
  const { data, isLoading } = useQuery<{ vehicles: any[] }>({
    queryKey: ['vehicles', { branchId }],
    queryFn: async () => {
      const response = await api.get('/vehicles', { params: { branchId } })
      return response.data
    },
  })

  if (isLoading) {
    return <div className="p-8 flex justify-center"><Loader /></div>
  }

  if (!data?.vehicles?.length) {
    return <div className="p-8 text-center text-muted-foreground">{tc('noResults')}</div>
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('licensePlate')}</TableHead>
            <TableHead>{t('brand')}</TableHead>
            <TableHead>{t('model')}</TableHead>
            <TableHead>{t('year')}</TableHead>
            <TableHead>{tc('status')}</TableHead>
            <TableHead className="text-right">{tc('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.vehicles.map((vehicle) => (
            <TableRow key={vehicle.id}>
              <TableCell className="font-mono font-medium">{vehicle.licensePlate}</TableCell>
              <TableCell>{vehicle.brand}</TableCell>
              <TableCell>{vehicle.model}</TableCell>
              <TableCell>{vehicle.year}</TableCell>
              <TableCell>
                <Badge variant={vehicle.status === 'AVAILABLE' ? 'default' : 'secondary'}>
                  {t(`status${vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1).toLowerCase().replace(/_/g, '')}` as any) || vehicle.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Link href={`/${locale}/vehicles/${vehicle.id}`}>
                  <Button variant="ghost" size="sm">
                    <Eye className="mr-2 h-4 w-4" />
                    {tc('view')}
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
