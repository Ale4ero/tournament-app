import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { formatDateTime } from '../../utils/tournamentStatus';
import { MATCH_STATUS } from '../../utils/constants';
import { getRoundName } from '../../utils/bracketGenerator';
import ScoreSubmissionForm from './ScoreSubmissionForm';
import ScoreApprovalPanel from './ScoreApprovalPanel';
import AdminScoreSubmissionForm from './AdminScoreSubmissionForm';
import EditScoreForm from './EditScoreForm';

export default function MatchDetail({ match, tournament }) {
  const { isAdmin } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  if (!match) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 text-lg">Match not found</p>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const badges = {
      [MATCH_STATUS.UPCOMING]: { class: 'badge-upcoming', text: 'Upcoming' },
      [MATCH_STATUS.LIVE]: { class: 'badge-live', text: 'Live' },
      [MATCH_STATUS.COMPLETED]: { class: 'badge-completed', text: 'Completed' },
    };
    return badges[status] || badges[MATCH_STATUS.UPCOMING];
  };

  const statusBadge = getStatusBadge(match.status);

  return (
    <div className="space-y-6">
      {/* Match Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Match #{match.matchNumber}
            </h1>
            <p className="text-gray-600">{getRoundName(match.round)}</p>
            {tournament && (
              <p className="text-sm text-gray-500 mt-1">{tournament.name}</p>
            )}
          </div>
          <span className={statusBadge.class}>{statusBadge.text}</span>
        </div>

        {/* Score Display */}
        <div className="grid grid-cols-2 gap-8 mt-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">
              {match.team1 || 'TBD'}
            </h2>
            <div
              className={`text-6xl font-bold ${
                match.winner === match.team1 ? 'text-green-600' : 'text-gray-400'
              }`}
            >
              {match.score1 !== null ? match.score1 : '-'}
            </div>
            {match.winner === match.team1 && (
              <div className="mt-2 text-green-600 font-semibold">Winner 🏆</div>
            )}
          </div>

          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">
              {match.team2 || 'TBD'}
            </h2>
            <div
              className={`text-6xl font-bold ${
                match.winner === match.team2 ? 'text-green-600' : 'text-gray-400'
              }`}
            >
              {match.score2 !== null ? match.score2 : '-'}
            </div>
            {match.winner === match.team2 && (
              <div className="mt-2 text-green-600 font-semibold">Winner 🏆</div>
            )}
          </div>
        </div>

        {/* Match Info */}
        {(match.approvedAt || match.submittedAt) && (
          <div className="mt-6 pt-6 border-t border-gray-200 text-sm text-gray-600">
            {match.approvedAt && (
              <p>Approved: {formatDateTime(match.approvedAt)}</p>
            )}
            {match.submittedAt && !match.approvedAt && (
              <p>Submitted: {formatDateTime(match.submittedAt)}</p>
            )}
          </div>
        )}

        {/* Admin Edit Button */}
        {isAdmin && match.status === MATCH_STATUS.COMPLETED && !isEditing && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={() => setIsEditing(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Edit Score
            </button>
          </div>
        )}
      </div>

      {/* Admin Edit Form */}
      {isAdmin && isEditing && match.status === MATCH_STATUS.COMPLETED && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <EditScoreForm match={match} onCancel={() => setIsEditing(false)} />
        </div>
      )}

      {/* Admin Panel */}
      {isAdmin && match.status !== MATCH_STATUS.COMPLETED && (
        <>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <AdminScoreSubmissionForm match={match} />
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <ScoreApprovalPanel match={match} />
          </div>
        </>
      )}

      {/* Public Score Submission */}
      {!isAdmin && (
        <ScoreSubmissionForm match={match} />
      )}

      {/* Next Match Info */}
      {match.nextMatchId && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <span className="font-medium">Next Match:</span> Winner advances to Match #
            {match.nextMatchId.split('_m')[1]}
          </p>
        </div>
      )}
    </div>
  );
}
