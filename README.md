# VolleyFlow 🏐

A real-time volleyball tournament management web application built with React, Firebase, and TailwindCSS.

## Features

- **Real-time Tournament Brackets**: Live updates using Firebase Realtime Database
- **Public Score Submission**: Anyone can submit scores without authentication
- **Admin Approval Workflow**: Admins review and approve scores before they're official
- **Auto-Advancing Brackets**: Winners automatically advance to the next round
- **Mobile-Optimized**: Fully responsive design for all devices
- **Single Elimination**: Support for power-of-2 team tournaments (4, 8, 16 teams)

## Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: TailwindCSS
- **Backend**: Firebase Realtime Database
- **Authentication**: Firebase Auth (Admin only)
- **Hosting**: Firebase Hosting
- **Routing**: React Router v6

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- Firebase account

### Installation

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd tournament-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up Firebase:
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable **Authentication** with Email/Password provider
   - Enable **Realtime Database**
   - Copy your Firebase config

4. Configure environment variables:
   - Copy `.env.local` and fill in your Firebase credentials:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_domain
   VITE_FIREBASE_DATABASE_URL=your_database_url
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

5. Create an admin user:
   - Go to Firebase Console > Authentication
   - Add a user (e.g., `admin@volleyflow.com`)
   - Go to Realtime Database and add:
   ```json
   {
     "users": {
       "<uid-from-auth>": {
         "email": "admin@volleyflow.com",
         "role": "admin",
         "createdAt": 1234567890
       }
     }
   }
   ```

6. Deploy database security rules:
   ```bash
   firebase deploy --only database
   ```

7. Start the development server:
   ```bash
   npm run dev
   ```

## Usage

### For Admins

1. Login at `/login` with admin credentials
2. Create tournaments from the admin dashboard
3. Enter team names (must be power of 2: 4, 8, 16, etc.)
4. Monitor pending score submissions
5. Approve or reject scores as they come in

### For Public Users

1. Browse tournaments on the home page
2. View live brackets and match details
3. Submit scores for any match (no login required)
4. Wait for admin approval

## Project Structure

```
src/
├── components/       # React components
│   ├── admin/       # Admin dashboard components
│   ├── auth/        # Login components
│   ├── bracket/     # Bracket view components
│   ├── layout/      # Header, footer, layout
│   ├── match/       # Match detail, score submission
│   └── tournament/  # Tournament list, cards, forms
├── contexts/        # React contexts (Auth)
├── hooks/           # Custom React hooks
├── pages/           # Page components
├── services/        # Firebase service layer
├── utils/           # Utility functions
└── App.jsx          # Main app with routing
```

## Deployment

1. Build the production app:
   ```bash
   npm run build
   ```

2. Deploy to Firebase Hosting:
   ```bash
   firebase deploy
   ```

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
