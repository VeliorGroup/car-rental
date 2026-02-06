# FleetPulse API Documentation

## Base URL

- Development: `http://localhost:3001`
- Production: `https://api.yourdomain.com`

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "role": "ADMIN",
    "tenantId": "tenant-123"
  }
}
```

## Endpoints

### Bookings

#### List Bookings
```http
GET /bookings?page=1&limit=20&status=CONFIRMED
Authorization: Bearer <token>
```

#### Get Booking
```http
GET /bookings/:id
Authorization: Bearer <token>
```

#### Create Booking
```http
POST /bookings
Authorization: Bearer <token>
Content-Type: application/json

{
  "customerId": "customer-123",
  "vehicleId": "vehicle-123",
  "startDate": "2024-06-01T09:00:00Z",
  "endDate": "2024-06-05T18:00:00Z",
  "pickupBranchId": "branch-123",
  "dropoffBranchId": "branch-123"
}
```

#### Calculate Price
```http
POST /bookings/calculate-price
Authorization: Bearer <token>
Content-Type: application/json

{
  "vehicleId": "vehicle-123",
  "customerId": "customer-123",
  "startDate": "2024-06-01",
  "endDate": "2024-06-05"
}
```

#### Checkout (Start Rental)
```http
POST /bookings/:id/checkout
Authorization: Bearer <token>
Content-Type: application/json

{
  "kmAtCheckout": 50000,
  "fuelLevel": "FULL",
  "notes": "Optional notes"
}
```

#### Checkin (End Rental)
```http
POST /bookings/:id/checkin
Authorization: Bearer <token>
Content-Type: application/json

{
  "kmAtCheckin": 50500,
  "fuelLevel": "FULL",
  "damages": []
}
```

### Vehicles

#### List Vehicles
```http
GET /vehicles?status=AVAILABLE&category=COMPACT
Authorization: Bearer <token>
```

#### Create Vehicle
```http
POST /vehicles
Authorization: Bearer <token>
Content-Type: multipart/form-data

brand=Toyota
model=Corolla
year=2023
licensePlate=AA123BB
category=COMPACT
photos[]=<file>
```

#### Update Vehicle
```http
PATCH /vehicles/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "MAINTENANCE",
  "currentKm": 55000
}
```

### Customers

#### List Customers
```http
GET /customers?status=ACTIVE&search=Mario
Authorization: Bearer <token>
```

#### Create Customer
```http
POST /customers
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Mario",
  "lastName": "Rossi",
  "email": "mario@example.com",
  "phone": "+39 333 1234567",
  "licenseNumber": "AB123456",
  "licenseExpiry": "2025-12-31"
}
```

### Search (Public)

#### Search by City
```http
GET /search/city?city=Tirana&startDate=2024-06-01&endDate=2024-06-05
```

#### Search by Location
```http
GET /search/location?lat=41.3275&lng=19.8187&radius=10&startDate=2024-06-01&endDate=2024-06-05
```

### Analytics

#### Dashboard Stats
```http
GET /analytics/dashboard
Authorization: Bearer <token>
```

#### Revenue Report
```http
GET /analytics/revenue?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <token>
```

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": ["field must not be empty"],
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Booking not found"
}
```

## Rate Limiting

- Default: 100 requests per minute
- Auth endpoints: 10 requests per minute

## Swagger UI

Interactive API documentation is available at:
- Development: `http://localhost:3001/api/docs`
- Production: `https://api.yourdomain.com/api/docs`
