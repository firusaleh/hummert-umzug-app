# Minimal Hummert Umzug Platform

This is a minimal working version of the Hummert Umzug management system with only essential features.

## Features Included

### Backend (Node.js + Express + MongoDB)
- User Authentication (Login/Register)
- Basic Umzug (Move) Management (CRUD)
- Simple Employee Management
- JWT-based security

### Frontend (React)
- Login/Register Pages
- Dashboard
- Umzug List and Form
- Employee List
- Responsive design

## Quick Start

### Backend Setup
```bash
cd backend
npm install
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

## Environment Variables
Create `.env` file in backend directory:
```
PORT=5001
MONGODB_URI=mongodb://localhost:27017/hummert-minimal
JWT_SECRET=your-secret-key
```

## API Endpoints
- POST /api/auth/register
- POST /api/auth/login
- GET /api/umzuege
- POST /api/umzuege
- GET /api/umzuege/:id
- PUT /api/umzuege/:id
- DELETE /api/umzuege/:id
- GET /api/mitarbeiter
- POST /api/mitarbeiter