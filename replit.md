# CDR Pulse

## Overview
CDR Pulse is an intelligent performance testing dashboard application for healthcare Clinical Data Repository (CDR) applications. It provides a web-based interface for configuring, executing, and monitoring load tests on healthcare APIs. The application guides users through selecting applications, choosing API endpoints, configuring test parameters, and reviewing test results. Its purpose is to help healthcare organizations ensure their clinical data exchange platforms can handle production-level traffic and meet performance standards.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript, using Vite for build and development.
- **UI**: Radix UI primitives with shadcn/ui design system and Tailwind CSS for styling.
- **State Management**: React hooks for local state; TanStack Query for server state.
- **Routing**: Wouter for lightweight client-side navigation.
- **Design System**: Custom design tokens (New York style, neutral colors, light/dark modes) for a professional aesthetic.

### Backend
- **Runtime**: Node.js with Express.js.
- **Deployment**: Separate entry points for development (Vite middleware) and production (serving static files).
- **API**: RESTful endpoints (`/api/test-configurations`, `/api/test-runs`).
- **Validation**: Zod schemas shared between frontend and backend for type-safe validation.

### Data Storage
- **Database**: PostgreSQL via Neon serverless driver.
- **ORM**: Drizzle ORM with a schema-first approach.
- **Schema**: `users`, `test_configurations`, `test_runs` (using JSONB for flexible metrics).
- **Migrations**: Drizzle Kit for managing schema changes with SQL generation.

### Core Features & Design Decisions
- **Wizard-based Workflow**: Guides users through 6 steps: Application, APIs, Payloads, Configure, Review, Results.
- **CAEL GitHub Actions Integration**: A dedicated flow for the CAEL application to trigger GitHub Actions workflows for real performance tests, bypassing the standard wizard. It includes a `GitHubTokenModal` for authentication and `CAELTestResults` for displaying actual K6 load test results from GitHub artifacts.
- **Payload Upload Feature**: Allows users to upload JSON test data for API endpoints.
    - **OpenAPI-Driven**: Uses OpenAPI specifications to generate JSON templates, validate uploaded payloads, and provide schema details.
    - **Validation**: Supports validation of required fields, data types, formats, enums, and nested objects.
    - **State Management**: Payloads are stored in-memory, persist across wizard steps, and are filtered/cleared as needed.
- **Admin Panel**: Enables users to configure new healthcare applications by uploading OpenAPI specifications.
    - **OpenAPI Parsing**: Extracts API endpoints and methods (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS) from uploaded specs.
    - **Application Management**: Allows viewing, expanding, and removing configured applications.
    - **Integration**: Admin-configured apps appear in the main dashboard and support the full wizard flow, including template generation and payload validation using their uploaded OpenAPI specs.

## External Dependencies
- **Neon PostgreSQL**: Serverless PostgreSQL database.
- **TanStack Query**: Server state management.
- **Radix UI**: Accessible component primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **Wouter**: Lightweight client-side router.
- **Lucide React**: Icon library.
- **date-fns**: Date formatting and manipulation.
- **Mock Data**: Static mock data for healthcare applications and API endpoints (`shared/mock-data.ts`).

## K6 Script Generation

### Overview
CDR Pulse now supports dynamic K6 script generation based on wizard configuration. This allows users to either download K6 scripts for local execution or trigger tests via GitHub Actions with the full configuration.

### Key Files
- `shared/k6-generator.ts` - Utility functions for generating K6 scripts and workflow inputs
- `docs/gha-workflow-template.yml` - GitHub Actions workflow template for users to copy

### API Endpoints
- **POST `/api/github/trigger-workflow`** - Triggers GitHub Actions with dynamic test configuration
  - Accepts `testPlan` object with selectedApis, payloads, config, baseUrl
  - Falls back to legacy hardcoded mode if no testPlan provided
- **POST `/api/k6/generate-script`** - Generates downloadable K6 script
- **GET `/api/k6/workflow-template`** - Returns GitHub Actions YAML template

### Workflow Integration
CAEL and other apps now use the full wizard flow. When triggering a test:
1. User completes wizard (APIs, Payloads, Configure, Review)
2. For CAEL: GitHub token modal appears, then workflow triggers with full config
3. For other apps: Mock results are generated
4. Users can download K6 scripts for any app via "Download K6 Script" button

### Generated Script Features
- Dynamic endpoint configuration from wizard selection
- Payload injection from uploaded JSON files
- Configurable stages (ramp-up, steady state, ramp-down)
- Custom thresholds (response time, error rate)
- Support for all HTTP methods (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS)
- Results exported as JSON for artifact collection

### Time Unit Conventions
- **Ramp-up Time**: In SECONDS (e.g., 30s, 120s, 300s)
- **Test Duration**: In MINUTES (e.g., 5m, 10m, 30m)
- **Presets**: Light=30s, Medium=120s (2m), Heavy=240s (4m), Stress=300s (5m)
- **Default**: 30 seconds ramp-up, 10 minutes duration

## Pub/Sub Testing Feature

### Overview
CDR Pulse includes a Pub/Sub testing feature for load testing message publishing to Confluent Kafka and Google Pub/Sub platforms. This enables healthcare organizations to test their event-driven architectures and message throughput.

### Key Files
- `client/src/pages/PubSub.tsx` - Main Pub/Sub testing page with 3-step workflow
- `server/routes.ts` - Backend API endpoints for Pub/Sub operations

### Frontend Flow
1. **Configuration Tab**: Select platform (Kafka/GCP), enter credentials, test connection, register topics
2. **Messages Tab**: Compose messages manually or upload JSON files with bulk messages
3. **Load Test Tab**: Configure virtual users, duration, message rate; generate K6 scripts or trigger tests

### API Endpoints
- **POST `/api/pubsub/kafka/test-connection`** - Tests Kafka connection with bootstrap servers and SASL credentials
- **POST `/api/pubsub/gcp/test-connection`** - Tests GCP Pub/Sub connection with project ID and credentials JSON
- **POST `/api/pubsub/topics`** - Registers a new topic (stored in-memory)
- **GET `/api/pubsub/topics`** - Lists all registered topics
- **DELETE `/api/pubsub/topics/:id`** - Removes a registered topic
- **POST `/api/pubsub/kafka/send`** - Sends messages to Kafka topic
- **POST `/api/pubsub/gcp/send`** - Sends messages to GCP Pub/Sub topic
- **POST `/api/pubsub/k6/generate-script`** - Generates K6 load test script for Pub/Sub
- **POST `/api/pubsub/trigger-loadtest`** - Triggers a Pub/Sub load test

### Platform Configurations
- **Kafka**: Bootstrap servers, API key/secret (SASL_SSL), topic name
- **GCP Pub/Sub**: Project ID, credentials JSON file, topic name

### Message Handling
- Manual composition with key/value pairs
- Bulk upload via JSON file (array of {key, value} objects)
- Message queue with preview and delete capabilities