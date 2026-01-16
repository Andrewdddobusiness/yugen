export type UnsplashImageOptions = {
  width?: number;
  height?: number;
  quality?: number;
  fit?: 'crop' | 'clip' | 'fill' | 'max' | 'min' | 'scale';
  crop?: string;
};

type UnsplashPhotoConfig = {
  photoId: string;
  crop?: string;
};

const UNSPLASH_PHOTOS: Record<string, UnsplashPhotoConfig> = {
  // Previous Paris photo URL 404'd on Unsplash - keep this list to known-good IDs.
  paris: { photoId: 'photo-1508057198894-247b23fe5ade' },
  tokyo: { photoId: 'photo-1540959733332-eab4deabeeaf' },
  london: { photoId: 'photo-1513635269975-59663e0ac1ad' },
  'new-york': { photoId: 'photo-1496442226666-8d4d0e62e6e9' },
  rome: { photoId: 'photo-1552832230-c0197dd311b5' },
  barcelona: { photoId: 'photo-1539037116277-4db20889f2d4' },
  sydney: { photoId: 'photo-1506905925346-21bda4d32df4' },
  dubai: { photoId: 'photo-1512453979798-5ea266f8880c' },
};

const DEFAULT_UNSPLASH_PHOTO: UnsplashPhotoConfig = {
  photoId: 'photo-1499856871958-5b9627545d1a',
  crop: 'faces,entropy',
};

export function normalizeDestinationKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildUnsplashUrl(photoId: string, options: UnsplashImageOptions = {}) {
  const {
    width = 1200,
    height = 800,
    quality = 75,
    fit = 'crop',
    crop,
  } = options;

  const params = new URLSearchParams();
  params.set('w', String(width));
  params.set('h', String(height));
  params.set('fit', fit);
  params.set('auto', 'format');
  params.set('q', String(quality));
  if (crop) params.set('crop', crop);

  return `https://images.unsplash.com/${photoId}?${params.toString()}`;
}

export function getDestinationStockImageUrl(
  destination: { city?: string | null; country?: string | null; id?: string | null },
  options: UnsplashImageOptions = {}
) {
  const key =
    destination.id?.trim() ||
    destination.city?.trim() ||
    destination.country?.trim() ||
    '';

  const normalized = normalizeDestinationKey(key);
  const config = UNSPLASH_PHOTOS[normalized] ?? DEFAULT_UNSPLASH_PHOTO;
  return buildUnsplashUrl(config.photoId, {
    ...options,
    crop: options.crop ?? config.crop,
  });
}
