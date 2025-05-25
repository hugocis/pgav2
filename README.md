# Attendance Management Portal (PGA)

![UFV Logo](public/logo-UFV.png)

## Description
Attendance Management Portal for Francisco de Vitoria University.

This system allows for comprehensive management of student attendance across different courses, facilitating the process for both students and teaching and administrative staff. The application is designed with different roles and permissions to meet the specific needs of each type of user.

### Main Features
- Registration and control of class attendance
- Absence justification by students
- Management of academic exemptions
- Generation of attendance reports
- Attendance statistics by subjects, groups, and students
- Administrative panel for system configuration

### Technologies
- **Frontend:** React, Next.js 13+ (App Router)
- **Backend:** Node.js with Next.js API Routes
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** NextAuth.js
- **Testing:** Jest

## Requirements
- Node.js 18.x or higher
- PostgreSQL 14.x
- Docker (optional, for development)

## Environment Setup

### Installing Dependencies

First, install all necessary dependencies:

```bash
npm install
```

### Database Configuration

You have two options for configuring the database:

#### Option 1: Local PostgreSQL
If you already have PostgreSQL installed locally, you just need to create a database called `pga`.

#### Option 2: Docker (recommended for development)
The project includes Docker configuration to facilitate development:

```bash
# Start PostgreSQL container
npm run docker:up
# or directly
docker-compose up -d
```

To stop the containers:
```bash
npm run docker:down
# or directly
docker-compose down
```

You can also use the scripts `restart-docker.ps1` (Windows) or `restart-docker.sh` (Linux/Mac) to restart the containers.

### Environment Variables
Create a `.env` file in the root of the project with the following variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/pga"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"

# Email (for password recovery)
EMAIL_SERVER_HOST="smtp.example.com"
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER="your-username@example.com"
EMAIL_SERVER_PASSWORD="your-password"
EMAIL_FROM="noreply@example.com"

# Security
LOG_INTEGRITY_SECRET="secret-key-for-signing-logs"
```

For development with Docker, you can use these default credentials:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pga"
```

## Running in Development

Follow these steps to configure and run the project in development mode:

```bash
# 1. Install dependencies (if you haven't already)
npm install

# 2. Start database with Docker (optional)
npm run docker:up

# 3. Apply database migrations
npx prisma migrate dev

# 4. Load test data (seed)
npm run seed
# or directly
npx prisma db seed

# 5. Start development server
npm run dev
```

