# Hotel Management System - Supabase Version

## Overview

This is a full-stack hotel housekeeping management web application built with React, Express.js, and Supabase. The system enables efficient management of hotel room cleaning processes with real-time updates.

## Setup Instructions

### 1. Supabase Setup

1. Go to [Supabase](https://supabase.com) and create a new project
2. Wait for the project to be fully provisioned
3. Go to Project Settings > API to get your keys:
   - `SUPABASE_URL`: Your project URL
   - `SUPABASE_ANON_KEY`: Your anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (keep this secret!)

### 2. Database Setup

1. In your Supabase project, go to Settings > Database
2. Copy the connection string (it should look like: `postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres`)
3. Set this as your `SUPABASE_DATABASE_URL` environment variable

### 3. Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.your-project-ref.supabase.co:5432/postgres
SESSION_SECRET=your-random-session-secret
NODE_ENV=development
ALLOW_DEV_ROLE_OVERRIDE=true
```

### 4. Database Migration

Run the database migration to create all necessary tables:

```bash
npm run db:push
```

### 5. Start the Application

```bash
npm install
npm run dev
```

## Features

- **Real-time Dashboard**: Live updates of room status across all connected clients
- **Role-based Access**: Manager, Supervisor, and Housekeeper roles with different permissions
- **Cleaning Timer**: Track cleaning time with pause/resume functionality
- **5-Star Cleaning Protocol**: Comprehensive checklist system
- **Problem Reporting**: Report and track maintenance issues
- **Mobile-first Design**: Optimized for mobile devices used by housekeeping staff

## Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, Node.js
- **Database**: Supabase (PostgreSQL)
- **ORM**: Drizzle ORM
- **Real-time**: WebSocket + Supabase Realtime
- **Authentication**: Replit Auth (can be replaced with Supabase Auth)

## Database Schema

The application uses the following main tables:
- `users` - User management with roles
- `rooms` - Hotel room information and status
- `cleaning_sessions` - Cleaning time tracking
- `checklist_templates` - Cleaning protocol templates
- `checklist_completions` - Completed cleaning checklists
- `problem_reports` - Maintenance and issue reports

## Development

The application is configured for development with hot reload and automatic database synchronization. The Supabase integration provides:

- Real-time database updates
- Built-in authentication (if you want to replace Replit Auth)
- Automatic API generation
- Built-in storage for file uploads (for future features)

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production`
2. Configure proper `REPLIT_DOMAINS` for authentication
3. Use production Supabase credentials
4. Enable RLS (Row Level Security) policies in Supabase for data security

## Support

This application demonstrates modern full-stack development practices with real-time capabilities, making it suitable for production hotel management scenarios.