# API Scripts

This directory contains utility scripts for the FleetPulse API.

## Directory Structure

```
scripts/
├── test-endpoints.ts    # API endpoint testing script
└── utilities/           # Database and user management utilities
    ├── check_user.ts    # Check user status and details
    ├── get_ids.js       # Get entity IDs from database
    ├── reset_password.ts # Reset user password
    ├── test_create_booking.js # Test booking creation
    └── verify_user.ts   # Verify user email manually
```

## Usage

### Test Endpoints
```bash
npx ts-node scripts/test-endpoints.ts
```

### User Utilities
```bash
# Check user
npx ts-node scripts/utilities/check_user.ts <email>

# Reset password
npx ts-node scripts/utilities/reset_password.ts <email> <new_password>

# Verify user email
npx ts-node scripts/utilities/verify_user.ts <email>
```

## Environment Variables

Make sure to have a `.env` file with the following variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT secret key

## Notes

These scripts are for development and maintenance purposes only.
Do not run in production without proper authorization.
