'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { MoreHorizontal, Search, Plus, Pencil, Trash2, MapPin, Building2, Car, Phone, Mail, Globe, Eye } from 'lucide-react'
import { PiBuildings } from 'react-icons/pi'
import { Loader } from '@/components/ui/loader'
import api from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { useFilterBar } from '@/components/layout/filter-bar-context'

import { BranchModal } from '@/components/branches/BranchModal'

interface Branch {
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
  notes?: string
  _count: {
    vehicles: number
    pickupBookings: number
    dropoffBookings: number
  }
}

interface BranchStats {
  total: number
  active: number
  vehiclesByBranch: Array<{
    id: string
    name: string
    code: string
    vehicleCount: number
  }>
}

export default function BranchesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [deleteDialog, setDeleteDialog] = useState<Branch | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const t = useTranslations('Branches')
  const tc = useTranslations('Common')
  const { setPageFilters } = useFilterBar()

  const handleEdit = (branch: Branch) => {
    setSelectedBranch(branch)
    setIsModalOpen(true)
  }

  const handleAdd = () => {
    setSelectedBranch(null)
    setIsModalOpen(true)
  }

  // Register filters in the filter bar
  useEffect(() => {
    setPageFilters(
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-8 h-9 w-[200px]"
        />
      </div>
    )
    return () => setPageFilters(null)
  }, [search, setPageFilters, t])

  const { data: stats, isLoading: statsLoading } = useQuery<BranchStats>({
    queryKey: ['branches-stats', search],
    queryFn: async () => {
      const params: any = {}
      if (search) params.search = search
      const response = await api.get('/branches/stats/summary', { params })
      return response.data
    },
  })

  const { data, isLoading } = useQuery({
    queryKey: ['branches', page, search],
    queryFn: async () => {
      const response = await api.get('/branches', {
        params: {
          page,
          limit: 12, // Increased for card layout
          search,
        },
      })
      return response.data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/branches/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] })
      queryClient.invalidateQueries({ queryKey: ['branches-stats'] })
      toast({ title: tc('deleteSuccess') })
      setDeleteDialog(null)
    },
    onError: (error: any) => {
      toast({ 
        title: tc('deleteError'), 
        description: error.response?.data?.message || 'Error',
        variant: 'destructive' 
      })
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('title')}</h2>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          {t('addBranch')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {statsLoading ? (
          <>
            <Card className="flex items-center justify-center p-6 h-[120px]">
              <Loader className="h-8 w-8 text-primary" />
            </Card>
            <Card className="flex items-center justify-center p-6 h-[120px]">
              <Loader className="h-8 w-8 text-primary" />
            </Card>
            <Card className="flex items-center justify-center p-6 h-[120px]">
              <Loader className="h-8 w-8 text-primary" />
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('totalBranches')}</CardTitle>
                <Building2 className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('activeBranches')}</CardTitle>
                <MapPin className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.active || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('vehiclesDistribution')}</CardTitle>
                <Car className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  {stats?.vehiclesByBranch?.slice(0, 3).map(b => (
                    <div key={b.id} className="flex justify-between">
                      <span>{b.code}</span>
                      <span className="font-medium">{b.vehicleCount}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>



      {/* Branch Cards Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader />
        </div>
      ) : data?.branches?.length ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.branches.map((branch: Branch) => (
            <Card key={branch.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow">
              <CardHeader className="p-0">
                <div className="relative h-40 bg-gradient-to-br from-sky-50 to-cyan-100 dark:from-sky-900/30 dark:to-cyan-900/20 flex items-center justify-center">
                  <PiBuildings className="h-20 w-20 text-cyan-300 dark:text-cyan-700" />
                  <div className="absolute top-3 right-3">
                    <Badge variant={branch.isActive ? 'default' : 'secondary'}>
                      {branch.isActive ? t('active') : t('inactive')}
                    </Badge>
                  </div>
                  {branch.isDefault && (
                    <div className="absolute top-3 left-3">
                      <Badge variant="outline" className="bg-background/50 backdrop-blur-sm">{t('default')}</Badge>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    {branch.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                     <Badge variant="secondary" className="font-mono text-xs">{branch.code}</Badge>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      <p>{branch.address}</p>
                      <p>{branch.city}, {branch.country}</p>
                    </div>
                  </div>
                  
                  {(branch.phone || branch.email) && (
                    <div className="space-y-1 pt-2 border-t">
                      {branch.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 shrink-0" />
                          <a href={`tel:${branch.phone}`} className="hover:text-primary">{branch.phone}</a>
                        </div>
                      )}
                      {branch.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 shrink-0" />
                          <a href={`mailto:${branch.email}`} className="hover:text-primary">{branch.email}</a>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t">
                     <Car className="h-4 w-4 shrink-0" />
                     <span>{branch._count?.vehicles || 0} {tc('vehicles').toLowerCase()}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/20 p-4 mt-auto border-t flex justify-end items-center">
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" asChild title={tc('view')}>
                    <Link href={`/branches/${branch.id}`}>
                      <Eye className="h-4 w-4 text-gray-500" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(branch)} title={tc('edit')}>
                    <Pencil className="h-4 w-4 text-blue-600" />
                  </Button>
                  {!branch.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteDialog(branch)}
                      title={tc('delete')}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          {tc('noResults')}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1 || isLoading}
        >
          {tc('previous')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => p + 1)}
          disabled={!data?.branches || data.branches.length < 12 || isLoading}
        >
          {tc('next')}
        </Button>
      </div>

      {/* Modal */}
      <BranchModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        initialData={selectedBranch} 
      />

      {/* Delete Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tc('deleteConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {tc('deleteConfirmDesc')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>{tc('cancel')}</Button>
            <Button 
              variant="destructive"
              onClick={() => deleteDialog && deleteMutation.mutate(deleteDialog.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader className="mr-2" />}
              {tc('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
