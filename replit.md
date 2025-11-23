# K6 Load Testing Dashboard

## Overview

This is a K6 Load Testing Dashboard application designed for healthcare CDR (Clinical Data Repository) applications. It provides a web-based interface for configuring, executing, and monitoring load tests on healthcare APIs. The application follows a wizard-based workflow that guides users through selecting applications, choosing API endpoints, configuring test parameters, and reviewing test results.

The system enables healthcare organizations to ensure their clinical data exchange platforms can handle production-level traffic while maintaining performance standards required for patient care systems.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool and development server.

**Rationale**: Vite provides fast hot module replacement during development and optimized production builds. React's component-based architecture supports the complex wizard flow and dashboard interfaces required for test configuration.

**UI Component System**: Radix UI primitives with shadcn/ui design system and Tailwind CSS for styling.

**Rationale**: Radix UI provides accessible, unstyled primitives that can be customized to match healthcare application design standards. The shadcn/ui layer adds a consistent design language inspired by modern dashboards (Linear, Vercel, Stripe) while maintaining accessibility standards critical for healthcare applications.

**State Management**: React hooks for local state, TanStack Query (React Query) for server state management.

**Rationale**: TanStack Query handles API data fetching, caching, and synchronization automatically, reducing boilerplate code. Local state with hooks manages wizard progression and form state.

**Routing**: Wouter for lightweight client-side routing.

**Rationale**: Wouter provides a minimal routing solution suitable for the application's simple navigation structure (Dashboard and Test History pages).

**Design System**: Custom design tokens following the "New York" style variant with neutral color scheme, supporting both light and dark modes.

**Rationale**: Healthcare applications require professional, trustworthy interfaces. The design guidelines reference Linear and Stripe's clean aesthetics while incorporating healthcare-appropriate trust signals.

### Backend Architecture

**Runtime**: Node.js with Express.js framework.

**Rationale**: Express provides a minimal, flexible HTTP server that integrates well with the monorepo structure where frontend and backend share TypeScript types.

**Development vs Production**: Separate entry points (index-dev.ts uses Vite middleware, index-prod.ts serves static files).

**Rationale**: Development mode integrates Vite's HMR for fast iteration. Production mode serves pre-built static assets for optimal performance.

**API Structure**: RESTful endpoints following resource-based routing patterns:
- `/api/test-configurations` - CRUD operations for test configurations
- `/api/test-runs` - Managing and retrieving test execution results

**Rationale**: RESTful design provides intuitive, predictable endpoints that align with standard HTTP semantics, making the API easy to understand and consume.

**Validation**: Zod schemas shared between frontend and backend for type-safe validation.

**Rationale**: Sharing schemas ensures consistency between client and server validation logic, preventing runtime type mismatches.

### Data Storage

**Database**: PostgreSQL accessed via Neon serverless driver.

**Rationale**: PostgreSQL provides ACID compliance and rich data types (JSONB for test results) required for healthcare data integrity. Neon's serverless approach simplifies deployment and scaling.

**ORM**: Drizzle ORM with schema-first design.

**Rationale**: Drizzle provides type-safe database access with minimal runtime overhead. The schema-first approach generates TypeScript types automatically, ensuring type safety throughout the application.

**Schema Design**:
- `users` - Authentication and user management
- `test_configurations` - Stores reusable test setups (application, APIs, parameters)
- `test_runs` - Records test execution history and results with JSONB for flexible metrics storage

**Rationale**: Separating configurations from runs allows users to save and reuse test setups while maintaining a complete audit trail of all test executions.

**Migrations**: Drizzle Kit manages schema migrations with SQL generation.

**Rationale**: SQL migrations provide explicit control over schema changes with the ability to review before applying, critical for production healthcare systems.

### External Dependencies

**Neon PostgreSQL**: Serverless PostgreSQL database platform.

**Integration**: Connection via `@neondatabase/serverless` driver using `DATABASE_URL` environment variable.

**TanStack Query**: Server state management library.

**Integration**: Configured with custom query client that handles authentication and error states.

**Radix UI**: Accessible component primitives (20+ components including dialogs, dropdowns, tooltips, etc.).

**Integration**: Wrapped with shadcn/ui styling layer and consumed throughout the component tree.

**Tailwind CSS**: Utility-first CSS framework.

**Integration**: Custom configuration extends base theme with healthcare-appropriate color palette, spacing scales, and design tokens.

**Wouter**: Lightweight routing library.

**Integration**: Provides navigation between Dashboard and Test History views without requiring full React Router overhead.

**Lucide React**: Icon library.

**Integration**: Icons imported as React components and used throughout UI for visual indicators and actions.

**date-fns**: Date formatting and manipulation.

**Integration**: Used in Test History page to format timestamps for test run displays.

**Mock Data**: Healthcare applications and API endpoints defined in `shared/mock-data.ts`.

**Rationale**: Currently uses static mock data for demonstration. This structure allows easy replacement with real CDR application metadata from a configuration service or database.