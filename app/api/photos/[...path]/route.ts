import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const photoPath = params.path.join('/');
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const maxHeightPx = searchParams.get('maxHeightPx') || '1000';
    const maxWidthPx = searchParams.get('maxWidthPx') || '1000';
    
    // Construct the Google Places API URL
    const apiUrl = `https://places.googleapis.com/v1/${photoPath}/media`;
    const apiParams = new URLSearchParams({
      maxHeightPx,
      maxWidthPx,
      key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!
    });

    // Fetch from Google Places API with proper headers
    const response = await fetch(`${apiUrl}?${apiParams}`, {
      headers: {
        'X-Goog-Api-Key': process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
        'Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      },
    });

    if (!response.ok) {
      console.error('Google Places photo fetch failed:', {
        status: response.status,
        statusText: response.statusText,
        photoPath,
      });
      
      // Return a placeholder or error response
      return new NextResponse('Photo not available', { status: 404 });
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // Return the image with proper headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
      },
    });

  } catch (error) {
    console.error('Error proxying Google Places photo:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}