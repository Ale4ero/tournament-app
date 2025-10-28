import { formatDateTime } from '../../utils/tournamentStatus';
import { SUBMISSION_STATUS } from '../../utils/constants';

export default function SubmissionHistory({ submissions }) {
  const getStatusBadge = (status) => {
    switch (status) {
      case SUBMISSION_STATUS.PENDING:
        return <span className="badge-upcoming">Pending</span>;
      case SUBMISSION_STATUS.APPROVED:
        return <span className="badge-completed">Approved</span>;
      case SUBMISSION_STATUS.REJECTED:
        return <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">Rejected</span>;
      default:
        return <span className="badge-upcoming">{status}</span>;
    }
  };

  if (submissions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-700">Submitted Scores</h4>

      {submissions.map((submission) => (
        <div
          key={submission.id}
          className="bg-gray-50 border border-gray-200 rounded-lg p-4"
        >
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1">
              <div className="text-sm text-gray-600">
                Submitted by: <span className="font-medium">{submission.submittedBy}</span>
              </div>
              <div className="text-xs text-gray-500">
                {formatDateTime(submission.submittedAt)}
              </div>
            </div>
            {getStatusBadge(submission.status)}
          </div>

          <div className="grid grid-cols-2 gap-4 mt-3">
            <div className="text-center">
              <div className="text-xs text-gray-600">{submission.team1}</div>
              <div className="text-2xl font-bold text-gray-800">{submission.score1}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600">{submission.team2}</div>
              <div className="text-2xl font-bold text-gray-800">{submission.score2}</div>
            </div>
          </div>

          {/* Show set-by-set breakdown if available */}
          {submission.setScores && submission.setScores.length > 0 && (
            <div className="mt-3 bg-white rounded-lg p-3 border border-gray-200">
              <div className="text-xs font-semibold text-gray-700 mb-2">Set Breakdown:</div>
              <div className="space-y-1">
                {submission.setScores.map((set, index) => (
                  <div key={index} className="flex justify-between items-center text-xs">
                    <span className="text-gray-600">Set {set.set}</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${set.winner === submission.team1 ? 'text-green-700' : 'text-gray-600'}`}>
                        {set.score1}
                      </span>
                      <span className="text-gray-400">-</span>
                      <span className={`font-medium ${set.winner === submission.team2 ? 'text-green-700' : 'text-gray-600'}`}>
                        {set.score2}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
