import axios from 'axios';
import { useAuthStore } from '@/lib/store/auth';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 Unauthorized (Expired Token) or 403 Forbidden (Inactive Tenant)
    if (
      (error.response?.status === 401 && !originalRequest._retry) ||
      (error.response?.status === 403 && error.response?.data?.message === 'TENANT_INACTIVE')
    ) {
      originalRequest._retry = true;
      
      // Logout
      useAuthStore.getState().logout();
      
      // Redirect to login page if we're in the browser
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// User Management API
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface UserRole {
  id: string;
  name: string;
  permissions: string[];
  description?: string;
}

export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleId: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  roleId?: string;
  password?: string;
}

export const usersApi = {
  getAll: () => api.get<User[]>('/users'),
  getRoles: () => api.get<UserRole[]>('/users/roles'),
  getById: (id: string) => api.get<User>(`/users/${id}`),
  create: (data: CreateUserDto) => api.post<User>('/users', data),
  update: (id: string, data: UpdateUserDto) => api.put<User>(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

// Reports API
export interface GenerateReportDto {
  type: string;
  format: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  vehicleId?: string;
  customerId?: string;
  branchId?: string;
}

export const reportsApi = {
  getTypes: () => api.get('/reports/types'),
  generate: (data: GenerateReportDto) => 
    api.post('/reports/generate', data, { responseType: 'blob' }),
  getHistory: (params?: Record<string, unknown>) => api.get('/reports/history', { params }),
};

// Documents API
export interface Document {
  id: string;
  type: string;
  name: string;
  description?: string;
  entityType: string;
  entityId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  expiryDate?: string;
  url?: string;
  createdAt: string;
}

export const documentsApi = {
  getAll: (params?: Record<string, unknown>) => api.get('/documents', { params }),
  getById: (id: string) => api.get<Document>(`/documents/${id}`),
  getByEntity: (entityType: string, entityId: string) => 
    api.get<Document[]>(`/documents/entity/${entityType}/${entityId}`),
  getStats: () => api.get('/documents/stats'),
  getExpiring: (days?: number) => api.get('/documents/expiring', { params: { days } }),
  upload: (formData: FormData) => api.post('/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id: string, data: Partial<Document>) => api.put(`/documents/${id}`, data),
  delete: (id: string) => api.delete(`/documents/${id}`),
};

// Email Templates API
export interface EmailTemplate {
  id: string;
  type: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables?: Record<string, string>;
  isActive: boolean;
  createdAt: string;
}

export const emailTemplatesApi = {
  getAll: (params?: Record<string, unknown>) => api.get('/email-templates', { params }),
  getDefaults: () => api.get('/email-templates/defaults'),
  getById: (id: string) => api.get<EmailTemplate>(`/email-templates/${id}`),
  create: (data: Partial<EmailTemplate>) => api.post('/email-templates', data),
  update: (id: string, data: Partial<EmailTemplate>) => api.put(`/email-templates/${id}`, data),
  delete: (id: string) => api.delete(`/email-templates/${id}`),
  preview: (data: { templateId: string; sampleData?: Record<string, unknown> }) => 
    api.post('/email-templates/preview', data),
  sendTest: (data: { templateId: string; recipientEmail: string; sampleData?: Record<string, unknown> }) =>
    api.post('/email-templates/test', data),
};

// API Keys API
export interface ApiKey {
  id: string;
  name: string;
  description?: string;
  keyPreview: string;
  scopes: string[];
  expiresAt?: string;
  allowedIps: string[];
  rateLimit: number;
  isActive: boolean;
  lastUsedAt?: string;
  usageCount: number;
  createdAt: string;
}

export const apiKeysApi = {
  getAll: (params?: Record<string, unknown>) => api.get('/api-keys', { params }),
  getScopes: () => api.get('/api-keys/scopes'),
  getById: (id: string) => api.get<ApiKey>(`/api-keys/${id}`),
  getStats: (id: string) => api.get(`/api-keys/${id}/stats`),
  create: (data: Partial<ApiKey>) => api.post('/api-keys', data),
  update: (id: string, data: Partial<ApiKey>) => api.put(`/api-keys/${id}`, data),
  regenerate: (id: string) => api.post(`/api-keys/${id}/regenerate`),
  revoke: (id: string) => api.post(`/api-keys/${id}/revoke`),
  delete: (id: string) => api.delete(`/api-keys/${id}`),
};

// Fuel Logs API
export interface FuelLog {
  id: string;
  vehicleId: string;
  bookingId?: string;
  fuelType: string;
  liters: number;
  costPerLiter: number;
  totalCost: number;
  odometerReading: number;
  stationName?: string;
  stationAddress?: string;
  filledAt: string;
  fullTank: boolean;
  consumption?: number;
  vehicle?: { licensePlate: string; brand: string; model: string };
  createdAt: string;
}

export const fuelLogsApi = {
  getAll: (params?: Record<string, unknown>) => api.get('/fuel-logs', { params }),
  getById: (id: string) => api.get<FuelLog>(`/fuel-logs/${id}`),
  getByVehicle: (vehicleId: string, params?: Record<string, unknown>) => 
    api.get(`/fuel-logs/vehicle/${vehicleId}`, { params }),
  getVehicleStats: (vehicleId: string) => 
    api.get(`/fuel-logs/vehicle/${vehicleId}/stats`),
  getFleetStats: () => api.get('/fuel-logs/stats/fleet'),
  create: (data: Omit<FuelLog, 'id' | 'createdAt' | 'vehicle'>) => api.post('/fuel-logs', data),
  update: (id: string, data: Partial<FuelLog>) => api.put(`/fuel-logs/${id}`, data),
  delete: (id: string) => api.delete(`/fuel-logs/${id}`),
};

// Audit Logs API
export interface AuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId?: string;
  userId?: string;
  user?: { firstName: string; lastName: string };
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ipAddress?: string;
  createdAt: string;
}

export const auditLogsApi = {
  getAll: (params?: Record<string, unknown>) => api.get('/audit-logs', { params }),
};

export default api;
