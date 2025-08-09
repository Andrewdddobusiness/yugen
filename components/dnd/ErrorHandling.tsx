"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Wifi, WifiOff, RefreshCw, X, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useDragContext, DragOperation } from './DragProvider';

// Error types for drag-and-drop operations
export type DragErrorType = 
  | 'NETWORK_ERROR'
  | 'VALIDATION_ERROR'
  | 'CONFLICT_ERROR'
  | 'PERMISSION_ERROR'
  | 'TIMEOUT_ERROR'
  | 'UNKNOWN_ERROR'
  | 'OFFLINE_ERROR'
  | 'RATE_LIMIT_ERROR';

export interface DragError {
  id: string;
  type: DragErrorType;
  message: string;
  details?: string;
  operation?: DragOperation;
  timestamp: number;
  isRecoverable: boolean;
  retryCount?: number;
  maxRetries?: number;
}

interface DragErrorHandlerProps {
  onRetry?: (error: DragError) => Promise<boolean>;
  onDismiss?: (errorId: string) => void;
  maxVisibleErrors?: number;
  autoRetryDelay?: number;
  className?: string;
}

/**
 * Centralized error handling component for drag-and-drop operations
 */
export function DragErrorHandler({
  onRetry,
  onDismiss,
  maxVisibleErrors = 3,
  autoRetryDelay = 3000,
  className
}: DragErrorHandlerProps) {
  const [errors, setErrors] = useState<DragError[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Add error to the list
  const addError = useCallback((error: Omit<DragError, 'id' | 'timestamp'>) => {
    const newError: DragError = {
      ...error,
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    setErrors(prev => {
      const updated = [newError, ...prev];
      return updated.slice(0, maxVisibleErrors * 2); // Keep some extras for retry logic
    });

    // Auto-retry for certain error types
    if (error.isRecoverable && error.type !== 'OFFLINE_ERROR') {
      setTimeout(() => {
        handleRetry(newError);
      }, autoRetryDelay);
    }
  }, [maxVisibleErrors, autoRetryDelay]);

  // Remove error from the list
  const removeError = useCallback((errorId: string) => {
    setErrors(prev => prev.filter(error => error.id !== errorId));
    onDismiss?.(errorId);
  }, [onDismiss]);

  // Retry operation
  const handleRetry = useCallback(async (error: DragError) => {
    if (!error.isRecoverable) return false;

    const currentRetries = error.retryCount || 0;
    const maxRetries = error.maxRetries || 3;

    if (currentRetries >= maxRetries) {
      // Update error to non-recoverable
      setErrors(prev => prev.map(e => 
        e.id === error.id 
          ? { ...e, isRecoverable: false, message: `${e.message} (Max retries exceeded)` }
          : e
      ));
      return false;
    }

    // Update retry count
    setErrors(prev => prev.map(e => 
      e.id === error.id 
        ? { ...e, retryCount: currentRetries + 1 }
        : e
    ));

    try {
      const success = await onRetry?.(error);
      
      if (success) {
        removeError(error.id);
        return true;
      } else {
        // Retry failed, schedule next retry
        setTimeout(() => handleRetry(error), autoRetryDelay * Math.pow(2, currentRetries));
        return false;
      }
    } catch (retryError) {
      console.error('Retry failed:', retryError);
      return false;
    }
  }, [onRetry, removeError, autoRetryDelay]);

  const visibleErrors = errors.slice(0, maxVisibleErrors);

  if (visibleErrors.length === 0 && isOnline) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Offline indicator */}
      {!isOnline && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <WifiOff className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800">You're offline</AlertTitle>
          <AlertDescription className="text-yellow-700">
            Drag operations will be queued until you reconnect to the internet.
          </AlertDescription>
        </Alert>
      )}

      {/* Error messages */}
      {visibleErrors.map((error) => (
        <ErrorMessage
          key={error.id}
          error={error}
          onRetry={() => handleRetry(error)}
          onDismiss={() => removeError(error.id)}
        />
      ))}

      {/* Show count if there are more errors */}
      {errors.length > maxVisibleErrors && (
        <div className="text-center">
          <Badge variant="secondary" className="text-xs">
            +{errors.length - maxVisibleErrors} more error{errors.length - maxVisibleErrors > 1 ? 's' : ''}
          </Badge>
        </div>
      )}
    </div>
  );
}

