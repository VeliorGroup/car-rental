'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { CautionForm } from './CautionForm'
import { useTranslations } from 'next-intl'

interface CautionModalProps {
  isOpen: boolean
  onClose: () => void
  initialData?: any
}

export function CautionModal({ isOpen, onClose, initialData }: CautionModalProps) {
  const t = useTranslations('Cautions')
  const tc = useTranslations('Common')

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? `${tc('edit')} ${t('title')}` : t('addCaution')}
          </DialogTitle>
          <DialogDescription>
            {initialData ? t('editCautionDesc') : t('addCautionDesc')}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <CautionForm 
            initialData={initialData} 
            onSuccess={onClose} 
            onCancel={onClose} 
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
