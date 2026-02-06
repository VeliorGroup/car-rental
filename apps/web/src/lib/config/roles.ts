'use client'

/**
 * Centralized roles configuration
 * Add, remove, or modify roles here to update across the entire app
 */

export interface Role {
  value: string
  label: string
  description?: string
  color?: string
}

/**
 * Available roles in the system
 * To add a new role: add an entry to this array
 * To remove a role: remove the entry from this array
 */
export const ROLES: Role[] = [
  {
    value: 'ADMIN',
    label: 'Admin',
    description: 'Full access to all features and settings',
    color: 'text-red-600'
  },
  {
    value: 'MANAGER',
    label: 'Manager',
    description: 'Manage bookings, vehicles, customers and staff',
    color: 'text-blue-600'
  },
  {
    value: 'OPERATOR',
    label: 'Operator',
    description: 'Daily operations: check-in, check-out, view data',
    color: 'text-green-600'
  },
]

/**
 * Default role for new users
 */
export const DEFAULT_ROLE = 'OPERATOR'

/**
 * Get role by value
 */
export function getRoleByValue(value: string): Role | undefined {
  return ROLES.find(r => r.value === value)
}

/**
 * Get role label by value
 */
export function getRoleLabel(value: string): string {
  return getRoleByValue(value)?.label || value
}
