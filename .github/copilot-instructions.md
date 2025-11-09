# TaskGo AI Development Guide

## Project Overview
TaskGo is a service marketplace platform with three main components:
- Backend (NestJS + Prisma)
- Frontend (Angular)
- Mobile (Ionic/Angular)

## Architecture Patterns

### Backend (NestJS)
- **Module Structure**: Each domain feature is a module (auth, user, provider, services, etc.)
- **Database**: Prisma ORM with PostgreSQL
- **Key Patterns**:
  - Dependency Injection with `@Injectable()` decorators
  - Module forwarding for circular dependencies using `forwardRef()`
  - Global pipes for validation
  - Global filters for exception handling
  - OpenTelemetry integration for tracing

### Frontend/Mobile (Angular)
- **Component Architecture**: Standalone components with dependency injection
- **State Management**: Using Angular signals (`signal<T>()`)
- **HTTP Communication**: Injectable services with HttpClient
- **Key Patterns**:
  - Lazy loading with route-based code splitting
  - Shared UI components in `@shared/components`
  - Environment-based configuration
  - Zoneless change detection

## Development Workflow

### Setup
```bash
# Start database and monitoring
docker-compose up postgres_db pgadmin-compose prometheus grafana

# Backend
cd backend
npm install
npx prisma migrate dev
npm run start:dev

# Frontend
cd frontend
npm install
ng serve

# Mobile
cd mobile
npm install
ionic serve
```

### Key Files
- `backend/prisma/schema.prisma`: Database schema
- `backend/src/app.module.ts`: Main module configuration
- `frontend/src/app/app.config.ts`: Angular app configuration
- `mobile/capacitor.config.ts`: Mobile app configuration

### Database Operations
- Use Prisma migrations for schema changes
- Seed data available in `backend/prisma/seeds/`
- PgAdmin available at port 16543

### Testing
- Backend uses Jest for unit tests and e2e tests
- Frontend/Mobile use Angular TestBed
- Run tests with `npm test` in respective directories

## Common Patterns

### Backend Services
```typescript
@Injectable()
export class YourService {
  constructor(
    private prisma: PrismaService,
    private otherService: OtherService
  ) {}
}
```

### Frontend Components
```typescript
@Component({
  selector: 'app-your-component',
  standalone: true,
  imports: [CommonModule, SharedComponents],
  templateUrl: './your-component.html',
})
export class YourComponent {
  state = signal<Type>(initialValue);
  service = inject(YourService);
}
```

### API Communication
- Base URL configured in environment files
- Services use HttpClient with typed responses
- Error handling through global interceptors

## Important Notes
- Always use Prisma client for database operations
- Implement proper error handling with CustomExceptionFilter
- Follow existing module structure for new features
- Use signals for frontend state management
- Mobile app shares code with frontend where possible