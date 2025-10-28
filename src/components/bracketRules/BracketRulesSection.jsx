import { useState } from 'react';
import RoundRuleCard from './RoundRuleCard';
import { DEFAULT_MATCH_RULES } from '../../utils/constants';

/**
 * BracketRulesSection - Renders bracket rules fields without form wrapper or submit buttons
 * Used for embedding in larger forms
 * @param {Array} rounds - Array of round objects
 * @param {Object} rules - Current rules for all rounds
 * @param {Object} errors - Validation errors
 * @param {Function} onRulesChange - Callback when rules change
 * @param {Function} onApplyTemplate - Callback to apply template
 * @param {Function} onReset - Callback to reset rules
 * @param {boolean} disabled - Whether inputs are disabled
 */
export default function BracketRulesSection({
  rounds,
  rules,
  errors,
  onRulesChange,
  onApplyTemplate,
  onReset,
  disabled = false,
}) {
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const handleApplyTemplate = () => {
    setShowTemplateModal(true);
  };

  const applyTemplateAndClose = (templateRules) => {
    onApplyTemplate(templateRules);
    setShowTemplateModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}

      <h2 className="text-xl font-bold text-gray-900 mb-4">Configure Playoff Match Rules</h2>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleApplyTemplate}
          disabled={disabled}
          className="btn-secondary text-sm"
        >
          Apply Template to All
        </button>
        <button type="button" onClick={onReset} disabled={disabled} className="btn-secondary text-sm">
          Reset to Defaults
        </button>
      </div>

      {/* Round Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {rounds.map(({ roundKey, roundName }) => (
          <div key={roundKey}>
            <RoundRuleCard
              roundName={roundName}
              roundKey={roundKey}
              rules={rules[roundKey] || DEFAULT_MATCH_RULES}
              onRulesChange={onRulesChange}
              disabled={disabled}
            />
            {errors[roundKey] && <div className="mt-2 text-sm text-red-600">{errors[roundKey]}</div>}
          </div>
        ))}
      </div>

      {/* Template Modal */}
      {showTemplateModal && (
        <TemplateModal onApply={applyTemplateAndClose} onClose={() => setShowTemplateModal(false)} />
      )}
    </div>
  );
}

/**
 * TemplateModal - Modal for selecting a template to apply to all rounds
 */
function TemplateModal({ onApply, onClose }) {
  const templates = [
    {
      name: 'Standard Rally (21 points)',
      rules: { firstTo: 21, winBy: 2, cap: 30, bestOf: 3 },
    },
    {
      name: 'Standard Rally (25 points)',
      rules: { firstTo: 25, winBy: 2, cap: 30, bestOf: 3 },
    },
    {
      name: 'Quick Match (15 points)',
      rules: { firstTo: 15, winBy: 2, cap: 20, bestOf: 3 },
    },
    {
      name: 'Tournament Finals (25 points, Best of 5)',
      rules: { firstTo: 25, winBy: 2, cap: 30, bestOf: 5 },
    },
    {
      name: 'Beach Volleyball (21 points)',
      rules: { firstTo: 21, winBy: 2, cap: 30, bestOf: 3 },
    },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">Select a Template</h3>
          <p className="text-gray-600 mt-1">Choose a template to apply to all rounds</p>
        </div>

        <div className="p-6 space-y-3">
          {templates.map((template, index) => (
            <button
              key={index}
              onClick={() => onApply(template.rules)}
              className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-primary-300 transition-colors"
            >
              <div className="font-semibold text-gray-900">{template.name}</div>
              <div className="text-sm text-gray-600 mt-1">
                First to {template.rules.firstTo}, win by {template.rules.winBy}, cap at {template.rules.cap},
                best of {template.rules.bestOf}
              </div>
            </button>
          ))}
        </div>

        <div className="p-6 border-t border-gray-200">
          <button onClick={onClose} className="btn-secondary w-full">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
