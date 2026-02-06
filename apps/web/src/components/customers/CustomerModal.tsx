'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { CustomerForm } from './CustomerForm'
import { useTranslations } from 'next-intl'

interface CustomerModalProps {
  isOpen: boolean
  onClose: () => void
  initialData?: any
}

export function CustomerModal({ isOpen, onClose, initialData }: CustomerModalProps) {
  const t = useTranslations('Customers')
  const tc = useTranslations('Common')

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? `${tc('edit')} ${t('customer')}` : t('addCustomer')}
          </DialogTitle>
          <DialogDescription>
             {initialData ? t('updateCustomerDesc') : t('addCustomerDesc')}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <CustomerForm 
            initialData={initialData} 
            onSuccess={onClose} 
            onCancel={onClose} 
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
