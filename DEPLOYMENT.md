# CDR Pulse - Deployment Guide

## Overview

This document provides comprehensive instructions for deploying the CDR Pulse application on Replit and other platforms.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Deploying on Replit](#deploying-on-replit)
4. [Manual Deployment (Non-Replit)](#manual-deployment-non-replit)
5. [CAEL GitHub Actions Integration Setup](#cael-github-actions-integration-setup)
6. [Database Migration](#database-migration)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

- **Node.js**: Version 18 or higher
- **npm**: Version 8 or higher
- **PostgreSQL**: Version 14 or higher (for non-Replit deployments)
- **Git**: For version control

### Required Services

- **Replit Account** (for Replit deployment)
- **Neon PostgreSQL** (automatically provisioned on Replit, or manual setup elsewhere)
- **GitHub Personal Access Token** (optional, only for CAEL real integration)

---

## Environment Setup

### Required Environment Variables

The application requires the following environment variables:

```bash
# Database (automatically set by Replit)
DATABASE_URL=postgresql://user:password@host:port/database
PGHOST=host
PGPORT=5432
PGUSER=username
PGPASSWORD=password
PGDATABASE=database_name

# Session Management
SESSION_SECRET=your-random-secret-key-here
```

### Setting Environment Variables

#### On Replit

1. Click on the **Secrets** (lock icon) in the left sidebar
2. Add each variable with its value
3. Click **Add new secret** for each entry

#### On Other Platforms

Create a `.env` file in the root directory:

```bash
cp .env.example .env
# Edit .env with your values
```

**Important**: Never commit `.env` to version control. It's already in `.gitignore`.

---

## Deploying on Replit

### Step 1: Import or Create Project

1. **Option A**: Fork this repository on Replit
   - Go to Replit.com
   - Click **Create Repl**
   - Select **Import from GitHub**
   - Enter the repository URL

2. **Option B**: Upload existing code
   - Click **Create Repl**
   - Select **Node.js** template
   - Upload your project files

### Step 2: Database Setup

Replit automatically provisions a PostgreSQL database (powered by Neon):

1. In your Repl, the database is automatically available
2. Environment variables are automatically set
3. Run database migration:

```bash
npm run db:push
```

If you encounter data-loss warnings:

```bash
npm run db:push --force
```

### Step 3: Install Dependencies

Dependencies are automatically installed on Replit. If needed, manually run:

```bash
npm install
```

### Step 4: Start Development Server

Click the **Run** button or execute:

```bash
npm run dev
```

The application will be available at:
- **Development**: `https://your-repl-name.replit.dev`

### Step 5: Publishing (Production Deployment)

1. Click the **Publish** button (or **Deploy** in the sidebar)
2. Configure deployment settings:
   - **Name**: Your app name
   - **Description**: Brief description
   - **Domain**: Choose a custom domain or use the default `.replit.app` domain
3. Click **Publish**

Your production app will be available at:
- `https://your-app-name.replit.app`

**Note**: Published apps run the production build automatically.

---

## Manual Deployment (Non-Replit)

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd cdr-pulse
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Database Setup

#### Option A: Using Neon (Recommended)

1. Create a Neon account at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string
4. Set `DATABASE_URL` in your `.env` file

#### Option B: Local PostgreSQL

1. Install PostgreSQL locally
2. Create a database:

```bash
createdb cdr_pulse
```

3. Set connection details in `.env`

### Step 4: Run Database Migration

```bash
npm run db:push
```

### Step 5: Build Application

```bash
npm run build
```

This creates:
- Frontend build in `dist/` directory
- Backend bundle in `dist/index.js`

### Step 6: Start Production Server

```bash
npm start
```

The application will be available at `http://localhost:5000`

### Step 7: Production Deployment Options

#### Heroku

```bash
# Install Heroku CLI
heroku create your-app-name
heroku addons:create heroku-postgresql:mini
git push heroku main
```

#### DigitalOcean App Platform

1. Connect your GitHub repository
2. Select Node.js environment
3. Add environment variables
4. Deploy

#### AWS EC2

1. Launch an EC2 instance (Ubuntu 22.04)
2. Install Node.js and PostgreSQL
3. Clone repository
4. Follow steps 2-6 above
5. Use PM2 for process management:

```bash
npm install -g pm2
pm2 start dist/index.js --name cdr-pulse
pm2 startup
pm2 save
```

#### Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

Build and run:

```bash
docker build -t cdr-pulse .
docker run -p 5000:5000 --env-file .env cdr-pulse
```

---

## CAEL GitHub Actions Integration Setup

The CAEL (Clinical Analytics Exchange Layer) application features **real GitHub Actions integration** for load testing.

### Prerequisites

1. **GitHub Personal Access Token** with permissions:
   - `repo` (Full control of private repositories)
   - `actions` (Workflows)

2. **Access** to the `github-actions-tests/k6-performance-test` repository

### Creating a GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click **Generate new token (classic)**
3. Set scopes:
   - ✅ `repo`
   - ✅ `workflow`
4. Click **Generate token**
5. **Copy the token** (you won't see it again!)

### Using CAEL Integration

1. In CDR Pulse, click **Start New Load Test**
2. Select **CAEL** application (marked with "Real Integration" badge)
3. Enter your GitHub token in the modal
4. Click **Submit**
5. The workflow will trigger on GitHub Actions
6. View real K6 load test results when complete

### Token Storage (Production)

For production deployments, store the GitHub token as a secret:

**On Replit:**
1. Go to Secrets tab
2. Add `GITHUB_TOKEN` with your token value

**Other platforms:**
- Set `GITHUB_TOKEN` environment variable
- Never commit tokens to version control

---

## Database Migration

### Updating the Database Schema

When you make changes to `shared/schema.ts`:

1. **Preview changes**:

```bash
npm run db:push
```

2. **If warnings appear**, force the migration:

```bash
npm run db:push --force
```

**Warning**: `--force` may result in data loss. Always backup production databases before forcing migrations.

### Creating Backups (Neon)

Neon automatically creates point-in-time backups. To manually backup:

1. Go to your Neon dashboard
2. Select your project
3. Use the **Branching** feature to create a database snapshot

### Restoring from Backup

Use Replit's **Rollback** feature:
1. Click the clock icon in the Replit UI
2. Select a checkpoint
3. Restore code and database together

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Errors

**Error**: `Connection refused` or `ECONNREFUSED`

**Solution**:
- Verify `DATABASE_URL` is set correctly
- Check PostgreSQL is running
- Ensure firewall allows connections

#### 2. Module Not Found Errors

**Error**: `Cannot find module 'xyz'`

**Solution**:
```bash
rm -rf node_modules package-lock.json
npm install
```

#### 3. Port Already in Use

**Error**: `EADDRINUSE: address already in use :::5000`

**Solution**:
```bash
# Find process using port 5000
lsof -i :5000
# Kill the process
kill -9 <PID>
```

Or change the port in `server/index-dev.ts` and `server/index-prod.ts`

#### 4. Build Failures

**Error**: Build fails during `npm run build`

**Solution**:
- Check TypeScript errors: `npm run check`
- Clear Vite cache: `rm -rf node_modules/.vite`
- Rebuild: `npm run build`

#### 5. GitHub Actions Workflow Not Triggering

**Error**: "Failed to trigger workflow"

**Solution**:
- Verify GitHub token has correct permissions
- Check token format (must start with `ghp_` or `github_pat_`)
- Ensure access to `github-actions-tests/k6-performance-test` repository
- Check backend logs for detailed error messages

#### 6. Windows Compatibility Issues

**Error**: `NODE_ENV is not recognized as an internal or external command`

**Solution**:
The application now uses `cross-env` for Windows compatibility. Ensure your `package.json` scripts use:

```json
{
  "scripts": {
    "dev": "cross-env NODE_ENV=development tsx server/index-dev.ts",
    "start": "cross-env NODE_ENV=production node dist/index.js"
  }
}
```

---

## Performance Optimization

### Production Checklist

- [ ] Enable gzip compression
- [ ] Set up CDN for static assets
- [ ] Configure database connection pooling
- [ ] Set up monitoring (e.g., Sentry, DataDog)
- [ ] Enable rate limiting
- [ ] Set up HTTPS/TLS
- [ ] Configure CORS appropriately
- [ ] Review and optimize database indexes

### Monitoring

Recommended tools:
- **Application Performance**: New Relic, DataDog
- **Error Tracking**: Sentry
- **Database**: Neon Dashboard, pgAdmin
- **Uptime**: UptimeRobot, Pingdom

---

## Security Considerations

### Production Security Checklist

- [ ] Use strong `SESSION_SECRET` (minimum 32 characters)
- [ ] Enable HTTPS only
- [ ] Set secure cookie flags
- [ ] Configure CORS for specific domains
- [ ] Use environment variables for all secrets
- [ ] Enable rate limiting on API routes
- [ ] Regular dependency updates (`npm audit fix`)
- [ ] Database connection over SSL/TLS

### GitHub Token Security

- **Never** commit tokens to version control
- Store in environment variables/secrets only
- Rotate tokens periodically
- Use minimum required permissions
- Revoke tokens when no longer needed

---

## Support and Resources

### Documentation

- **Replit Docs**: [docs.replit.com](https://docs.replit.com)
- **Neon Docs**: [neon.tech/docs](https://neon.tech/docs)
- **Express.js**: [expressjs.com](https://expressjs.com)
- **React**: [react.dev](https://react.dev)
- **Drizzle ORM**: [orm.drizzle.team](https://orm.drizzle.team)

### Project-Specific Files

- `README.md` - Project overview and quick start
- `replit.md` - Technical architecture and system design
- `shared/schema.ts` - Database schema definitions
- `design_guidelines.md` - UI/UX design system

---

## License

This project is licensed under the MIT License. See LICENSE file for details.
