'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { BranchForm } from './BranchForm'
import { useTranslations } from 'next-intl'

interface BranchModalProps {
  isOpen: boolean
  onClose: () => void
  initialData?: any
}

export function BranchModal({ isOpen, onClose, initialData }: BranchModalProps) {
  const t = useTranslations('Branches')
  const tc = useTranslations('Common')

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? `${tc('edit')} ${t('branch')}` : t('addBranch')}
          </DialogTitle>
          <DialogDescription>
            {initialData ? t('updateBranchDesc') : t('addBranchDesc')}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <BranchForm 
            initialData={initialData} 
            onSuccess={onClose} 
            onCancel={onClose} 
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
