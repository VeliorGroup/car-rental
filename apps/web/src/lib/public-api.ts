import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// Public API client (no auth required for search endpoints)
const publicApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Customer API client (with auth token)
export const customerApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth interceptor for customer API
customerApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('customerToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 responses
customerApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('customerToken');
      localStorage.removeItem('customer');
      window.location.href = '/customer/login';
    }
    return Promise.reject(error);
  }
);

// Search API
export const searchApi = {
  // Search vehicles by coordinates
  searchByCoordinates: async (params: {
    latitude: number;
    longitude: number;
    radiusKm?: number;
    startDate: string;
    endDate: string;
    category?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await publicApi.get('/public/search', { params });
    return response.data;
  },

  // Search vehicles by city name
  searchByCity: async (params: {
    city: string;
    startDate: string;
    endDate: string;
    category?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await publicApi.get('/public/search/city', { params });
    return response.data;
  },

  // Get vehicle details
  getVehicle: async (id: string) => {
    const response = await publicApi.get(`/public/search/vehicles/${id}`);
    return response.data;
  },

  // Check vehicle availability
  checkAvailability: async (id: string, startDate: string, endDate: string) => {
    const response = await publicApi.get(`/public/search/vehicles/${id}/availability`, {
      params: { startDate, endDate },
    });
    return response.data;
  },
};

// Public Auth API
export const publicAuthApi = {
  register: async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
  }) => {
    const response = await publicApi.post('/public/auth/register', data);
    return response.data;
  },

  login: async (data: { email: string; password: string }) => {
    const response = await publicApi.post('/public/auth/login', data);
    return response.data;
  },

  getProfile: async () => {
    const response = await customerApi.get('/public/auth/profile');
    return response.data;
  },

  updateProfile: async (data: Record<string, unknown>) => {
    const response = await customerApi.put('/public/auth/profile', data);
    return response.data;
  },

  getBookings: async (page = 1, limit = 10) => {
    const response = await customerApi.get('/public/auth/bookings', {
      params: { page, limit },
    });
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await publicApi.post('/public/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token: string, newPassword: string) => {
    const response = await publicApi.post('/public/auth/reset-password', { token, newPassword });
    return response.data;
  },
};

// Public Bookings API
export const publicBookingsApi = {
  calculatePricing: async (vehicleId: string, startDate: string, endDate: string) => {
    const response = await publicApi.get('/public/bookings/pricing', {
      params: { vehicleId, startDate, endDate },
    });
    return response.data;
  },

  createBooking: async (data: {
    vehicleId: string;
    startDate: string;
    endDate: string;
    pickupBranchId?: string;
    dropoffBranchId?: string;
    extras?: { type: string; quantity: number }[];
    notes?: string;
  }) => {
    const response = await customerApi.post('/public/bookings', data);
    return response.data;
  },
};

export default publicApi;