/**
 * Individual error message component
 */
function ErrorMessage({
  error,
  onRetry,
  onDismiss
}: {
  error: DragError;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  const getErrorIcon = (type: DragErrorType) => {
    switch (type) {
      case 'NETWORK_ERROR':
      case 'OFFLINE_ERROR':
        return <WifiOff className="h-4 w-4" />;
      case 'TIMEOUT_ERROR':
        return <RefreshCw className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getErrorSeverity = (type: DragErrorType) => {
    switch (type) {
      case 'VALIDATION_ERROR':
      case 'CONFLICT_ERROR':
        return 'warning';
      case 'PERMISSION_ERROR':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const severity = getErrorSeverity(error.type);
  const retryText = error.retryCount ? `(Retry ${error.retryCount}/${error.maxRetries || 3})` : '';

  return (
    <Alert className={cn(
      severity === 'warning' && "border-yellow-200 bg-yellow-50",
      severity === 'destructive' && "border-red-200 bg-red-50"
    )}>
      <div className={cn(
        "h-4 w-4",
        severity === 'warning' && "text-yellow-600",
        severity === 'destructive' && "text-red-600"
      )}>
        {getErrorIcon(error.type)}
      </div>
      
      <div className="flex-1">
        <AlertTitle className={cn(
          severity === 'warning' && "text-yellow-800",
          severity === 'destructive' && "text-red-800"
        )}>
          {error.message} {retryText}
        </AlertTitle>
        
        {error.details && (
          <AlertDescription className={cn(
            "mt-1",
            severity === 'warning' && "text-yellow-700",
            severity === 'destructive' && "text-red-700"
          )}>
            {error.details}
          </AlertDescription>
        )}

        {error.operation && (
          <AlertDescription className="mt-2 text-xs text-gray-500">
            Operation: {error.operation.operation} - {error.operation.item.data?.activity?.name || 'Unknown item'}
          </AlertDescription>
        )}
      </div>

      <div className="flex items-center space-x-2 ml-4">
        {error.isRecoverable && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="h-7 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="h-7 w-7 p-0"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </Alert>
  );
}

/**
 * Hook to handle drag-and-drop errors
 */
export function useDragErrorHandler() {
  const [errorHandler, setErrorHandler] = useState<DragErrorHandler | null>(null);

  const handleError = useCallback((
    type: DragErrorType,
    message: string,
    details?: string,
    operation?: DragOperation,
    isRecoverable = true
  ) => {
    const error: Omit<DragError, 'id' | 'timestamp'> = {
      type,
      message,
      details,
      operation,
      isRecoverable,
      maxRetries: isRecoverable ? 3 : 0
    };

    // This would integrate with the ErrorHandler component
    console.error('Drag Error:', error);
  }, []);

  const handleNetworkError = useCallback((operation?: DragOperation) => {
    handleError(
      'NETWORK_ERROR',
      'Network connection lost',
      'The operation will be retried when connection is restored',
      operation
    );
  }, [handleError]);

  const handleValidationError = useCallback((message: string, operation?: DragOperation) => {
    handleError(
      'VALIDATION_ERROR',
      message,
      undefined,
      operation,
      false // Validation errors are usually not automatically recoverable
    );
  }, [handleError]);

  const handleConflictError = useCallback((conflicts: string[], operation?: DragOperation) => {
    handleError(
      'CONFLICT_ERROR',
      'Scheduling conflict detected',
      `Conflicts with: ${conflicts.join(', ')}`,
      operation,
      false
    );
  }, [handleError]);

  const handleTimeoutError = useCallback((operation?: DragOperation) => {
    handleError(
      'TIMEOUT_ERROR',
      'Operation timed out',
      'The server took too long to respond',
      operation
    );
  }, [handleError]);

  return {
    handleError,
    handleNetworkError,
    handleValidationError,
    handleConflictError,
    handleTimeoutError
  };
}

/**
 * Error boundary component for drag-and-drop operations
 */
export class DragErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Drag operation error boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Drag operation failed</AlertTitle>
          <AlertDescription className="text-red-700">
            An unexpected error occurred during the drag operation. Please refresh the page and try again.
            {this.state.error && (
              <details className="mt-2 text-xs">
                <summary>Error details</summary>
                <pre className="mt-1 whitespace-pre-wrap">{this.state.error.toString()}</pre>
              </details>
            )}
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}

/**
 * Queue for handling offline drag operations
 */
export class OfflineDragQueue {
  private queue: DragOperation[] = [];
  private isProcessing = false;

  add(operation: DragOperation) {
    this.queue.push(operation);
    this.saveToStorage();
  }

  async processQueue(onProcess: (operation: DragOperation) => Promise<boolean>) {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    
    try {
      for (let i = 0; i < this.queue.length; i++) {
        const operation = this.queue[i];
        
        try {
          const success = await onProcess(operation);
          if (success) {
            this.queue.splice(i, 1);
            i--; // Adjust index after removal
          }
        } catch (error) {
          console.error('Failed to process queued operation:', error);
        }
      }
    } finally {
      this.isProcessing = false;
      this.saveToStorage();
    }
  }

  clear() {
    this.queue = [];
    this.saveToStorage();
  }

  get length() {
    return this.queue.length;
  }

  private saveToStorage() {
    try {
      localStorage.setItem('drag-queue', JSON.stringify(this.queue));
    } catch (error) {
      console.warn('Failed to save drag queue to localStorage:', error);
    }
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem('drag-queue');
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load drag queue from localStorage:', error);
      this.queue = [];
    }
  }

  constructor() {
    this.loadFromStorage();
  }
}

/**
 * Edge case validator for drag operations
 */
export class EdgeCaseValidator {
  // Validate multi-day activities
  static validateMultiDayActivity(
    startDate: Date,
    endDate: Date,
    duration: number
  ): { isValid: boolean; reason?: string } {
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 7) {
      return {
        isValid: false,
        reason: 'Activities cannot span more than 7 days'
      };
    }

    if (duration > 24 * 60) {
      return {
        isValid: false,
        reason: 'Single activity cannot exceed 24 hours'
      };
    }

    return { isValid: true };
  }

  // Validate timezone consistency
  static validateTimezone(
    userTimezone: string,
    activityTimezone?: string
  ): { isValid: boolean; reason?: string; suggestedConversion?: string } {
    if (!activityTimezone) return { isValid: true };

    if (userTimezone !== activityTimezone) {
      const userTime = new Intl.DateTimeFormat('en-US', {
        timeZone: userTimezone,
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date());

      const activityTime = new Intl.DateTimeFormat('en-US', {
        timeZone: activityTimezone,
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date());

      return {
        isValid: true, // Allow but warn
        reason: `Time zone mismatch: Your time (${userTime}) vs Activity location (${activityTime})`,
        suggestedConversion: `Consider adjusting for ${activityTimezone} timezone`
      };
    }

    return { isValid: true };
  }

  // Validate rapid interactions
  static validateRapidInteractions(
    lastInteractionTime: number,
    minDelay = 100
  ): { isValid: boolean; reason?: string } {
    const timeSinceLastInteraction = Date.now() - lastInteractionTime;
    
    if (timeSinceLastInteraction < minDelay) {
      return {
        isValid: false,
        reason: 'Please wait a moment before the next action'
      };
    }

    return { isValid: true };
  }
}