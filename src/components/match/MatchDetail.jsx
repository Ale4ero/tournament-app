import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { formatDateTime } from '../../utils/tournamentStatus';
import { MATCH_STATUS } from '../../utils/constants';
import { getRoundName } from '../../utils/bracketGenerator';
import ScoreApprovalPanel from './ScoreApprovalPanel';
import AdminScoreSubmissionForm from './AdminScoreSubmissionForm';
import EditScoreForm from './EditScoreForm';
import EditMatchRulesForm from './EditMatchRulesForm';

export default function MatchDetail({ match, tournament }) {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingRules, setIsEditingRules] = useState(false);

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

        {/* Set Breakdown (if available) */}
        {match.setScores && match.setScores.length > 0 && (
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Set-by-Set Results</h3>
            <div className="space-y-2">
              {match.setScores.map((set, index) => (
                <div key={index} className="flex items-center justify-between bg-white rounded-lg p-3">
                  <div>
                    <span className="font-semibold text-gray-900">Set {set.set}</span>
                    <span className="text-sm text-gray-600 ml-2">({set.winner} wins)</span>
                  </div>
                  <div className="text-lg font-bold space-x-2">
                    <span className={set.winner === match.team1 ? 'text-green-600' : 'text-gray-600'}>
                      {set.score1}
                    </span>
                    <span className="text-gray-400">-</span>
                    <span className={set.winner === match.team2 ? 'text-green-600' : 'text-gray-600'}>
                      {set.score2}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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

        {/* Match Rules */}
        {match.rules && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Match Rules</h3>
              {isAdmin && !isEditingRules && (
                <button
                  onClick={() => setIsEditingRules(true)}
                  disabled={match.status === MATCH_STATUS.COMPLETED}
                  className={`text-sm font-medium ${
                    match.status === MATCH_STATUS.COMPLETED
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-blue-600 hover:text-blue-700'
                  }`}
                  title={
                    match.status === MATCH_STATUS.COMPLETED
                      ? 'Cannot edit rules for completed matches'
                      : 'Edit match rules'
                  }
                >
                  Edit Rules
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">First To</p>
                <p className="text-lg font-bold text-gray-900">{match.rules.firstTo}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Win By</p>
                <p className="text-lg font-bold text-gray-900">{match.rules.winBy}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Score Cap</p>
                <p className="text-lg font-bold text-gray-900">{match.rules.cap}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Best Of</p>
                <p className="text-lg font-bold text-gray-900">{match.rules.bestOf}</p>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-3">
              Best of {match.rules.bestOf} sets. First to {match.rules.firstTo} points,
              must win by {match.rules.winBy}, capped at {match.rules.cap}.
            </p>
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

      {/* Edit Match Rules Form */}
      {isAdmin && isEditingRules && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <EditMatchRulesForm
            match={match}
            onCancel={() => setIsEditingRules(false)}
            onSuccess={() => setIsEditingRules(false)}
          />
        </div>
      )}

      {/* Interactive Scoreboard - Available for ALL users */}
      {match.status !== MATCH_STATUS.COMPLETED && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg shadow-sm p-6 text-white">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold mb-2">Interactive Scoreboard</h3>
              <p className="text-green-50 text-sm">
                Launch the live scoreboard to track points in real-time during the match
              </p>
            </div>
            <button
              onClick={() => navigate(`/match/${match.id}/scoreboard`)}
              className="bg-white text-green-600 hover:bg-green-50 font-bold py-3 px-6 rounded-lg transition-colors shadow-lg flex items-center gap-2 whitespace-nowrap"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              Referee Match
            </button>
          </div>
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
