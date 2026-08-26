// Path: src/tests/test_matching.js
import { CareBridgeMatchingEngine } from '../services/matchingEngine.js';
import assert from 'assert';

console.log('Running CareBridge Smart Matching unit tests...');

const engine = new CareBridgeMatchingEngine();

const request = {
  requestId: 'req-elder-88',
  requiredWeeklyHours: 40.0,
  overtimeHours: 5.0,
  strictNoSeverance: false
};

const candidates = [
  {
    id: 'worker-kim',
    name: 'Kim Ji-young',
    isCertified: true,
    expectedMonthlyWage: 3000000,
    employmentStartDate: '2024-01-01',
    baseHourlyRate: 18000,
    distanceKm: 2.5,
    rating: 4.9,
    yearsOfExperience: 5
  },
  {
    id: 'worker-lee',
    name: 'Lee Min-su',
    isCertified: false, // Uncertified - should be disqualified
    expectedMonthlyWage: 2800000,
    employmentStartDate: '2024-06-01',
    baseHourlyRate: 16000,
    distanceKm: 1.0,
    rating: 4.2,
    yearsOfExperience: 1
  }
];

const result = engine.matchCaregiver(request, candidates);

assert.strictEqual(result.requestId, 'req-elder-88');
assert.ok(result.bestMatch, 'Should find a valid eligible best match');
assert.strictEqual(result.bestMatch.caregiverId, 'worker-kim', 'Kim Ji-young should be top match due to certification and experience');
assert.strictEqual(result.allRankedCandidates.length, 2);

console.log('✅ CareBridge Smart Matching tests passed successfully!');
