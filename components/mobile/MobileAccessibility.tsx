"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useMobileEnhanced } from '@/components/hooks/use-mobile-enhanced';

// Haptic feedback utilities
export type HapticIntensity = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

export function useHapticFeedback() {
  const { isMobile, isTouch } = useMobileEnhanced();

  const triggerHaptic = useCallback((intensity: HapticIntensity = 'medium') => {
    if (!isMobile || !isTouch || !('vibrate' in navigator)) {
      return false; // Haptic not supported
    }

    const patterns: Record<HapticIntensity, number[]> = {
      light: [10],
      medium: [50],
      heavy: [100],
      success: [25, 25, 50],
      warning: [50, 50, 50],
      error: [100, 50, 100, 50, 100],
    };

    try {
      navigator.vibrate(patterns[intensity]);
      return true;
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
      return false;
    }
  }, [isMobile, isTouch]);

  const hapticTap = useCallback(() => triggerHaptic('light'), [triggerHaptic]);
  const hapticPress = useCallback(() => triggerHaptic('medium'), [triggerHaptic]);
  const hapticSuccess = useCallback(() => triggerHaptic('success'), [triggerHaptic]);
  const hapticError = useCallback(() => triggerHaptic('error'), [triggerHaptic]);

  return {
    triggerHaptic,
    hapticTap,
    hapticPress,
    hapticSuccess,
    hapticError,
    isSupported: isMobile && isTouch && 'vibrate' in navigator,
  };
}

// Enhanced button with haptic feedback
interface HapticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  hapticIntensity?: HapticIntensity;
  children: React.ReactNode;
}

export function HapticButton({ 
  hapticIntensity = 'light', 
  onClick, 
  children, 
  ...props 
}: HapticButtonProps) {
  const { triggerHaptic } = useHapticFeedback();

  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    triggerHaptic(hapticIntensity);
    onClick?.(event);
  }, [onClick, triggerHaptic, hapticIntensity]);

  return (
    <button
      {...props}
      onClick={handleClick}
      className={`touch-manipulation ${props.className || ''}`}
    >
      {children}
    </button>
  );
}

// Text scaling support
export function useTextScaling() {
  const [textScale, setTextScale] = useState(1);

  useEffect(() => {
    // Check for system text scaling preferences
    const checkTextScale = () => {
      // iOS: Check for Dynamic Type scaling
      if ('CSS' in window && 'supports' in window.CSS) {
        // Use CSS to detect if large text is preferred
        const supportsLargeText = window.CSS.supports('font-size', 'large');
        if (supportsLargeText) {
          const rootFontSize = parseFloat(
            getComputedStyle(document.documentElement).fontSize
          );
          setTextScale(rootFontSize / 16); // 16px is typical default
        }
      }

      // Check for browser zoom level
      const devicePixelRatio = window.devicePixelRatio || 1;
      const zoomLevel = Math.round(((window.outerWidth / window.innerWidth) * devicePixelRatio) * 100) / 100;
      
      if (zoomLevel !== 1) {
        setTextScale(prev => prev * zoomLevel);
      }
    };

    checkTextScale();
    window.addEventListener('resize', checkTextScale);
    
    return () => window.removeEventListener('resize', checkTextScale);
  }, []);

  return textScale;
}

// Reduced motion support
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

// High contrast mode detection
export function useHighContrast() {
  const [prefersHighContrast, setPrefersHighContrast] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setPrefersHighContrast(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersHighContrast(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersHighContrast;
}

// Focus management for mobile
export function useFocusManagement() {
  const trapFocus = useCallback((container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, []);

  const announceToScreenReader = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, []);

  return {
    trapFocus,
    announceToScreenReader,
  };
}

// Touch target size enforcement
interface TouchTargetProps {
  children: React.ReactNode;
  minSize?: number; // Minimum touch target size in pixels
  className?: string;
}

export function TouchTarget({ 
  children, 
  minSize = 44, // Apple's recommended minimum
  className = '',
  ...props
}: TouchTargetProps & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={`inline-block ${className}`}
      style={{
        minWidth: minSize,
        minHeight: minSize,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...props.style,
      }}
    >
      {children}
    </div>
  );
}

// Mobile accessibility context
interface AccessibilitySettings {
  hapticEnabled: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  textScale: number;
  touchAssist: boolean;
}

const AccessibilityContext = React.createContext<AccessibilitySettings & {
  updateSettings: (settings: Partial<AccessibilitySettings>) => void;
}>({
  hapticEnabled: true,
  highContrast: false,
  reducedMotion: false,
  textScale: 1,
  touchAssist: false,
  updateSettings: () => {},
});

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    hapticEnabled: true,
    highContrast: false,
    reducedMotion: false,
    textScale: 1,
    touchAssist: false,
  });

  const textScale = useTextScaling();
  const reducedMotion = useReducedMotion();
  const highContrast = useHighContrast();

  useEffect(() => {
    setSettings(prev => ({
      ...prev,
      textScale,
      reducedMotion,
      highContrast,
    }));
  }, [textScale, reducedMotion, highContrast]);

  const updateSettings = useCallback((newSettings: Partial<AccessibilitySettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const contextValue = {
    ...settings,
    updateSettings,
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      <div
        className={`
          ${settings.reducedMotion ? 'motion-reduce:transition-none motion-reduce:animate-none' : ''}
          ${settings.highContrast ? 'contrast-more:border-black contrast-more:text-black' : ''}
        `}
        style={{
          fontSize: settings.textScale !== 1 ? `${settings.textScale}rem` : undefined,
        }}
      >
        {children}
      </div>
    </AccessibilityContext.Provider>
  );
}

export function useAccessibilitySettings() {
  const context = React.useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibilitySettings must be used within AccessibilityProvider');
  }
  return context;
}

// Voice Over / TalkBack announcements
export function useScreenReaderAnnouncements() {
  const { announceToScreenReader } = useFocusManagement();

  const announceNavigation = useCallback((destination: string) => {
    announceToScreenReader(`Navigated to ${destination}`, 'polite');
  }, [announceToScreenReader]);

  const announceAction = useCallback((action: string) => {
    announceToScreenReader(action, 'polite');
  }, [announceToScreenReader]);

  const announceError = useCallback((error: string) => {
    announceToScreenReader(`Error: ${error}`, 'assertive');
  }, [announceToScreenReader]);

  const announceSuccess = useCallback((message: string) => {
    announceToScreenReader(`Success: ${message}`, 'polite');
  }, [announceToScreenReader]);

  return {
    announceNavigation,
    announceAction,
    announceError,
    announceSuccess,
  };
}