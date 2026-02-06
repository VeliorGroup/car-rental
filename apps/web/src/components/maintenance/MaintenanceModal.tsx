'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { MaintenanceForm } from './MaintenanceForm'
import { useTranslations } from 'next-intl'

interface MaintenanceModalProps {
  isOpen: boolean
  onClose: () => void
  initialData?: any
}

export function MaintenanceModal({ isOpen, onClose, initialData }: MaintenanceModalProps) {
  const t = useTranslations('Maintenance')
  const tc = useTranslations('Common')

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? `${tc('edit')} ${t('title')}` : t('addMaintenance')}
          </DialogTitle>
          <DialogDescription>
            {initialData ? t('editMaintenanceDesc') : t('addMaintenanceDesc')}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <MaintenanceForm 
            initialData={initialData} 
            onSuccess={onClose} 
            onCancel={onClose} 
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
