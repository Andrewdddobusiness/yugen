"use client";

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Share2, Settings } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

import WishlistPanel from '@/components/wishlist/WishlistPanel';
import { useWishlistStore } from '@/store/wishlistStore';

export default function WishlistManagementPage() {
  const router = useRouter();
  const { itineraryId, destinationId } = useParams();
  const { getWishlistCount } = useWishlistStore();

  const wishlistCount = getWishlistCount();

  const handleBackToActivities = () => {
    router.push(`/itinerary/${itineraryId}/${destinationId}/activities`);
  };

  const handleExport = () => {
    // This would implement export functionality
    console.log('Export wishlist');
  };

  const handleShare = () => {
    // This would implement sharing functionality
    console.log('Share wishlist');
  };

  const handleSettings = () => {
    // This would open wishlist settings
    console.log('Wishlist settings');
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
            
            <Separator orientation="vertical" className="h-6" />
            
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Wishlist Management
              </h1>
              <p className="text-sm text-gray-600">
                {wishlistCount} place{wishlistCount !== 1 ? 's' : ''} saved
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="flex items-center space-x-2"
            >
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleSettings}
              className="flex items-center space-x-2"
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <WishlistPanel 
            className="h-[calc(100vh-200px)] border shadow-sm"
            onPlaceSelect={(item) => {
              // Handle place selection - could open detail modal
              console.log('Selected wishlist item:', item);
            }}
          />
        </div>
      </div>
    </div>
  );
}