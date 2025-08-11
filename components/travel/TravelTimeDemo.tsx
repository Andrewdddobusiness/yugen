"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TravelTimeIndicator } from './TravelTimeIndicator';
import { runAllTravelTimeTests, TEST_COORDINATES } from '@/utils/travel/travelTimeTest';
import { Loader2, Play } from 'lucide-react';

/**
 * Demo component for testing travel time functionality
 * This component is only for development and testing purposes
 */
export function TravelTimeDemo() {
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  const runTests = async () => {
    setIsRunningTests(true);
    setTestResults(null);
    
    try {
      const results = await runAllTravelTimeTests();
      setTestResults(results);
    } catch (error) {
      console.error('Test error:', error);
    } finally {
      setIsRunningTests(false);
    }
  };

  const coordinatePairs = [
    {
      from: [TEST_COORDINATES.timesSquare.lat, TEST_COORDINATES.timesSquare.lng] as [number, number],
      to: [TEST_COORDINATES.centralPark.lat, TEST_COORDINATES.centralPark.lng] as [number, number],
      fromName: "Times Square",
      toName: "Central Park"
    },
    {
      from: [TEST_COORDINATES.centralPark.lat, TEST_COORDINATES.centralPark.lng] as [number, number],
      to: [TEST_COORDINATES.empireStateBuilding.lat, TEST_COORDINATES.empireStateBuilding.lng] as [number, number],
      fromName: "Central Park",
      toName: "Empire State Building"
    },
    {
      from: [TEST_COORDINATES.empireStateBuilding.lat, TEST_COORDINATES.empireStateBuilding.lng] as [number, number],
      to: [TEST_COORDINATES.brooklynBridge.lat, TEST_COORDINATES.brooklynBridge.lng] as [number, number],
      fromName: "Empire State Building",
      toName: "Brooklyn Bridge"
    }
  ];

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Travel Time System Demo</CardTitle>
          <p className="text-sm text-gray-600">
            This demo shows the travel time calculation system in action using famous NYC landmarks.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={runTests} 
            disabled={isRunningTests}
            className="w-full sm:w-auto"
          >
            {isRunningTests ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Travel Time Tests
              </>
            )}
          </Button>

          {testResults && (
            <div className="bg-gray-50 rounded-lg p-4 text-sm font-mono">
              <h4 className="font-semibold mb-2">Test Results:</h4>
              <div className="space-y-1">
                <div>Basic Test: {testResults.basicTest ? '✅ Passed' : '❌ Failed'}</div>
                <div>Batch Test: {testResults.batchTest ? '✅ Passed' : '❌ Failed'}</div>
                <div>Cache Test: {testResults.cacheTest ? '✅ Passed' : '❌ Failed'}</div>
                <div>Error Test: {testResults.errorTest ? '✅ Passed' : '❌ Failed'}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Travel Time Examples</h2>
        {coordinatePairs.map((pair, index) => (
          <TravelTimeIndicator
            key={index}
            fromCoordinates={pair.from}
            toCoordinates={pair.to}
            fromName={pair.fromName}
            toName={pair.toName}
            showAllModes={true}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compact View Examples</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {coordinatePairs.slice(0, 2).map((pair, index) => (
            <TravelTimeIndicator
              key={`compact-${index}`}
              fromCoordinates={pair.from}
              toCoordinates={pair.to}
              fromName={pair.fromName}
              toName={pair.toName}
              compact={true}
            />
          ))}
        </CardContent>
      </Card>

      <div className="text-xs text-gray-500 bg-yellow-50 p-3 rounded">
        <strong>Note:</strong> This demo component is for development and testing only. 
        It uses real API calls to Google Maps, so use sparingly to avoid hitting rate limits.
        The test coordinates are famous NYC landmarks chosen for reliable results.
      </div>
    </div>
  );
}

export default TravelTimeDemo;