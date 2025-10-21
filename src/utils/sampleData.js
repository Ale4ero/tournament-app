/**
 * Sample data for testing VolleyFlow
 *
 * To use this data:
 * 1. Set up Firebase project
 * 2. Create an admin user in Firebase Auth
 * 3. Add the admin user to the Realtime Database under /users/{uid} with role: 'admin'
 * 4. Use the admin dashboard to create tournaments with the sample teams below
 */

export const sampleTeams = {
  // 4-team tournament
  fourTeams: [
    'Beach Bombers',
    'Spike Squad',
    'Net Ninjas',
    'Volleyball Vikings',
  ],

  // 8-team tournament
  eightTeams: [
    'Beach Bombers',
    'Spike Squad',
    'Net Ninjas',
    'Volleyball Vikings',
    'Sand Sharks',
    'Court Kings',
    'Ace Attackers',
    'Dive Dynasty',
  ],

  // 16-team tournament
  sixteenTeams: [
    'Beach Bombers',
    'Spike Squad',
    'Net Ninjas',
    'Volleyball Vikings',
    'Sand Sharks',
    'Court Kings',
    'Ace Attackers',
    'Dive Dynasty',
    'Serve Stars',
    'Block Busters',
    'Rally Rebels',
    'Set Setters',
    'Dig Masters',
    'Power Hitters',
    'Jump Jets',
    'Volley Victors',
  ],
};

export const sampleTournaments = [
  {
    name: 'Summer Beach Championship 2025',
    description: 'Annual summer beach volleyball tournament featuring the best teams from across the region.',
    type: 'single-elimination',
    seedingType: 'random',
    teams: sampleTeams.eightTeams,
  },
  {
    name: 'Spring Invitational',
    description: 'Competitive spring tournament for local volleyball clubs.',
    type: 'single-elimination',
    seedingType: 'manual',
    teams: sampleTeams.fourTeams,
  },
  {
    name: 'Regional Championship',
    description: 'Large-scale regional tournament with qualifying rounds.',
    type: 'single-elimination',
    seedingType: 'random',
    teams: sampleTeams.sixteenTeams,
  },
];

/**
 * Instructions for setting up Firebase with sample data:
 *
 * 1. Create a Firebase project at https://console.firebase.google.com
 *
 * 2. Enable Firebase Authentication:
 *    - Go to Authentication > Sign-in method
 *    - Enable "Email/Password"
 *    - Add an admin user (e.g., admin@volleyflow.com)
 *
 * 3. Enable Realtime Database:
 *    - Go to Realtime Database > Create Database
 *    - Start in test mode (we'll apply rules later)
 *
 * 4. Add admin user to database:
 *    Go to Realtime Database and manually add:
 *    {
 *      "users": {
 *        "<admin-uid>": {
 *          "email": "admin@volleyflow.com",
 *          "role": "admin",
 *          "createdAt": 1234567890
 *        }
 *      }
 *    }
 *
 * 5. Copy Firebase config to .env.local:
 *    VITE_FIREBASE_API_KEY=...
 *    VITE_FIREBASE_AUTH_DOMAIN=...
 *    VITE_FIREBASE_DATABASE_URL=...
 *    VITE_FIREBASE_PROJECT_ID=...
 *    VITE_FIREBASE_STORAGE_BUCKET=...
 *    VITE_FIREBASE_MESSAGING_SENDER_ID=...
 *    VITE_FIREBASE_APP_ID=...
 *
 * 6. Deploy database rules:
 *    firebase deploy --only database
 *
 * 7. Start the app and login with admin credentials
 *
 * 8. Create tournaments using the sample teams above
 */
