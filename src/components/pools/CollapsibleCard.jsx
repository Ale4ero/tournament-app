import { useState } from 'react';

/**
 * CollapsibleCard - Reusable collapsible section component
 */
export default function CollapsibleCard({ title, summary, children, defaultExpanded = false }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex-1 text-left">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          {!isExpanded && summary && (
            <p className="text-sm text-gray-500 mt-1">{summary}</p>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-6 pb-6 border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
}
