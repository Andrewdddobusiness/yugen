'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Share2, 
  Copy, 
  QrCode, 
  Globe, 
  Smartphone,
  Mail,
  MessageCircle,
  Clock,
  Eye,
  Settings,
  Code,
  Users,
  Link,
  Download,
  Calendar,
  FileText,
  Facebook,
  Twitter,
  Linkedin
} from 'lucide-react';

import { 
  ShareableLinkGenerator, 
  generateSocialSharingLinks,
  generateEmbedCode
} from '@/utils/shareableLinks';
import { IItineraryActivity } from '@/store/itineraryActivityStore';

interface ShareDialogProps {
  children: React.ReactNode;
  itineraryDetails: {
    city: string;
    country: string;
    fromDate: Date;
    toDate: Date;
    activities: IItineraryActivity[];
    itineraryName?: string;
    createdBy?: string;
    notes?: string;
  };
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

export function ShareDialog({ children, itineraryDetails }: ShareDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareLink, setShareLink] = useState<ShareableLink | null>(null);
  const [multiFormatLinks, setMultiFormatLinks] = useState<{ [format: string]: ShareableLink }>({});
  const [socialLinks, setSocialLinks] = useState<{ [platform: string]: string }>({});
  const [embedCode, setEmbedCode] = useState('');
  const { toast } = useToast();

  // Share options state
  const [shareOptions, setShareOptions] = useState({
    includePersonalNotes: false,
    includeContactInfo: true,
    allowEditing: false,
    publicView: true,
    expirationDays: 30,
    password: '',
  });

  const [embedOptions, setEmbedOptions] = useState({
    width: '100%',
    height: '600px',
    theme: 'light' as 'light' | 'dark',
    showHeader: true,
    showFooter: true,
  });

  useEffect(() => {
    if (shareLink) {
      // Generate social sharing links
      const social = generateSocialSharingLinks(shareLink, itineraryDetails);
      setSocialLinks(social);

      // Generate embed code
      const embed = generateEmbedCode(shareLink, embedOptions);
      setEmbedCode(embed);
    }
  }, [shareLink, embedOptions, itineraryDetails]);

