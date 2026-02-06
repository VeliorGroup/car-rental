'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { usersApi, User, UserRole, CreateUserDto, UpdateUserDto } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { PiPlus, PiPencil, PiTrash } from 'react-icons/pi'
import { Loader } from '@/components/ui/loader'

export function UsersSettingsTab() {
  const t = useTranslations('Settings')
  const { toast } = useToast()
  
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<UserRole[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form state for create/edit
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    roleId: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [usersRes, rolesRes] = await Promise.all([
        usersApi.getAll(),
        usersApi.getRoles(),
      ])
      setUsers(usersRes.data)
      setRoles(rolesRes.data)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('users.error'),
        description: t('users.loadError'),
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    try {
      setSubmitting(true)
      const createDto: CreateUserDto = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        roleId: formData.roleId,
      }
      await usersApi.create(createDto)
      toast({
        title: t('users.success'),
        description: t('users.userCreated'),
      })
      setCreateDialogOpen(false)
      resetForm()
      loadData()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('users.error'),
        description: error.response?.data?.message || t('users.createError'),
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedUser) return
    try {
      setSubmitting(true)
      const updateDto: UpdateUserDto = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        roleId: formData.roleId,
      }
      if (formData.password) {
        updateDto.password = formData.password
      }
      await usersApi.update(selectedUser.id, updateDto)
      toast({
        title: t('users.success'),
        description: t('users.userUpdated'),
      })
      setEditDialogOpen(false)
      resetForm()
      loadData()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('users.error'),
        description: error.response?.data?.message || t('users.updateError'),
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedUser) return
    try {
      setSubmitting(true)
      await usersApi.delete(selectedUser.id)
      toast({
        title: t('users.success'),
        description: t('users.userDeleted'),
      })
      setDeleteDialogOpen(false)
      setSelectedUser(null)
      loadData()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('users.error'),
        description: error.response?.data?.message || t('users.deleteError'),
      })
    } finally {
      setSubmitting(false)
    }
  }

  const openEditDialog = (user: User) => {
    setSelectedUser(user)
    setFormData({
      email: user.email,
      password: '',
      firstName: user.firstName,
      lastName: user.lastName,
      roleId: user.roleId,
    })
    setEditDialogOpen(true)
  }

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user)
    setDeleteDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      roleId: '',
    })
    setSelectedUser(null)
  }

  const getRoleBadgeVariant = (roleName: string) => {
    switch (roleName) {
      case 'ADMIN':
        return 'destructive'
      case 'MANAGER':
        return 'default'
      case 'OPERATOR':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const getRoleLabel = (roleName: string) => {
    switch (roleName) {
      case 'ADMIN':
        return t('users.roles.ADMIN')
      case 'MANAGER':
        return t('users.roles.MANAGER')
      case 'OPERATOR':
        return t('users.roles.OPERATOR')
      default:
        return roleName
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader  />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">{t('users.title')}</h3>
          <p className="text-sm text-muted-foreground">{t('users.description')}</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setCreateDialogOpen(true); }}>
              <PiPlus className="mr-2 h-4 w-4" />
              {t('users.addUser')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('users.addUser')}</DialogTitle>
              <DialogDescription>{t('users.addUserDescription')}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="email">{t('users.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">{t('users.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="firstName">{t('users.firstName')}</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lastName">{t('users.lastName')}</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">{t('users.role')}</Label>
                <Select
                  value={formData.roleId}
                  onValueChange={(value) => setFormData({ ...formData, roleId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('users.selectRole')} />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {getRoleLabel(role.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                {t('users.cancel')}
              </Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting && <Loader className="mr-2" />}
                {t('users.create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('users.name')}</TableHead>
              <TableHead>{t('users.email')}</TableHead>
              <TableHead>{t('users.role')}</TableHead>
              <TableHead>{t('users.createdAt')}</TableHead>
              <TableHead className="text-right">{t('users.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  {t('users.noUsers')}
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.firstName} {user.lastName}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role.name) as any}>
                      {getRoleLabel(user.role.name)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(user.createdAt).toLocaleDateString('it-IT')}

                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(user)}
                    >
                      <PiPencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDeleteDialog(user)}
                    >
                      <PiTrash className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('users.editUser')}</DialogTitle>
            <DialogDescription>{t('users.editUserDescription')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-email">{t('users.email')}</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                disabled
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-password">{t('users.newPassword')}</Label>
              <Input
                id="edit-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={t('users.leaveBlank')}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-firstName">{t('users.firstName')}</Label>
                <Input
                  id="edit-firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-lastName">{t('users.lastName')}</Label>
                <Input
                  id="edit-lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-role">{t('users.role')}</Label>
              <Select
                value={formData.roleId}
                onValueChange={(value) => setFormData({ ...formData, roleId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('users.selectRole')} />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {getRoleLabel(role.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {t('users.cancel')}
            </Button>
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting && <Loader className="mr-2" />}
              {t('users.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('users.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('users.deleteDescription', { name: `${selectedUser?.firstName} ${selectedUser?.lastName}` })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('users.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={submitting}>
              {submitting && <Loader className="mr-2" />}
              {t('users.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
