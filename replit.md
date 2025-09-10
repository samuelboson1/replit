# Hotel Management System

## Overview

This is a full-stack hotel housekeeping management web application built with React, Express.js, and PostgreSQL. The system enables efficient management of hotel room cleaning processes, featuring role-based access for managers and housekeepers. It provides real-time tracking of room status, cleaning sessions with timer functionality, checklist management for quality control, and problem reporting capabilities. The application is designed with a mobile-first approach to accommodate housekeeping staff working throughout the hotel.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React with TypeScript**: Single-page application using React 18 with TypeScript for type safety
- **Vite Build System**: Fast development server and optimized production builds
- **Wouter Routing**: Lightweight client-side routing solution
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent design system
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Real-time Updates**: WebSocket connection for live room status updates across all connected clients

### Backend Architecture
- **Express.js Server**: RESTful API with middleware for logging, error handling, and CORS
- **WebSocket Integration**: Real-time bidirectional communication using native WebSocket API
- **Database Layer**: Drizzle ORM with type-safe schema definitions and migrations
- **Session Management**: PostgreSQL-based session storage with connect-pg-simple
- **Development Tools**: Hot reload with Vite integration and TypeScript compilation

### Database Design
- **PostgreSQL with Neon**: Cloud-hosted PostgreSQL database with connection pooling
- **Schema Structure**: 
  - Users table with role-based permissions (manager, housekeeper, supervisor)
  - Rooms table with status tracking, floor organization, and assignment management
  - Cleaning sessions with timer functionality and pause/resume capabilities
  - Checklist templates and completions for quality control
  - Problem reports with categorization and priority levels
- **Real-time Sync**: Database changes trigger WebSocket broadcasts to maintain consistency

### Authentication & Authorization
- **Role-based Access Control**: Three user roles with different permissions and UI views
- **Session-based Authentication**: Secure session management with PostgreSQL storage
- **Route Protection**: Frontend and backend route guards based on user roles

## External Dependencies

### Core Technologies
- **Neon Database**: Serverless PostgreSQL hosting with WebSocket support
- **Drizzle ORM**: Type-safe database toolkit with schema validation
- **TanStack Query**: Server state management and caching library
- **Radix UI**: Headless component primitives for accessibility

### UI and Styling
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **shadcn/ui**: Pre-built component library with consistent styling
- **Lucide React**: Icon library for consistent iconography
- **class-variance-authority**: Type-safe variant management for components

### Development Tools
- **Vite**: Fast build tool with hot module replacement
- **TypeScript**: Static type checking across frontend and backend
- **ESBuild**: Fast JavaScript bundler for production builds
- **Replit Integration**: Development environment plugins and runtime error handling

### Real-time Communication
- **WebSocket API**: Native WebSocket implementation for real-time updates
- **Auto-reconnection**: Client-side connection resilience with exponential backoff
- **Message Broadcasting**: Server-side message distribution to all connected clients