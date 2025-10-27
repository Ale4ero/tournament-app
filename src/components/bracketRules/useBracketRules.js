import { useState, useEffect } from 'react';
import { generateDefaultMatchRules, getRoundKey, getRoundName } from '../../utils/bracketGenerator';

/**
 * Custom hook to manage bracket rules for tournament creation
 * @param {number} numTeams - Number of teams in the tournament
 * @param {Object} initialRules - Optional initial rules
 * @returns {Object} Hook state and methods
 */
export default function useBracketRules(numTeams, initialRules = null) {
  const [rules, setRules] = useState({});
  const [rounds, setRounds] = useState([]);
  const [isValid, setIsValid] = useState(true);
  const [errors, setErrors] = useState({});

  // Initialize rules when numTeams changes
  useEffect(() => {
    if (!numTeams || numTeams < 2) {
      setRules({});
      setRounds([]);
      return;
    }

    const numRounds = Math.ceil(Math.log2(numTeams));
    const roundsData = [];

    // Generate rounds metadata
    for (let round = 1; round <= numRounds; round++) {
      const roundKey = getRoundKey(round, numRounds);
      const roundName = getRoundName(round);
      roundsData.push({
        round,
        roundKey,
        roundName,
      });
    }

    setRounds(roundsData);

    // Initialize with provided rules or generate defaults
    if (initialRules) {
      setRules(initialRules);
    } else {
      const defaultRules = generateDefaultMatchRules(numTeams);
      setRules(defaultRules);
    }
  }, [numTeams, initialRules]);

  /**
   * Update rules for a specific round
   * @param {string} roundKey - Round key (e.g., 'finals', 'semifinals')
   * @param {Object} newRules - New rules for the round
   */
  const updateRoundRules = (roundKey, newRules) => {
    setRules((prev) => ({
      ...prev,
      [roundKey]: newRules,
    }));

    // Clear error for this round if it exists
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[roundKey];
      return newErrors;
    });
  };

  /**
   * Validate all rules
   * @returns {boolean} True if all rules are valid
   */
  const validateRules = () => {
    const newErrors = {};
    let valid = true;

    rounds.forEach(({ roundKey }) => {
      const roundRules = rules[roundKey];
      if (!roundRules) {
        newErrors[roundKey] = 'Rules are missing for this round';
        valid = false;
        return;
      }

      // Validate each field
      if (!roundRules.firstTo || roundRules.firstTo < 1) {
        newErrors[roundKey] = 'First To must be at least 1';
        valid = false;
      } else if (!roundRules.winBy || roundRules.winBy < 1) {
        newErrors[roundKey] = 'Win By must be at least 1';
        valid = false;
      } else if (!roundRules.cap || roundRules.cap < roundRules.firstTo) {
        newErrors[roundKey] = 'Score Cap must be greater than or equal to First To';
        valid = false;
      } else if (!roundRules.bestOf || roundRules.bestOf < 1) {
        newErrors[roundKey] = 'Best Of must be at least 1';
        valid = false;
      } else if (roundRules.bestOf % 2 === 0) {
        newErrors[roundKey] = 'Best Of should be an odd number';
        valid = false;
      }
    });

    setErrors(newErrors);
    setIsValid(valid);
    return valid;
  };

  /**
   * Reset rules to defaults
   */
  const resetRules = () => {
    if (numTeams && numTeams >= 2) {
      const defaultRules = generateDefaultMatchRules(numTeams);
      setRules(defaultRules);
      setErrors({});
      setIsValid(true);
    }
  };

  /**
   * Apply template rules to all rounds
   * @param {Object} templateRules - Rules to apply to all rounds
   */
  const applyTemplate = (templateRules) => {
    const newRules = {};
    rounds.forEach(({ roundKey }) => {
      newRules[roundKey] = { ...templateRules };
    });
    setRules(newRules);
    setErrors({});
  };

  /**
   * Copy rules from one round to another
   * @param {string} fromRoundKey - Source round key
   * @param {string} toRoundKey - Destination round key
   */
  const copyRules = (fromRoundKey, toRoundKey) => {
    if (rules[fromRoundKey]) {
      setRules((prev) => ({
        ...prev,
        [toRoundKey]: { ...rules[fromRoundKey] },
      }));
    }
  };

  return {
    rules,
    rounds,
    isValid,
    errors,
    updateRoundRules,
    validateRules,
    resetRules,
    applyTemplate,
    copyRules,
  };
}
