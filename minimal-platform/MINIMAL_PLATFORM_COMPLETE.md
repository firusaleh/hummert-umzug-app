# Minimal Hummert Umzug Platform - Complete

## Overview
A streamlined version of the Hummert Umzug management system with only essential features for managing moves and employees.

## Features Included

### 🔐 Authentication
- User registration and login
- JWT-based authentication
- Protected routes

### 📦 Move Management (Umzüge)
- Create new moves
- List all moves with search and filters
- Edit move details
- Delete moves
- Status tracking (planned, confirmed, in progress, completed, cancelled)

### 👥 Employee Management (Mitarbeiter)
- Add new employees
- List all employees
- Assign employees to moves
- Track employee status (active/inactive)

### 📊 Dashboard
- Quick statistics overview
- Total moves count
- Active employees count
- Pending moves count
- Quick access links

## Tech Stack

### Backend
- Node.js + Express
- MongoDB + Mongoose
- JWT authentication
- Express Validator
- CORS enabled

### Frontend
- React 18
- React Router v6
- Tailwind CSS
- Axios for API calls
- Context API for state management

## Project Structure

```
minimal-platform/
├── backend/
│   ├── controllers/       # Request handlers
│   ├── middleware/        # Auth middleware
│   ├── models/           # Mongoose schemas
│   ├── routes/           # API routes
│   ├── server.js         # Main server file
│   ├── seed.js           # Database seeder
│   └── package.json
├── frontend/
│   ├── public/           # Static files
│   ├── src/
│   │   ├── components/   # Reusable components
│   │   ├── context/      # Auth context
│   │   ├── pages/        # Page components
│   │   ├── services/     # API service
│   │   └── App.js        # Main app component
│   └── package.json
├── start.sh              # Startup script
└── README.md
```

## Quick Start

### 1. Prerequisites
- Node.js 16+
- MongoDB running locally
- npm or yarn

### 2. Setup Backend
```bash
cd minimal-platform/backend
npm install
npm run seed  # Creates admin user and sample data
```

### 3. Setup Frontend
```bash
cd minimal-platform/frontend
npm install
```

### 4. Start Everything
```bash
cd minimal-platform
./start.sh
```

Or manually:
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm start
```

## Default Credentials
- Email: `admin@example.com`
- Password: `admin123`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

### Moves (Umzüge)
- `GET /api/umzuege` - List all moves (with pagination)
- `POST /api/umzuege` - Create new move
- `GET /api/umzuege/:id` - Get single move
- `PUT /api/umzuege/:id` - Update move
- `DELETE /api/umzuege/:id` - Delete move

### Employees (Mitarbeiter)
- `GET /api/mitarbeiter` - List all employees
- `POST /api/mitarbeiter` - Create new employee
- `GET /api/mitarbeiter/:id` - Get single employee

## Environment Variables

Create `.env` file in backend directory:
```env
PORT=5001
MONGODB_URI=mongodb://localhost:27017/hummert-minimal
JWT_SECRET=your-secret-key
```

## Key Features

### 1. Clean Architecture
- Separation of concerns
- MVC pattern
- Reusable components

### 2. Security
- Password hashing with bcrypt
- JWT token authentication
- Protected API routes
- Input validation

### 3. User Experience
- Responsive design
- Loading states
- Error handling
- Form validation

### 4. Developer Experience
- Clear project structure
- ES6+ JavaScript
- Async/await pattern
- Environment configuration

## Customization

### Adding New Features
1. Create model in `backend/models/`
2. Create controller in `backend/controllers/`
3. Add routes in `backend/routes/`
4. Create frontend pages in `frontend/src/pages/`
5. Update navigation in `frontend/src/components/Layout.js`

### Styling
- Tailwind CSS for utility-first styling
- Modify `tailwind.config.js` for customization
- Global styles in `frontend/src/index.css`

## Production Deployment

### Backend
1. Set production environment variables
2. Use PM2 or similar for process management
3. Configure reverse proxy (nginx)

### Frontend
1. Build production bundle: `npm run build`
2. Serve static files via nginx or CDN
3. Configure API URL in environment

## Status
✅ **COMPLETE** - Minimal platform is fully functional with essential features only.