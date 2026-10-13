# NexusFlow Project Management System

A full-stack project management platform designed for managing large-scale project deliverables across Product Management, UI/UX, Frontend, Backend, and Client stakeholders.

## Live Application

### Frontend

https://NexusFlow-fullstack-frontend.vercel.app

### Backend API

https://NexusFlow-fullstack-backend-production.up.railway.app

Health Check:
GET /health

Expected response:

```json
{
  "status": "ok",
  "database": "connected"
}
```

## Repository

Backend:
https://github.com/publisheddiman/NexusFlow-fullstack-backend

Frontend:
https://github.com/publisheddiman/NexusFlow-fullstack-frontend

## Demo Accounts

Password for all accounts:

`Password123!`

### Product Manager

Email:
`pm@NexusFlow.local`

Access:

- Full project and task management
- Dependency creation
- Workflow management

### Internal Team

UI/UX:
`uiux@NexusFlow.local`

Frontend:
`frontend@NexusFlow.local`

Backend:
`backend@NexusFlow.local`

Access:

- View assigned tasks
- Update task status
- Upload attachments

Restrictions:

- Cannot edit core task description
- Cannot access unrelated projects

### Client Guest

Email:
`client@NexusFlow.local`

Access:

- View owned projects
- View aggregate metrics
- View client-visible tasks

Hidden:

- Engineer identities
- Department information
- Internal comments

# Architecture Overview

Frontend:

- Next.js 16 App Router
- React 19
- TypeScript Strict
- Tailwind CSS 4
- TanStack Query 5
- Zustand 5

Backend:

- TypeScript
- Bun Runtime
- Hono Framework
- Prisma ORM
- PostgreSQL
- JWT Authentication
- Zod Validation

Architecture:

Browser
↓
Next.js Frontend
↓
Hono Backend API
↓
Prisma ORM
↓
PostgreSQL Database

# RBAC + ABAC Authorization

Authorization is based on:

- User role
- Department
- Project membership
- Task assignment
- Task state

Roles:

## PM

- Full project access
- Create and update tasks
- Create dependencies
- Cannot complete another user's task

## Internal Team

- Access only assigned tasks
- Update status
- Upload attachments
- Cannot modify descriptions

## Client

- Access only owned projects
- Receive masked API responses

# Dependency-Aware Task Management

Tasks support prerequisite relationships.

Example:

UI Design
↓
Frontend Slicing

If prerequisites are incomplete:

- Task becomes BLOCKED
- UI action is disabled
- Backend rejects invalid transitions

# Optimistic Locking

Each task contains a version field.

Update process:

1. Client sends current version.
2. Backend compares database version.
3. Conflict returns HTTP 409.

This prevents concurrent updates from overwriting each other.

# Audit Trail

Every task change is stored.

Recorded data:

- User ID
- Timestamp
- Changed column
- Old value
- New value

Audit records are immutable.

# Soft Delete

The system uses soft delete with:

`deletedAt`

Implemented for:

- Users
- Projects
- Tasks
- Comments
- Attachments
- Departments

# Client Data Isolation

Client responses are filtered at backend level.

Removed from API responses:

- Engineer names
- Avatar information
- Department data
- Internal comments

# Deployment

Backend:
Railway

Frontend:
Vercel

Environment:

`NEXT_PUBLIC_BE_URL`

points to the Railway backend API.

# Screenshots

Add screenshots:

1. Authentication page
2. PM Task Board
3. Blocked Task State
4. Client Dashboard

# Demo Video

Add video recording link.

Demo flow:

1. Login as PM
2. Show dependency workflow
3. Show blocked task
4. Login as Client
5. Demonstrate data isolation

# Submission

NexusFlow Fullstack Engineer Assessment

Frontend Repository:
https://github.com/publisheddiman/NexusFlow-fullstack-frontend

Backend Repository:
https://github.com/publisheddiman/NexusFlow-fullstack-backend
"""
