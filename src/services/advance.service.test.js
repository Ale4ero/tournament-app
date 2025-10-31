/**
 * advance.service.test.js
 *
 * Simple test cases for advance service core algorithms
 * Run in browser console or Node.js to verify correctness
 */

import {
  lowerPowerOfTwo,
  higherPowerOfTwo,
  suggestPlayoffFormat,
  buildSeeds,
  pairSeedsForRound,
  TEST_CASES,
} from './advance.service';

/**
 * Test runner
 */
export function runAdvanceServiceTests() {
  console.log('🧪 Running Advance Service Tests...\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Power of 2 helpers
  console.log('Test 1: Power of 2 Helpers');
  const powerTests = [
    { input: 10, lower: 8, higher: 16 },
    { input: 8, lower: 8, higher: 8 },
    { input: 12, lower: 8, higher: 16 },
    { input: 9, lower: 8, higher: 16 },
    { input: 16, lower: 16, higher: 16 },
  ];

  powerTests.forEach(({ input, lower, higher }) => {
    const actualLower = lowerPowerOfTwo(input);
    const actualHigher = higherPowerOfTwo(input);
    if (actualLower === lower && actualHigher === higher) {
      console.log(`  ✅ ${input} → lower=${lower}, higher=${higher}`);
      passed++;
    } else {
      console.log(`  ❌ ${input} → expected lower=${lower}, higher=${higher}, got lower=${actualLower}, higher=${actualHigher}`);
      failed++;
    }
  });

  console.log('');

  // Test 2: Suggestion logic (10, 12, 9 teams)
  console.log('Test 2: Suggestion Logic');
  Object.entries(TEST_CASES).forEach(([name, { input, expected }]) => {
    const result = suggestPlayoffFormat(input);
    const match =
      result.suggestion === expected.suggestion &&
      result.byes === expected.byes &&
      result.playIns === expected.playIns &&
      result.lower === expected.lower &&
      result.higher === expected.higher;

    if (match) {
      console.log(`  ✅ ${name}: ${input} teams → ${result.suggestion} (byes=${result.byes}, playIns=${result.playIns})`);
      passed++;
    } else {
      console.log(`  ❌ ${name}: Expected ${JSON.stringify(expected)}, got ${JSON.stringify(result)}`);
      failed++;
    }
  });

  console.log('');

  // Test 3: Build seeds
  console.log('Test 3: Build Seeds');
  const mockStandings = [
    { teamId: 't1', teamName: 'Team A', rank: 1 },
    { teamId: 't2', teamName: 'Team B', rank: 2 },
    { teamId: 't3', teamName: 'Team C', rank: 3 },
    { teamId: 't4', teamName: 'Team D', rank: 4 },
  ];

  const seeds = buildSeeds(mockStandings);
  if (
    seeds.length === 4 &&
    seeds[0].seed === 1 &&
    seeds[0].teamName === 'Team A' &&
    seeds[3].seed === 4 &&
    seeds[3].teamName === 'Team D'
  ) {
    console.log(`  ✅ Build seeds: 4 teams correctly seeded`);
    passed++;
  } else {
    console.log(`  ❌ Build seeds: Unexpected result ${JSON.stringify(seeds)}`);
    failed++;
  }

  console.log('');

  // Test 4: Pair seeds for round
  console.log('Test 4: Pair Seeds for Round');
  const mockSeeds = [
    { seed: 1, teamName: 'Team A' },
    { seed: 2, teamName: 'Team B' },
    { seed: 3, teamName: 'Team C' },
    { seed: 4, teamName: 'Team D' },
  ];

  const pairs = pairSeedsForRound(mockSeeds);
  if (
    pairs.length === 2 &&
    pairs[0][0].seed === 1 &&
    pairs[0][1].seed === 4 &&
    pairs[1][0].seed === 2 &&
    pairs[1][1].seed === 3
  ) {
    console.log(`  ✅ Pair seeds: [[1,4], [2,3]]`);
    passed++;
  } else {
    console.log(`  ❌ Pair seeds: Unexpected result ${JSON.stringify(pairs)}`);
    failed++;
  }

  console.log('');

  // Summary
  console.log('📊 Test Summary');
  console.log(`  Total: ${passed + failed}`);
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log('\n⚠️ Some tests failed. Please review.');
  }

  return { passed, failed };
}

// Auto-run if in browser console
if (typeof window !== 'undefined') {
  console.log('To run tests, call: runAdvanceServiceTests()');
}
