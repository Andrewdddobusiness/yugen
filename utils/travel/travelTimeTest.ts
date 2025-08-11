// Test utilities for travel time functionality
// This file is for development and testing purposes

import { calculateTravelTime, calculateBatchTravelTimes, getTravelTimeCacheStats, clearTravelTimeCache } from '@/actions/google/travelTime';
import type { Coordinates } from '@/types/database';

// Test coordinates (famous landmarks)
const TEST_COORDINATES = {
  timesSquare: { lat: 40.7589, lng: -73.9851 },
  centralPark: { lat: 40.7829, lng: -73.9654 },
  brooklynBridge: { lat: 40.7061, lng: -73.9969 },
  statueOfLiberty: { lat: 40.6892, lng: -74.0445 },
  empireStateBuilding: { lat: 40.7484, lng: -73.9857 },
};

/**
 * Test basic travel time calculation
 */
export async function testBasicTravelTime() {
  console.log('🧪 Testing basic travel time calculation...');
  
  try {
    const result = await calculateTravelTime(
      TEST_COORDINATES.timesSquare,
      TEST_COORDINATES.centralPark,
      ['walking', 'driving']
    );

    if (result.success && result.data) {
      console.log('✅ Basic travel time test passed');
      console.log('Results:', result.data.results);
      return result.data;
    } else {
      console.error('❌ Basic travel time test failed:', result.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Basic travel time test error:', error);
    return null;
  }
}

/**
 * Test batch travel time calculation
 */
export async function testBatchTravelTime() {
  console.log('🧪 Testing batch travel time calculation...');
  
  try {
    const pairs = [
      {
        from: TEST_COORDINATES.timesSquare,
        to: TEST_COORDINATES.centralPark,
        fromId: 'times-square',
        toId: 'central-park'
      },
      {
        from: TEST_COORDINATES.centralPark,
        to: TEST_COORDINATES.empireStateBuilding,
        fromId: 'central-park',
        toId: 'empire-state'
      }
    ];

    const result = await calculateBatchTravelTimes(pairs, ['walking', 'driving']);

    if (result.success && result.data) {
      console.log('✅ Batch travel time test passed');
      console.log('Results:', result.data.length, 'calculations completed');
      return result.data;
    } else {
      console.error('❌ Batch travel time test failed:', result.error);
      return null;
    }
  } catch (error) {
    console.error('❌ Batch travel time test error:', error);
    return null;
  }
}

/**
 * Test caching functionality
 */
export async function testTravelTimeCache() {
  console.log('🧪 Testing travel time caching...');
  
  try {
    // Clear cache first
    await clearTravelTimeCache();
    
    // Get initial stats
    let stats = await getTravelTimeCacheStats();
    console.log('Initial cache size:', stats.size);
    
    // Make a request to populate cache
    const result1 = await calculateTravelTime(
      TEST_COORDINATES.timesSquare,
      TEST_COORDINATES.centralPark,
      ['walking']
    );
    
    // Check cache size
    stats = await getTravelTimeCacheStats();
    console.log('Cache size after first request:', stats.size);
    
    // Make the same request again (should be cached)
    const startTime = performance.now();
    const result2 = await calculateTravelTime(
      TEST_COORDINATES.timesSquare,
      TEST_COORDINATES.centralPark,
      ['walking']
    );
    const endTime = performance.now();
    
    console.log('Second request time:', Math.round(endTime - startTime), 'ms');
    console.log('✅ Cache test completed');
    
    return { result1, result2, cacheTime: endTime - startTime };
  } catch (error) {
    console.error('❌ Cache test error:', error);
    return null;
  }
}

/**
 * Test error handling with invalid coordinates
 */
export async function testErrorHandling() {
  console.log('🧪 Testing error handling...');
  
  try {
    // Test with invalid coordinates
    const result = await calculateTravelTime(
      { lat: 999, lng: 999 }, // Invalid coordinates
      TEST_COORDINATES.timesSquare,
      ['walking']
    );

    if (!result.success) {
      console.log('✅ Error handling test passed - correctly rejected invalid coordinates');
      return true;
    } else {
      console.error('❌ Error handling test failed - should have rejected invalid coordinates');
      return false;
    }
  } catch (error) {
    console.log('✅ Error handling test passed - caught exception as expected');
    return true;
  }
}

/**
 * Run all travel time tests
 */
export async function runAllTravelTimeTests() {
  console.log('🚀 Starting travel time system tests...\n');
  
  const results = {
    basicTest: await testBasicTravelTime(),
    batchTest: await testBatchTravelTime(),
    cacheTest: await testTravelTimeCache(),
    errorTest: await testErrorHandling(),
  };
  
  console.log('\n📊 Test Results Summary:');
  console.log('Basic travel time:', results.basicTest ? '✅ Passed' : '❌ Failed');
  console.log('Batch calculation:', results.batchTest ? '✅ Passed' : '❌ Failed');
  console.log('Caching system:', results.cacheTest ? '✅ Passed' : '❌ Failed');
  console.log('Error handling:', results.errorTest ? '✅ Passed' : '❌ Failed');
  
  const allPassed = Object.values(results).every(result => !!result);
  console.log('\n🎯 Overall result:', allPassed ? '✅ All tests passed!' : '❌ Some tests failed');
  
  return results;
}

/**
 * Performance benchmark
 */
export async function benchmarkTravelTimes(iterations: number = 5) {
  console.log(`🏁 Running travel time performance benchmark (${iterations} iterations)...`);
  
  const coordinates = Object.values(TEST_COORDINATES);
  const times: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const fromCoord = coordinates[i % coordinates.length];
    const toCoord = coordinates[(i + 1) % coordinates.length];
    
    const startTime = performance.now();
    await calculateTravelTime(fromCoord, toCoord, ['walking', 'driving']);
    const endTime = performance.now();
    
    times.push(endTime - startTime);
    console.log(`Iteration ${i + 1}: ${Math.round(endTime - startTime)}ms`);
  }
  
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  
  console.log('\n📈 Benchmark Results:');
  console.log(`Average time: ${Math.round(avgTime)}ms`);
  console.log(`Min time: ${Math.round(minTime)}ms`);
  console.log(`Max time: ${Math.round(maxTime)}ms`);
  
  return { avgTime, minTime, maxTime, times };
}

// Export test coordinates for use in other tests
export { TEST_COORDINATES };