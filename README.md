# Workforce Management Application

A comprehensive workforce management Progressive Web App (PWA) for Romanian companies with time tracking, scheduling, task management, and reporting capabilities.

## Features

- **Task Management**: Create, assign, and track tasks with priority and urgency levels
- **Automatic Time Tracking** (Pontaj): Background timer with location tracking every 2 hours
- **Monthly Work Schedules**: Romanian labor law compliant scheduling (8h/12h shifts)
- **Two-Level Approval Workflow**: Manager → Admin approval for schedule changes
- **Real-time Notifications**: WebSocket + PWA push notifications
- **Reports & Export**: Generate PDF and Excel reports for time tracking, tasks, and schedules
- **Multi-User System**: Admin, Manager, and Angajat (Employee) roles
- **Offline Support**: App works offline and syncs when connection is restored

## Technology Stack

### Backend
- **Framework**: NestJS (Node.js + TypeScript)
- **Database**: PostgreSQL 15+ with PostGIS
- **Cache/Queue**: Redis + BullMQ
- **Real-time**: Socket.io
- **Reports**: Puppeteer (PDF), ExcelJS (Excel)
- **Storage**: MinIO (S3-compatible)

### Frontend
- **Framework**: React + TypeScript + Vite
- **UI Library**: Material-UI (MUI)
- **State Management**: Redux Toolkit + RTK Query
- **PWA**: Vite PWA Plugin (Workbox)
- **Maps**: Leaflet
- **Calendar**: FullCalendar

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Git

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd workforce-management
```

### 2. Environment Setup

Create `.env` files from the examples:

**Backend:**
```bash
cd backend
cp .env.example .env
```

**Frontend:**
```bash
cd ../frontend
cp .env.example .env
```

Edit the `.env` files with your configuration.

### 3. Start Development Environment with Docker

```bash
cd docker
docker-compose up -d
```

This will start:
- PostgreSQL with PostGIS (port 5432)
- Redis (port 6379)
- MinIO (ports 9000, 9001)
- Backend API (port 3000)
- Frontend (port 5173)

### 4. Run Database Migrations

```bash
cd ../backend
npm run migration:run
```

### 5. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000/api
- **API Health Check**: http://localhost:3000/api/health
- **MinIO Console**: http://localhost:9001 (credentials: minioadmin/minioadmin)

## Development

### Backend Development

```bash
cd backend

# Install dependencies
npm install

# Start development server (with hot reload)
npm run start:dev

# Run tests
npm test

# Run linter
npm run lint

# Format code
npm run format

# Build for production
npm run build
```

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Database Migrations

```bash
cd backend

# Generate a new migration
npm run migration:generate -- src/database/migrations/MigrationName

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

## Project Structure

```
workforce-management/
├── backend/                    # NestJS backend
│   ├── src/
│   │   ├── config/            # Configuration files
│   │   ├── common/            # Shared utilities, guards, decorators
│   │   ├── modules/           # Feature modules
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── tasks/
│   │   │   ├── time-tracking/
│   │   │   ├── location-tracking/
│   │   │   ├── schedules/
│   │   │   ├── notifications/
│   │   │   ├── reports/
│   │   │   └── ...
│   │   └── database/
│   │       └── migrations/
│   └── package.json
│
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/             # Page components
│   │   ├── store/             # Redux store
│   │   ├── services/          # Business logic services
│   │   ├── hooks/             # Custom React hooks
│   │   ├── utils/             # Utility functions
│   │   └── routes/            # Route configuration
│   └── package.json
│
├── docker/                     # Docker configuration
│   ├── docker-compose.yml
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── init-scripts/
│
└── README.md
```

## Database Schema

The application includes:
- **users**: User accounts with roles (ADMIN, MANAGER, ANGAJAT)
- **departments**: Team/department structure
- **tasks**: Tasks with priority, urgency, and assignment
- **time_entries**: Time tracking records (pontaj)
- **location_logs**: GPS coordinates with PostGIS geography type
- **work_schedules**: Monthly schedules
- **shift_types**: 8h and 12h shift definitions
- **schedule_assignments**: User shift assignments
- **schedule_change_requests**: Two-level approval workflow
- **labor_law_validations**: Romanian law compliance checks
- **notifications**: In-app notifications
- **push_subscriptions**: PWA push notification endpoints
- **generated_reports**: Report metadata
- **audit_logs**: Security and compliance audit trail

## Key Features Implementation

### Background Timer
- Service Worker with periodic background sync
- IndexedDB for persistent storage
- WebSocket heartbeat (every 60 seconds)
- Server-side timer state as source of truth
- Wake Lock API to prevent screen sleep

### Automatic Location Tracking
- Records GPS coordinates every 2 hours during active timer
- Hybrid approach: client-side + server-initiated via push notifications
- GDPR compliant with user consent
- PostGIS for geospatial queries

### Romanian Labor Law Compliance
- Max 48 hours/week (averaged over 4 months)
- Min 11 hours rest between shifts
- Min 35 hours consecutive weekly rest
- Max 8 hours night shift per 24h period
- Real-time validation feedback in UI

### Two-Level Approval Workflow
- Employee Request → Manager Review → Admin Final Approval
- Notifications at each stage
- Audit trail for all approvals

## Testing

### Run Backend Tests
```bash
cd backend
npm test                # Unit tests
npm run test:e2e       # End-to-end tests
npm run test:cov       # Coverage report
```

### Run Frontend Tests
```bash
cd frontend
npm test                # Unit tests
```

## Deployment

### Production Build

**Backend:**
```bash
cd backend
npm run build
npm run start:prod
```

**Frontend:**
```bash
cd frontend
npm run build
# Serve the dist/ directory
```

### Docker Production

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Environment Variables

### Backend `.env`
- `NODE_ENV`: Environment (development/production)
- `DATABASE_*`: PostgreSQL connection details
- `REDIS_*`: Redis connection details
- `JWT_SECRET`: JWT signing secret
- `STORAGE_PROVIDER`: Storage provider (s3/minio)
- `EMAIL_PROVIDER`: Email provider (sendgrid/ses)
- `VAPID_*`: Web Push VAPID keys

### Frontend `.env`
- `VITE_API_URL`: Backend API URL
- `VITE_WS_URL`: WebSocket URL
- `VITE_GOOGLE_MAPS_API_KEY`: Google Maps API key

## Security

- JWT-based authentication
- RBAC (Role-Based Access Control)
- CORS protection
- Input validation with class-validator
- GDPR compliant data handling
- Audit logging for sensitive operations
- Rate limiting on critical endpoints

## License

ISC

## Support

For issues and questions, please open an issue on GitHub.

## Contributors

- Development Team

---

**Note**: This is a complex application with critical business logic (Romanian labor law compliance) and technical challenges (background timer, location tracking). Take time to test thoroughly, especially the labor law validation and timer synchronization.
