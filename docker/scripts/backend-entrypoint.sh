#!/bin/sh
set -e

echo "🚀 Starting backend container..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL..."
until nc -z postgres 5432; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done
echo "✅ PostgreSQL is up"

# Wait for Redis to be ready
echo "⏳ Waiting for Redis..."
until nc -z redis 6379; do
  echo "Redis is unavailable - sleeping"
  sleep 2
done
echo "✅ Redis is up"

# Wait for MinIO to be ready
echo "⏳ Waiting for MinIO..."
until nc -z minio 9000; do
  echo "MinIO is unavailable - sleeping"
  sleep 2
done
echo "✅ MinIO is up"

# Generate Prisma Client
echo "📦 Generating Prisma Client..."
npx prisma generate

# Run database migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy

# Seed database (only if SEED_DB env var is set)
if [ "$SEED_DB" = "true" ]; then
  echo "🌱 Seeding database..."
  npx prisma db seed || echo "⚠️  Seeding skipped or failed"
fi

echo "🎉 Backend initialization complete!"
echo "🚀 Starting application..."

# Start the application
exec "$@"