Once these commands are executed, the application will be available at [http://localhost:3000](http://localhost:3000).

### Useful Commands During Development

```bash
# Generate Prisma client (after changing schema.prisma)
npx prisma generate

# View database structure with Prisma Studio
npx prisma studio

# Format Prisma files
npx prisma format

# Reset the database (caution! will delete all data)
npx prisma migrate reset
```

## Running in Production

To deploy the application in a production environment:

```bash
# 1. Install dependencies without development
npm install --production

# 2. Build the application
npm run build

# 3. Apply migrations (only if there are schema changes)
npx prisma migrate deploy

# 4. Start server
npm start
```

### Production Considerations

- Make sure to properly configure environment variables for the production environment
- Use a managed PostgreSQL service or properly configure your own server
- Set up a reverse proxy (like Nginx) in front of the application
- Establish a monitoring system for the application

### Deployment with Docker

You can also use Docker for production with the included Dockerfile:

```bash
# Build the image
docker build -t pga-app .

# Run the container
docker run -p 3000:3000 --env-file .env.production pga-app
```

## Testing

This project uses Jest for unit testing. To run tests:

```bash
# Run all tests
npm test

# Run tests with watch mode (useful during development)
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific tests only
npm run test:api    # API route tests
npm run test:lib    # Utility/function tests
```

### Test Structure
Tests are organized in directories that reflect the project structure:

```
__tests__/
  ├── api/         # Tests for API routes
  │    ├── auth/   # Authentication tests
  │    └── user/   # User tests
  └── lib/         # Tests for utility functions
```

## Project Structure

The project follows the Next.js structure with App Router:

```
app/                      # Main Next.js App Router directory
  ├── api/                # API Endpoints
  │   ├── (admin)/        # API for administrators
  │   ├── (manager)/      # API for managers
  │   ├── (pec)/          # API for PEC
  │   ├── (student)/      # API for students
  │   ├── (teacher)/      # API for teachers
  │   ├── auth/           # Authentication API
  │   ├── health/         # System health API
  │   └── user/           # User API
  ├── auth/               # Authentication pages
  ├── admin/              # Administrator panel
  │   ├── dashboard/      # Administrator dashboard
  │   ├── users/          # User management
  │   ├── curso-academico/# Course configuration
  │   └── ...             # Other administration modules
  ├── alumno/             # Student panel
  ├── manager/            # Manager panel
  ├── pec/                # PEC panel
  └── profesor/           # Teacher panel
      ├── pasar-clase/    # Attendance registration
      └── ...             # Other functionalities
components/               # Reusable React components
lib/                      # Utilities and functions
  ├── actions/            # Server actions
  ├── authOptions.ts      # Authentication configuration
  └── prisma.ts           # Prisma client
prisma/                   # Prisma schema and migrations
  ├── schema.prisma       # Data model definition
  ├── seed.ts             # Script to load test data
  └── migrations/         # Database migrations
public/                   # Static files
types/                    # TypeScript type definitions
__tests__/                # Unit and integration tests
__mocks__/                # Mocks for testing
```

### Role System

The portal distinguishes between different types of users, each with their own panel and functionalities:

#### 1. Administrator (`admin`)
- Complete user and permission management
- Configuration of degree programs, subjects, and academic years
- System activity overview
- Enrollment management

#### 2. Student (`alumno`)
- View of their attendance by subject
- Justification of absences
- Request for academic exemptions

#### 3. Manager (`manager`)
- Management of justifications submitted by students
- Processing of academic exemptions
- Generation of attendance reports
- Control of teacher signatures

#### 4. PEC (`pec`)
- Student attendance management
- Consultation of GOE students (Educational Guidance Group)
- Specific view for student monitoring

#### 5. Teacher (`profesor`)
- Class attendance registration
- Consultation of session history
- Visualization of attendance statistics
- Management of groups and assigned students

## Contribution

If you wish to contribute to the project:

1. Create a fork of the repository
2. Create a branch for your feature (`git checkout -b feature/new-feature`)
3. Make your changes and commit (`git commit -am 'Add new feature'`)
4. Push your changes to your fork (`git push origin feature/new-feature`)
5. Create a Pull Request

### Code Conventions
- Use ESLint to maintain code consistency
- Write tests for all new features
- Follow TypeScript practices for strict typing

## Versions

### v1.0.0 (May 2025)
- Initial version of the Attendance Management Portal
- Implementation of all basic roles
- Justification and exemption system

## License
Property of Francisco de Vitoria University.

## Troubleshooting

### Database Issues
- **Error "Could not connect to database"**: Verify that PostgreSQL is running and that the credentials in `.env` are correct.
- **Error running migrations**: Try running `npx prisma migrate reset --force` to reset the database.
- **Prisma Client is not generated**: Run `npx prisma generate` to regenerate the client.

### Docker Issues
- **Cannot connect to container**: Verify that Docker is running and use `docker ps` to check the status of the container.
- **Port conflict**: If port 5432 is already in use, modify the mapped port in `docker-compose.yml`.
- **Container doesn't start**: Use `docker logs [container-name]` to see the error logs.

### Next.js Issues
- **Error "Module not found"**: Verify that all dependencies are installed with `npm install`.
- **Build problems**: Clean the cache with `npm run clean` and try again.
- **Changes are not reflected**: Restart the development server.

For any other issues, please open an issue in the project repository with a detailed description of the error and the steps to reproduce it.
