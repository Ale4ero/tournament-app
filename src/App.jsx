import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import AdminDashboardPage from './pages/AdminDashboardPage';
import CreateTournamentPage from './pages/CreateTournamentPage';
import ManageBracketPage from './pages/ManageBracketPage';
import TournamentView from './pages/TournamentView';
import MatchPage from './pages/MatchPage';
import OrganizationSetupPage from './pages/OrganizationSetupPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/tournament/:id" element={<TournamentView />} />
          <Route path="/match/:matchId" element={<MatchPage />} />

          {/* Admin Routes */}
          <Route path="/organization/setup" element={<OrganizationSetupPage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/tournament/create" element={<CreateTournamentPage />} />
          <Route path="/tournaments/manage-bracket/:draftId" element={<ManageBracketPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
