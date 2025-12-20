import { IItineraryActivity } from '@/store/itineraryActivityStore';

interface ShareableItinerary {
  id?: string;
  city: string;
  country: string;
  fromDate: Date;
  toDate: Date;
  activities: IItineraryActivity[];
  itineraryName?: string;
  createdBy?: string;
  notes?: string;
}

interface ShareOptions {
  includePersonalNotes: boolean;
  includeContactInfo: boolean;
  allowEditing: boolean;
  expirationDays?: number;
  password?: string;
  publicView: boolean;
  format?: 'web' | 'pdf' | 'excel' | 'google_maps' | 'calendar' | 'text' | 'mobile';
}

interface ShareableLink {
  id: string;
  url: string;
  shortUrl: string;
  qrCode: string;
  expiresAt?: Date;
  viewCount: number;
  createdAt: Date;
}

export class ShareableLinkGenerator {
  private static readonly BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';
  private static readonly SHARE_BASE_PATH = '/share';

  /**
   * Generate a shareable link for an itinerary
   */
  static async generateShareableLink(
    itinerary: ShareableItinerary,
    options: ShareOptions = {
      includePersonalNotes: false,
      includeContactInfo: true,
      allowEditing: false,
      publicView: true,
    }
  ): Promise<ShareableLink> {
    try {
      // Create a sanitized version of the itinerary based on share options
      const sanitizedItinerary = this.sanitizeItinerary(itinerary, options);
      
      // Generate a unique share ID
      const shareId = this.generateShareId();
      
      // Store the itinerary data (in production, this would be saved to database)
      await this.storeSharedItinerary(shareId, sanitizedItinerary, options);
      
      // Generate URLs
      const fullUrl = `${this.BASE_URL}${this.SHARE_BASE_PATH}/${shareId}`;
      const shortUrl = await this.generateShortUrl(fullUrl);
      const qrCode = await this.generateQRCode(fullUrl);
      
      // Calculate expiration date
      const expiresAt = options.expirationDays 
        ? new Date(Date.now() + options.expirationDays * 24 * 60 * 60 * 1000)
        : undefined;
      
      return {
        id: shareId,
        url: fullUrl,
        shortUrl,
        qrCode,
        expiresAt,
        viewCount: 0,
        createdAt: new Date(),
      };
    } catch (error) {
      console.error('Failed to generate shareable link:', error);
      throw new Error('Failed to create shareable link');
    }
  }

  /**
   * Generate multiple format-specific shareable links
   */
  static async generateMultiFormatLinks(
    itinerary: ShareableItinerary,
    options: ShareOptions = {
      includePersonalNotes: false,
      includeContactInfo: true,
      allowEditing: false,
      publicView: true,
    }
  ): Promise<{ [format: string]: ShareableLink }> {
    const baseShareId = this.generateShareId();
    const links: { [format: string]: ShareableLink } = {};

    const formats = [
      'web', // Interactive web view
      'pdf', // Direct PDF download
      'calendar', // Calendar import
      'mobile', // Mobile-optimized view
    ];

    for (const format of formats) {
      const formatShareId = `${baseShareId}-${format}`;
      await this.storeSharedItinerary(formatShareId, itinerary, { ...options, format: format as any });

      const fullUrl = `${this.BASE_URL}${this.SHARE_BASE_PATH}/${formatShareId}`;
      const shortUrl = await this.generateShortUrl(fullUrl);
      const qrCode = await this.generateQRCode(fullUrl);

      links[format] = {
        id: formatShareId,
        url: fullUrl,
        shortUrl,
        qrCode,
        expiresAt: options.expirationDays 
          ? new Date(Date.now() + options.expirationDays * 24 * 60 * 60 * 1000)
          : undefined,
        viewCount: 0,
        createdAt: new Date(),
      };
    }

    return links;
  }

  /**
   * Create social media sharing links
   */
  static generateSocialSharingLinks(shareableLink: ShareableLink, itinerary: ShareableItinerary): {
    [platform: string]: string;
  } {
    const title = encodeURIComponent(
      itinerary.itineraryName || `${itinerary.city} Travel Itinerary`
    );
    const description = encodeURIComponent(
      `Check out my ${itinerary.city}, ${itinerary.country} travel itinerary! ${itinerary.activities.length} activities planned.`
    );
    const url = encodeURIComponent(shareableLink.shortUrl || shareableLink.url);

    return {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      twitter: `https://twitter.com/intent/tweet?text=${title}&url=${url}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      whatsapp: `https://wa.me/?text=${title}%20${url}`,
      telegram: `https://telegram.me/share/url?url=${url}&text=${title}`,
      email: `mailto:?subject=${title}&body=${description}%0A%0A${url}`,
      copy: shareableLink.shortUrl || shareableLink.url,
    };
  }

  /**
   * Generate embeddable widget code
   */
  static generateEmbedCode(
    shareableLink: ShareableLink,
    options: {
      width?: string;
      height?: string;
      theme?: 'light' | 'dark';
      showHeader?: boolean;
      showFooter?: boolean;
    } = {}
  ): string {
    const {
      width = '100%',
      height = '600px',
      theme = 'light',
      showHeader = true,
      showFooter = true,
    } = options;

    const embedUrl = `${shareableLink.url}/embed?theme=${theme}&header=${showHeader}&footer=${showFooter}`;

    return `<iframe 
  src="${embedUrl}"
  width="${width}"
  height="${height}"
  frameborder="0"
  style="border: 1px solid #ddd; border-radius: 8px;"
  allowfullscreen>
</iframe>`;
  }

