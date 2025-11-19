# Sneaker Tracker API Server

Express.js API server for the Sneaker Tracker application with TypeScript, Redis caching, Prometheus metrics, and Zod validation.

## Features

- 🔒 Strong request validation with Zod schemas
- 📊 Prometheus-format metrics
- 💾 Redis-backed response caching
- 🚦 Rate limiting and security headers
- 📝 Structured logging
- ⚡ TypeScript throughout

## Getting Started

### Prerequisites

- Node.js 14+
- Redis server (for caching)
- pnpm (recommended) or npm

### Installation

```bash
# Install dependencies
pnpm install

# Build the project
pnpm run build
```

### Configuration

Create a `.env` file based on `.env.example`. Required environment variables:

```env
# Core configuration
PORT=4000                            # API server port
NODE_ENV=development                 # development | production

# Redis configuration
REDIS_URL=redis://localhost:6379     # Redis connection URL

# Rate limiting
RATE_LIMIT_WINDOW=15                 # Window size in minutes
RATE_LIMIT_MAX=100                   # Max requests per window

# See README-ENV.md for Supabase configuration
```

### Running the Server

```bash
# Development mode
pnpm run dev

# Production mode
pnpm run build && pnpm start
```

## API Documentation

### Endpoints

- `GET /api/releases` - List all releases (Redis cached)
- `POST /api/releases` - Create a new release
- `PUT /api/releases/:id` - Update a release
- `DELETE /api/releases/:id` - Delete a release
- `GET /api/health` - Health check endpoint
- `GET /api/metrics` - Prometheus metrics

### Request Validation

All POST/PUT requests are validated using Zod schemas. Example valid release:

```json
{
  "name": "Air Jordan 1 High OG",
  "brand": "Nike",
  "model": "Air Jordan",
  "releaseDate": "2025-12-25T10:00:00Z",
  "price": 179.99,
  "status": "upcoming",
  "retailer": "Nike SNKRS",
  "sku": "555088-701",
  "imageUrl": "https://example.com/aj1.jpg",
  "sizes": [
    { "size": "US 9", "quantity": 100 },
    { "size": "US 10", "quantity": 150 }
  ]
}
```

### Monitoring & Metrics

Access Prometheus metrics at `/api/metrics`. Available metrics:

- `http_requests_total` - Total HTTP requests (labeled by method, path, status)
- `http_request_duration_seconds` - Request duration histograms
- Standard Node.js metrics (CPU, memory, etc.)

### Caching

- GET responses are cached in Redis
- Default TTL: 300 seconds (5 minutes)
- Cache is automatically invalidated on POST/PUT/DELETE
- Cache key format: `releases:${path}`

## Development

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch
```

### Type Checking

```bash
# Check types
pnpm run build

# Watch mode during development
pnpm run build:watch
```

### Available Scripts

- `pnpm run dev` - Start development server
- `pnpm run build` - Build for production
- `pnpm start` - Start production server
- `pnpm test` - Run tests
- `pnpm run lint` - Lint code
- `pnpm run format` - Format code

## Error Handling

- 400: Bad Request (validation errors)
- 404: Resource not found
- 429: Too Many Requests (rate limit)
- 500: Internal Server Error
- 503: Service Unavailable (timeout)

For validation errors, the response includes detailed error information:

```json
{
  "error": "Validation failed",
  "details": {
    "price": ["Expected number, received string"],
    "status": ["Invalid enum value. Expected 'upcoming' | 'released' | 'delayed' | 'cancelled'"]
  }
}
```