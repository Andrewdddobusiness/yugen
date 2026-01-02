# Google Maps Setup Guide

To enable map functionality in the application, you need to configure Google Maps API credentials.

## Prerequisites

1. A Google Cloud Platform (GCP) account
2. Billing enabled on your GCP project
3. Google Maps JavaScript API enabled

## Step-by-Step Setup

### 1. Create a Google Cloud Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable billing for the project

### 2. Enable Required APIs
Navigate to the [API Library](https://console.cloud.google.com/apis/library) and enable:
- **Maps JavaScript API** (required for map display)
- **Places API (New)** (required for location search via `places.googleapis.com`)
- **Geocoding API** (optional, for address lookups)
- **Routes API** (required for road-following route lines and travel times)

Note: Google is moving features off legacy endpoints. If you see `LegacyApiNotActivatedMapError` for Directions/Distance Matrix, enable and use **Routes API** instead.

### 3. Create API Credentials
1. Go to [Credentials](https://console.cloud.google.com/apis/credentials)
2. Click "Create Credentials" → "API key"
3. Copy the generated API key
4. **Important:** Restrict the API key:
   - Click on the key to edit it
   - Under "API restrictions", select "Restrict key"
   - Choose the APIs you enabled above

Recommended: create two keys
- **Browser key** (used by the Maps JavaScript API): restrict by HTTP referrers (e.g. `http://localhost:3000/*`, your production domain) and restrict APIs to **Maps JavaScript API**.
- **Server key** (used by server actions for Places/Routes): restrict APIs to **Places API (New)** / **Routes API** / **Geocoding API**. Use IP restrictions only if you have stable egress IPs; otherwise leave application restrictions unset.

### 4. Create a Map ID (Required for Advanced Features)
1. Go to [Map Management](https://console.cloud.google.com/google/maps-apis/map-ids)
2. Click "Create Map ID"
3. Choose "JavaScript" as the map type
4. Give it a name (e.g., "Yugi Travel Planner")
5. Copy the Map ID

### 5. Configure Environment Variables
Add the following to your `.env` / `.env.local` file:

```env
# Google Maps Configuration
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-api-key-here
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=your-map-id-here

# Server-only key for Routes API (recommended)
GOOGLE_ROUTES_API_KEY=your-server-routes-api-key
```

**Important Notes:**
- Replace `your-api-key-here` with your actual API key
- Replace `your-map-id-here` with your actual Map ID
- Never commit these values to version control
- Use different keys for development and production

## Troubleshooting

### Debugging Routes/Travel Times
To see detailed logs for the road routes and travel-time requests:

1. Add to your `.env` / `.env.local`:
   - `GOOGLE_ROUTES_DEBUG=1`
   - Optional (verbose point lists): `GOOGLE_ROUTES_DEBUG_VERBOSE=1`
2. Restart the dev server: `pnpm run dev`
3. Click “Travel times” / show routes and watch the server terminal logs:
   - `[routes] ...` for waypoint route polylines
   - `[travel] ...` for travel-time requests

To see client-side logs in the browser console:
- Set `NEXT_PUBLIC_GOOGLE_ROUTES_DEBUG=1` (requires a dev server restart), or
- Run `localStorage.setItem("debug:routes","1")` in DevTools (no restart).

### Map Shows Gray/Blank Area
- **Check API Key**: Ensure the API key is valid and properly configured
- **Check Map ID**: Ensure the Map ID is valid and properly configured
- **Check API Restrictions**: Make sure your domain is allowed
- **Check Browser Console**: Look for specific Google Maps error messages

### Common Error Messages
- `"This page can't load Google Maps correctly"` - Usually an API key or billing issue
- `"Map initialization failed"` - Check if the Map ID is valid
- `"InvalidKeyMapError"` - API key is invalid or restricted
- `"RefererNotAllowedMapError"` - Domain not allowed in API key restrictions

### API Usage and Costs
- Google Maps has a free tier with monthly credits
- Monitor usage in the [Google Cloud Console](https://console.cloud.google.com/billing)
- Set up billing alerts to avoid unexpected charges

## Development vs Production

### Development Setup
```env
# Development - Less restrictive for localhost
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=dev-key-with-localhost-restrictions
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=dev-map-id
```

### Production Setup
```env
# Production - Restricted to your domain
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=prod-key-with-domain-restrictions
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=prod-map-id
```

## Security Best Practices

1. **Always restrict API keys** - Don't use unrestricted keys
2. **Use different keys for different environments**
3. **Monitor API usage regularly**
4. **Set up billing alerts**
5. **Rotate keys periodically**
6. **Never expose keys in client-side code** (these are public by nature but should be restricted)

## Testing the Setup

After configuration:
1. Start your development server: `npm run dev`
2. Navigate to the itinerary builder
3. Click "Show Map"
4. You should see the map load with any activities that have coordinates

If you see error messages instead of a gray area, the component will show specific instructions about what's missing.
