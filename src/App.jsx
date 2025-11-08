import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import AdminDashboardPage from './pages/AdminDashboardPage';
import CreateTournamentPage from './pages/CreateTournamentPage';
import TournamentSetupPage from './pages/TournamentSetupPage';
import TournamentView from './pages/TournamentView';
import MatchPage from './pages/MatchPage';
import ScoreboardPage from './pages/ScoreboardPage';
import OrganizationSetupPage from './pages/OrganizationSetupPage';
import KOBSetupPage from './pages/KOBSetupPage';
import KOBTournamentView from './pages/KOBTournamentView';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/tournament/:id" element={<TournamentView />} />
          <Route path="/tournaments/:tournamentId" element={<KOBTournamentView />} />
          <Route path="/tournaments/:tournamentId/matches/:matchId" element={<MatchPage />} />
          <Route path="/match/:matchId" element={<MatchPage />} />
          <Route path="/match/:matchId/scoreboard" element={<ScoreboardPage />} />

          {/* Admin Routes */}
          <Route path="/organization/setup" element={<OrganizationSetupPage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/tournament/create" element={<CreateTournamentPage />} />
          <Route path="/tournaments/setup/:draftId" element={<TournamentSetupPage />} />
          <Route path="/tournaments/kob-setup/:draftId" element={<KOBSetupPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
