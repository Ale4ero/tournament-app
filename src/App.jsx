import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import AdminDashboardPage from './pages/AdminDashboardPage';
import CreateTournamentPage from './pages/CreateTournamentPage';
import TournamentView from './pages/TournamentView';
import MatchPage from './pages/MatchPage';

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
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/tournament/create" element={<CreateTournamentPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
