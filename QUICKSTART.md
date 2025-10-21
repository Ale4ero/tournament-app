# VolleyFlow - Quick Start Guide

## 🚀 Get Up and Running in 5 Minutes

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Set Up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a project" or "Add project"
3. Name it "VolleyFlow" (or any name you prefer)
4. Disable Google Analytics (optional)

### Step 3: Enable Firebase Services

**Enable Authentication:**
1. In Firebase Console, go to **Build → Authentication**
2. Click "Get Started"
3. Select "Email/Password" under Sign-in providers
4. Enable it and click "Save"

**Enable Realtime Database:**
1. Go to **Build → Realtime Database**
2. Click "Create Database"
3. Choose a location (e.g., us-central1)
4. Start in **Test Mode** (we'll apply rules later)

### Step 4: Get Firebase Configuration

1. In Firebase Console, click the **gear icon** → Project Settings
2. Scroll down to "Your apps"
3. Click the **</>** (Web) icon
4. Register your app (name it "VolleyFlow Web")
5. Copy the `firebaseConfig` object

### Step 5: Configure Environment Variables

1. Open `.env.local` in the project root
2. Replace the placeholder values with your Firebase config:

```env
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=volleyflow-xxxxx.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://volleyflow-xxxxx-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=volleyflow-xxxxx
VITE_FIREBASE_STORAGE_BUCKET=volleyflow-xxxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:xxxxxxxxxxxxxx
```

### Step 6: Create Admin User

**In Firebase Console:**
1. Go to **Authentication → Users**
2. Click "Add User"
3. Email: `admin@volleyflow.com` (or your email)
4. Password: Choose a strong password
5. Click "Add User"
6. **Copy the User UID** (you'll need it next)

**In Realtime Database:**
1. Go to **Realtime Database → Data**
2. Click on the root node
3. Click **+** to add a child
4. Name: `users`
5. Click **+** on `users` to add a child
6. Name: Paste the **User UID** from step 5
7. Click **+** on that UID to add fields:
   - `email`: `admin@volleyflow.com`
   - `role`: `admin`
   - `createdAt`: `1700000000000` (any timestamp)

Your database should look like:
```
volleyflow-xxxxx
  └── users
      └── AbCdEfGhIjKlMnOpQrStUvWxYz (your UID)
          ├── email: "admin@volleyflow.com"
          ├── role: "admin"
          └── createdAt: 1700000000000
```

### Step 7: Deploy Security Rules

```bash
# Install Firebase CLI if you haven't
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in this project (select Realtime Database + Hosting)
firebase init

# Deploy database rules
firebase deploy --only database
```

### Step 8: Start Development Server

```bash
npm run dev
```

The app will open at `http://localhost:5173`

### Step 9: Test the App

1. **Login as Admin:**
   - Click "Admin Login" in the header
   - Email: `admin@volleyflow.com`
   - Password: (the one you set)

2. **Create a Tournament:**
   - Click "Create Tournament"
   - Name: "Test Tournament"
   - Add teams (one per line, must be 2, 4, 8, or 16 teams):
     ```
     Team A
     Team B
     Team C
     Team D
     ```
   - Click "Create Tournament"

3. **View the Bracket:**
   - You'll see the auto-generated bracket
   - Click on any match to see details

4. **Test Score Submission (as Public User):**
   - Open an **incognito/private window**
   - Go to `http://localhost:5173`
   - Click on the tournament
   - Click on a match
   - Submit a score (no login required!)

5. **Approve Score (as Admin):**
   - Back in your admin window, go to the match page
   - You'll see the pending submission
   - Click "Approve"
   - Watch the bracket update in real-time! 🎉

## 🎯 Next Steps

- Share the tournament link with players/spectators
- They can view brackets and submit scores without logging in
- You approve scores from the admin dashboard
- Winners auto-advance through the bracket

## 🐛 Troubleshooting

**"Permission denied" error:**
- Make sure you deployed database rules: `firebase deploy --only database`
- Verify the admin user has `role: "admin"` in the database

**Can't login:**
- Check that your email/password are correct
- Verify the user exists in Firebase Authentication
- Confirm the user UID matches in `/users/{uid}` in the database

**Environment variables not working:**
- File must be named `.env.local` (not `.env`)
- Restart the dev server after changing `.env.local`

**Teams validation error:**
- Teams must be power of 2: exactly 2, 4, 8, or 16 teams
- Each team on a separate line

## 📚 Learn More

- See `README.md` for full documentation
- See `CLAUDE.md` for architecture details
- Check `src/utils/sampleData.js` for sample teams