  const handleGenerateLink = async () => {
    setIsGenerating(true);
    try {
      const link = await ShareableLinkGenerator.generateShareableLink(
        itineraryDetails,
        shareOptions
      );
      setShareLink(link);

      // Generate multi-format links
      const multiLinks = await ShareableLinkGenerator.generateMultiFormatLinks(
        itineraryDetails,
        shareOptions
      );
      setMultiFormatLinks(multiLinks);

      toast({
        title: 'Link Generated',
        description: 'Your shareable link has been created successfully!',
      });
    } catch (error) {
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate shareable link. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string, description: string = 'Link') => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied!',
        description: `${description} copied to clipboard.`,
      });
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy to clipboard.',
        variant: 'destructive',
      });
    }
  };

  const openSocialShare = (platform: string, url: string) => {
    window.open(url, '_blank', 'width=600,height=400');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Itinerary
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="generate" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="generate">Generate Link</TabsTrigger>
            <TabsTrigger value="social">Social Share</TabsTrigger>
            <TabsTrigger value="embed">Embed</TabsTrigger>
            <TabsTrigger value="formats">Formats</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-6">
            {/* Share Options */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Sharing Options
                </CardTitle>
                <CardDescription>
                  Configure what information to include in your shared itinerary
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Include Personal Notes</label>
                      <Switch
                        checked={shareOptions.includePersonalNotes}
                        onCheckedChange={(checked) =>
                          setShareOptions(prev => ({ ...prev, includePersonalNotes: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Include Contact Information</label>
                      <Switch
                        checked={shareOptions.includeContactInfo}
                        onCheckedChange={(checked) =>
                          setShareOptions(prev => ({ ...prev, includeContactInfo: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Public View</label>
                      <Switch
                        checked={shareOptions.publicView}
                        onCheckedChange={(checked) =>
                          setShareOptions(prev => ({ ...prev, publicView: checked }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Expiration (Days)</label>
                      <Input
                        type="number"
                        value={shareOptions.expirationDays}
                        onChange={(e) =>
                          setShareOptions(prev => ({ ...prev, expirationDays: parseInt(e.target.value) || 30 }))
                        }
                        placeholder="30"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Password (Optional)</label>
                      <Input
                        type="password"
                        value={shareOptions.password}
                        onChange={(e) =>
                          setShareOptions(prev => ({ ...prev, password: e.target.value }))
                        }
                        placeholder="Leave empty for no password"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Button 
                    onClick={handleGenerateLink}
                    disabled={isGenerating}
                    className="w-full"
                  >
                    {isGenerating ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Generating Link...
                      </>
                    ) : (
                      <>
                        <Link className="h-4 w-4 mr-2" />
                        Generate Shareable Link
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Generated Link */}
            {shareLink && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Your Shareable Link
                  </CardTitle>
                  <CardDescription className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {shareLink.viewCount} views
                    </span>
                    {shareLink.expiresAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Expires {shareLink.expiresAt.toLocaleDateString()}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Input
                        value={shareLink.shortUrl}
                        readOnly
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={() => copyToClipboard(shareLink.shortUrl, 'Link')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-center">
                      {shareLink.qrCode && (
                        <div className="text-center">
                          <img 
                            src={shareLink.qrCode} 
                            alt="QR Code" 
                            className="mx-auto mb-2"
                            style={{ maxWidth: '150px' }}
                          />
                          <p className="text-xs text-muted-foreground">
                            Scan to view itinerary
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="social" className="space-y-6">
            {shareLink ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Social Media Sharing</CardTitle>
                    <CardDescription>Share your itinerary on social platforms</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <Button
                        variant="outline"
                        onClick={() => openSocialShare('Facebook', socialLinks.facebook)}
                        className="flex items-center gap-2"
                      >
                        <Facebook className="h-4 w-4" />
                        Facebook
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => openSocialShare('Twitter', socialLinks.twitter)}
                        className="flex items-center gap-2"
                      >
                        <Twitter className="h-4 w-4" />
                        Twitter
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => openSocialShare('LinkedIn', socialLinks.linkedin)}
                        className="flex items-center gap-2"
                      >
                        <Linkedin className="h-4 w-4" />
                        LinkedIn
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => openSocialShare('WhatsApp', socialLinks.whatsapp)}
                        className="flex items-center gap-2"
                      >
                        <MessageCircle className="h-4 w-4" />
                        WhatsApp
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => openSocialShare('Email', socialLinks.email)}
                        className="flex items-center gap-2"
                      >
                        <Mail className="h-4 w-4" />
                        Email
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => copyToClipboard(socialLinks.copy, 'Link')}
                        className="flex items-center gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        Copy Link
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">
                    Generate a shareable link first to access social sharing options.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="embed" className="space-y-6">
            {shareLink ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Code className="h-4 w-4" />
                      Embed Options
                    </CardTitle>
                    <CardDescription>Customize the embedded widget</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Width</label>
                        <Input
                          value={embedOptions.width}
                          onChange={(e) => setEmbedOptions(prev => ({ ...prev, width: e.target.value }))}
                          placeholder="100%"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Height</label>
                        <Input
                          value={embedOptions.height}
                          onChange={(e) => setEmbedOptions(prev => ({ ...prev, height: e.target.value }))}
                          placeholder="600px"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Show Header</label>
                        <Switch
                          checked={embedOptions.showHeader}
                          onCheckedChange={(checked) =>
                            setEmbedOptions(prev => ({ ...prev, showHeader: checked }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Show Footer</label>
                        <Switch
                          checked={embedOptions.showFooter}
                          onCheckedChange={(checked) =>
                            setEmbedOptions(prev => ({ ...prev, showFooter: checked }))
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Embed Code</CardTitle>
                    <CardDescription>Copy this code to embed the itinerary on your website</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Textarea
                        value={embedCode}
                        readOnly
                        rows={6}
                        className="font-mono text-xs"
                      />
                      <Button
                        onClick={() => copyToClipboard(embedCode, 'Embed code')}
                        className="w-full"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Embed Code
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">
                    Generate a shareable link first to access embed options.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="formats" className="space-y-6">
            {Object.keys(multiFormatLinks).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(multiFormatLinks).map(([format, link]) => (
                  <Card key={format} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {format === 'web' && <Globe className="h-5 w-5 text-blue-600" />}
                          {format === 'pdf' && <FileText className="h-5 w-5 text-red-600" />}
                          {format === 'calendar' && <Calendar className="h-5 w-5 text-green-600" />}
                          {format === 'mobile' && <Smartphone className="h-5 w-5 text-purple-600" />}
                          <CardTitle className="text-sm capitalize">{format} View</CardTitle>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {link.viewCount} views
                        </Badge>
                      </div>
                      <CardDescription className="text-xs">
                        {format === 'web' && 'Interactive web view with full functionality'}
                        {format === 'pdf' && 'Direct download of PDF document'}
                        {format === 'calendar' && 'Import into calendar applications'}
                        {format === 'mobile' && 'Mobile-optimized responsive view'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2">
                      <Input
                        value={link.shortUrl}
                        readOnly
                        className="text-xs"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(link.shortUrl, `${format} link`)}
                          className="flex-1"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(link.shortUrl, '_blank')}
                          className="flex-1"
                        >
                          <Globe className="h-3 w-3 mr-1" />
                          Open
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">
                    Generate a shareable link first to access format-specific links.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}