  /**
   * Create collection/bulk sharing for multiple itineraries
   */
  static async createItineraryCollection(
    itineraries: ShareableItinerary[],
    collectionInfo: {
      name: string;
      description?: string;
      createdBy?: string;
    },
    options: ShareOptions = {
      includePersonalNotes: false,
      includeContactInfo: true,
      allowEditing: false,
      publicView: true,
    }
  ): Promise<ShareableLink> {
    try {
      const collectionId = this.generateShareId();
      
      // Store collection data
      const collectionData = {
        ...collectionInfo,
        itineraries: itineraries.map(itinerary => this.sanitizeItinerary(itinerary, options)),
        type: 'collection',
        createdAt: new Date(),
      };

      await this.storeSharedItinerary(collectionId, collectionData, options);

      const fullUrl = `${this.BASE_URL}${this.SHARE_BASE_PATH}/collection/${collectionId}`;
      const shortUrl = await this.generateShortUrl(fullUrl);
      const qrCode = await this.generateQRCode(fullUrl);

      return {
        id: collectionId,
        url: fullUrl,
        shortUrl,
        qrCode,
        expiresAt: options.expirationDays 
          ? new Date(Date.now() + options.expirationDays * 24 * 60 * 60 * 1000)
          : undefined,
        viewCount: 0,
        createdAt: new Date(),
      };
    } catch (error) {
      console.error('Failed to create itinerary collection:', error);
      throw new Error('Failed to create itinerary collection');
    }
  }

  // Private helper methods

  private static sanitizeItinerary(
    itinerary: ShareableItinerary,
    options: ShareOptions
  ): any {
    const sanitized: any = {
      city: itinerary.city,
      country: itinerary.country,
      fromDate: itinerary.fromDate,
      toDate: itinerary.toDate,
      itineraryName: itinerary.itineraryName,
      activities: itinerary.activities.map(activity => ({
        ...activity,
        notes: options.includePersonalNotes ? activity.notes : undefined,
        activity: {
          ...activity.activity,
          phone_number: options.includeContactInfo ? activity.activity?.phone_number : undefined,
          website_url: options.includeContactInfo ? activity.activity?.website_url : undefined,
        },
      })),
    };

    // Include creator info based on options
    if (options.publicView) {
      sanitized.createdBy = itinerary.createdBy;
      sanitized.notes = options.includePersonalNotes ? itinerary.notes : undefined;
    }

    return sanitized;
  }

  private static generateShareId(): string {
    // Generate a URL-safe random ID
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private static async storeSharedItinerary(
    shareId: string,
    data: any,
    options: ShareOptions
  ): Promise<void> {
    // In production, this would store to database
    // For now, store in localStorage for demo purposes
    if (typeof window !== 'undefined') {
      const shareData = {
        id: shareId,
        data,
        options,
        createdAt: new Date().toISOString(),
        expiresAt: options.expirationDays 
          ? new Date(Date.now() + options.expirationDays * 24 * 60 * 60 * 1000).toISOString()
          : undefined,
        viewCount: 0,
      };

      localStorage.setItem(`share_${shareId}`, JSON.stringify(shareData));
    }
  }

  private static async generateShortUrl(fullUrl: string): Promise<string> {
    // In production, integrate with URL shortening service (bit.ly, tinyurl, etc.)
    // For demo, create a shortened version
    const urlParts = fullUrl.split('/');
    const shareId = urlParts[urlParts.length - 1];
    return `${this.BASE_URL}/s/${shareId}`;
  }

  private static async generateQRCode(url: string): Promise<string> {
    try {
      // Use QRCode library (same as PDF export)
      const QRCode = (await import('qrcode')).default;
      return await QRCode.toDataURL(url, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      return '';
    }
  }

  /**
   * Retrieve shared itinerary data
   */
  static getSharedItinerary(shareId: string): any | null {
    if (typeof window !== 'undefined') {
      const shareData = localStorage.getItem(`share_${shareId}`);
      if (shareData) {
        const parsed = JSON.parse(shareData);
        
        // Check if expired
        if (parsed.expiresAt && new Date(parsed.expiresAt) < new Date()) {
          localStorage.removeItem(`share_${shareId}`);
          return null;
        }

        // Increment view count
        parsed.viewCount = (parsed.viewCount || 0) + 1;
        localStorage.setItem(`share_${shareId}`, JSON.stringify(parsed));

        return parsed.data;
      }
    }
    return null;
  }

  /**
   * Get sharing statistics
   */
  static getShareStatistics(shareId: string): { viewCount: number; createdAt: Date; expiresAt?: Date } | null {
    if (typeof window !== 'undefined') {
      const shareData = localStorage.getItem(`share_${shareId}`);
      if (shareData) {
        const parsed = JSON.parse(shareData);
        return {
          viewCount: parsed.viewCount || 0,
          createdAt: new Date(parsed.createdAt),
          expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : undefined,
        };
      }
    }
    return null;
  }
}

// Utility functions for easy access
export const generateShareableLink = ShareableLinkGenerator.generateShareableLink;
export const generateMultiFormatLinks = ShareableLinkGenerator.generateMultiFormatLinks;
export const generateSocialSharingLinks = ShareableLinkGenerator.generateSocialSharingLinks;
export const generateEmbedCode = ShareableLinkGenerator.generateEmbedCode;
export const createItineraryCollection = ShareableLinkGenerator.createItineraryCollection;