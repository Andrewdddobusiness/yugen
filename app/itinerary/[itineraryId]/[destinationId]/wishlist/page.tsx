"use client";

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function WishlistManagementPage() {
  const router = useRouter();
  const { itineraryId, destinationId } = useParams();

  const handleBackToActivities = () => {
    router.push(`/itinerary/${itineraryId}/${destinationId}/activities`);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToActivities}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Activities</span>
            </Button>
            
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Wishlist Feature Coming Soon
              </h1>
              <p className="text-sm text-gray-600">
                This feature is currently under development
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-600">
              The wishlist feature will be available soon. You can save and organize places you want to visit.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}