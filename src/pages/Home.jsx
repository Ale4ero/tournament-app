import Layout from '../components/layout/Layout';
import TournamentList from '../components/tournament/TournamentList';

export default function Home() {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">VolleyFlow Tournaments</h1>
          <p className="text-gray-600">
            Real-time volleyball tournament management - View live brackets and submit scores
          </p>
        </div>

        <TournamentList />
      </div>
    </Layout>
  );
}
