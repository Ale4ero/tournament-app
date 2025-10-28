import { useState } from 'react';
import { useSubmissions } from '../../hooks/useMatches';
import { approveScore, rejectScore } from '../../services/match.service';
import { useAuth } from '../../contexts/AuthContext';
import { formatDateTime } from '../../utils/tournamentStatus';

export default function ScoreApprovalPanel({ match }) {
  const { user } = useAuth();
  const { submissions, loading } = useSubmissions(match.id);
  const [processingId, setProcessingId] = useState(null);

  const handleApprove = async (submissionId) => {
    if (!user) return;

    setProcessingId(submissionId);
    try {
      await approveScore(match.id, submissionId, user.uid);
    } catch (error) {
      console.error('Error approving score:', error);
      alert('Failed to approve score');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (submissionId) => {
    setProcessingId(submissionId);
    try {
      await rejectScore(match.id, submissionId);
    } catch (error) {
      console.error('Error rejecting score:', error);
      alert('Failed to reject score');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return <div className="text-gray-600 text-sm">Loading submissions...</div>;
  }

  if (submissions.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-600">
        No pending score submissions
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Pending Submissions ({submissions.length})</h3>

      {submissions.map((submission) => (
        <div
          key={submission.id}
          className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
        >
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="text-sm text-gray-600">
                Submitted by: <span className="font-medium">{submission.submittedBy}</span>
              </div>
              <div className="text-xs text-gray-500">
                {formatDateTime(submission.submittedAt)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <div className="text-sm text-gray-600">{submission.team1}</div>
              <div className="text-3xl font-bold text-primary-600">{submission.score1}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">{submission.team2}</div>
              <div className="text-3xl font-bold text-primary-600">{submission.score2}</div>
            </div>
          </div>

          {/* Show set-by-set breakdown if available */}
          {submission.setScores && submission.setScores.length > 0 && (
            <div className="mb-4 bg-white rounded-lg p-3">
              <div className="text-xs font-semibold text-gray-700 mb-2">Set Breakdown:</div>
              <div className="space-y-2">
                {submission.setScores.map((set, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Set {set.set || index + 1}</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${set.winner === submission.team1 ? 'text-green-700' : 'text-gray-600'}`}>
                        {set.score1 !== undefined ? set.score1 : '-'}
                      </span>
                      <span className="text-gray-400">-</span>
                      <span className={`font-semibold ${set.winner === submission.team2 ? 'text-green-700' : 'text-gray-600'}`}>
                        {set.score2 !== undefined ? set.score2 : '-'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => handleApprove(submission.id)}
              disabled={processingId === submission.id}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
            >
              {processingId === submission.id ? 'Processing...' : 'Approve'}
            </button>
            <button
              onClick={() => handleReject(submission.id)}
              disabled={processingId === submission.id}
              className="flex-1 btn-danger disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
