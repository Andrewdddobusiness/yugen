"use client";

import React, { createContext, useContext, useReducer, useCallback, useRef } from 'react';
import { Active, Over, UniqueIdentifier, DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core';

// Types
export interface DraggedItem {
  id: string;
  type: 'wishlist-item' | 'scheduled-activity';
  data: any;
  sourceType: 'wishlist' | 'calendar';
}

export interface DropValidation {
  isValid: boolean;
  reason?: string;
  conflictingActivities?: Array<{
    id: string;
    name: string;
    time: string;
  }>;
  suggestedAlternatives?: Array<{
    timeSlot: string;
    date: Date;
    score: number;
  }>;
}

export interface DragOperation {
  id: string;
  timestamp: number;
  operation: 'schedule' | 'move' | 'remove';
  item: DraggedItem;
  target?: {
    date: string;
    timeSlot: string;
  };
  result: 'success' | 'error' | 'cancelled';
  rollbackData?: any;
}

export interface DragPreferences {
  dragThreshold: number;
  longPressDelay: number;
  snapToGrid: boolean;
  showPreview: boolean;
  enableAnimation: boolean;
  autoScroll: boolean;
}

export interface DragState {
  // Current drag operation
  activeDrag: DraggedItem | null;
  isDragging: boolean;
  dragStartTime: number | null;
  
  // Drop validation
  activeDropZone: string | null;
  dropValidation: DropValidation | null;
  validDropZones: Set<string>;
  
  // History & undo
  operationHistory: DragOperation[];
  currentHistoryIndex: number;
  maxHistorySize: number;
  
  // UI state
  dragPreview: {
    visible: boolean;
    position: { x: number; y: number };
    item: DraggedItem | null;
  };
  
  // Settings
  preferences: DragPreferences;
  
  // Performance
  isProcessing: boolean;
  lastUpdateTime: number;
}

type DragAction =
  | { type: 'START_DRAG'; payload: { item: DraggedItem; timestamp: number } }
  | { type: 'UPDATE_DRAG'; payload: { dropZone: string | null; validation: DropValidation | null } }
  | { type: 'END_DRAG'; payload: { success: boolean; operation?: DragOperation } }
  | { type: 'CANCEL_DRAG' }
  | { type: 'UPDATE_PREVIEW'; payload: { position: { x: number; y: number }; visible: boolean } }
  | { type: 'SET_VALID_DROP_ZONES'; payload: Set<string> }
  | { type: 'ADD_OPERATION'; payload: DragOperation }
  | { type: 'UNDO_OPERATION' }
  | { type: 'REDO_OPERATION' }
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<DragPreferences> }
  | { type: 'SET_PROCESSING'; payload: boolean };

const DEFAULT_PREFERENCES: DragPreferences = {
  dragThreshold: 8,
  longPressDelay: 300,
  snapToGrid: true,
  showPreview: true,
  enableAnimation: true,
  autoScroll: true
};

const initialState: DragState = {
  activeDrag: null,
  isDragging: false,
  dragStartTime: null,
  activeDropZone: null,
  dropValidation: null,
  validDropZones: new Set(),
  operationHistory: [],
  currentHistoryIndex: -1,
  maxHistorySize: 50,
  dragPreview: {
    visible: false,
    position: { x: 0, y: 0 },
    item: null
  },
  preferences: DEFAULT_PREFERENCES,
  isProcessing: false,
  lastUpdateTime: 0
};

function dragReducer(state: DragState, action: DragAction): DragState {
  switch (action.type) {
    case 'START_DRAG':
      return {
        ...state,
        activeDrag: action.payload.item,
        isDragging: true,
        dragStartTime: action.payload.timestamp,
        dragPreview: {
          ...state.dragPreview,
          item: action.payload.item,
          visible: state.preferences.showPreview
        },
        lastUpdateTime: Date.now()
      };

    case 'UPDATE_DRAG':
      return {
        ...state,
        activeDropZone: action.payload.dropZone,
        dropValidation: action.payload.validation,
        lastUpdateTime: Date.now()
      };

    case 'END_DRAG':
      const newOperation = action.payload.operation;
      let newHistory = [...state.operationHistory];
      let newHistoryIndex = state.currentHistoryIndex;

      if (newOperation) {
        // Add to history, removing any redo operations
        newHistory = newHistory.slice(0, newHistoryIndex + 1);
        newHistory.push(newOperation);
        
        // Limit history size
        if (newHistory.length > state.maxHistorySize) {
          newHistory = newHistory.slice(-state.maxHistorySize);
        }
        
        newHistoryIndex = newHistory.length - 1;
      }

      return {
        ...state,
        activeDrag: null,
        isDragging: false,
        dragStartTime: null,
        activeDropZone: null,
        dropValidation: null,
        validDropZones: new Set(),
        dragPreview: {
          visible: false,
          position: { x: 0, y: 0 },
          item: null
        },
        operationHistory: newHistory,
        currentHistoryIndex: newHistoryIndex,
        lastUpdateTime: Date.now()
      };

    case 'CANCEL_DRAG':
      return {
        ...state,
        activeDrag: null,
        isDragging: false,
        dragStartTime: null,
        activeDropZone: null,
        dropValidation: null,
        validDropZones: new Set(),
        dragPreview: {
          visible: false,
          position: { x: 0, y: 0 },
          item: null
        },
        lastUpdateTime: Date.now()
      };

    case 'UPDATE_PREVIEW':
      return {
        ...state,
        dragPreview: {
          ...state.dragPreview,
          position: action.payload.position,
          visible: action.payload.visible
        }
      };

    case 'SET_VALID_DROP_ZONES':
      return {
        ...state,
        validDropZones: action.payload
      };

    case 'ADD_OPERATION':
      let historyAfterAdd = [...state.operationHistory];
      
      // Remove any redo operations
      historyAfterAdd = historyAfterAdd.slice(0, state.currentHistoryIndex + 1);
      historyAfterAdd.push(action.payload);
      
      // Limit size
      if (historyAfterAdd.length > state.maxHistorySize) {
        historyAfterAdd = historyAfterAdd.slice(-state.maxHistorySize);
      }

      return {
        ...state,
        operationHistory: historyAfterAdd,
        currentHistoryIndex: historyAfterAdd.length - 1
      };

    case 'UNDO_OPERATION':
      if (state.currentHistoryIndex >= 0) {
        return {
          ...state,
          currentHistoryIndex: state.currentHistoryIndex - 1
        };
      }
      return state;

    case 'REDO_OPERATION':
      if (state.currentHistoryIndex < state.operationHistory.length - 1) {
        return {
          ...state,
          currentHistoryIndex: state.currentHistoryIndex + 1
        };
      }
      return state;

    case 'UPDATE_PREFERENCES':
      return {
        ...state,
        preferences: {
          ...state.preferences,
          ...action.payload
        }
      };

    case 'SET_PROCESSING':
      return {
        ...state,
        isProcessing: action.payload
      };

    default:
      return state;
  }
}

// Context
interface DragContextValue {
  state: DragState;
  
  // Drag operations
  startDrag: (item: DraggedItem) => void;
  updateDrag: (dropZone: string | null, validation: DropValidation | null) => void;
  endDrag: (success: boolean, operation?: DragOperation) => void;
  cancelDrag: () => void;
  
  // Preview updates
  updatePreview: (position: { x: number; y: number }, visible: boolean) => void;
  
  // Drop zone management
  setValidDropZones: (zones: Set<string>) => void;
  validateDropZone: (zoneId: string, item: DraggedItem) => DropValidation;
  
  // History operations
  undo: () => boolean;
  redo: () => boolean;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Preferences
  updatePreferences: (prefs: Partial<DragPreferences>) => void;
  
  // Processing state
  setProcessing: (processing: boolean) => void;
}

const DragContext = createContext<DragContextValue | null>(null);

// Provider component
interface DragProviderProps {
  children: React.ReactNode;
  onDragStart?: (item: DraggedItem) => void;
  onDragEnd?: (item: DraggedItem, result: 'success' | 'error' | 'cancelled') => void;
  onValidateDropZone?: (zoneId: string, item: DraggedItem) => DropValidation;
  onPerformOperation?: (operation: DragOperation) => Promise<boolean>;
}

export function DragProvider({
  children,
  onDragStart,
  onDragEnd,
  onValidateDropZone,
  onPerformOperation
}: DragProviderProps) {
  const [state, dispatch] = useReducer(dragReducer, initialState);
  const performingOperation = useRef(false);

  const startDrag = useCallback((item: DraggedItem) => {
    const timestamp = Date.now();
    dispatch({ type: 'START_DRAG', payload: { item, timestamp } });
    onDragStart?.(item);
  }, [onDragStart]);

  const updateDrag = useCallback((dropZone: string | null, validation: DropValidation | null) => {
    dispatch({ type: 'UPDATE_DRAG', payload: { dropZone, validation } });
  }, []);

  const endDrag = useCallback(async (success: boolean, operation?: DragOperation) => {
    if (performingOperation.current) return;
    
    dispatch({ type: 'SET_PROCESSING', payload: true });
    performingOperation.current = true;
    
    try {
      let finalOperation = operation;
      
      if (success && operation && onPerformOperation) {
        const result = await onPerformOperation(operation);
        finalOperation = {
          ...operation,
          result: result ? 'success' : 'error'
        };
        success = result;
      }
      
      dispatch({ 
        type: 'END_DRAG', 
        payload: { success, operation: finalOperation } 
      });
      
      if (state.activeDrag) {
        onDragEnd?.(state.activeDrag, success ? 'success' : 'error');
      }
    } catch (error) {
      console.error('Drag operation failed:', error);
      dispatch({ type: 'END_DRAG', payload: { success: false } });
      
      if (state.activeDrag) {
        onDragEnd?.(state.activeDrag, 'error');
      }
    } finally {
      dispatch({ type: 'SET_PROCESSING', payload: false });
      performingOperation.current = false;
    }
  }, [state.activeDrag, onDragEnd, onPerformOperation]);

  const cancelDrag = useCallback(() => {
    dispatch({ type: 'CANCEL_DRAG' });
    
    if (state.activeDrag) {
      onDragEnd?.(state.activeDrag, 'cancelled');
    }
  }, [state.activeDrag, onDragEnd]);

  const updatePreview = useCallback((position: { x: number; y: number }, visible: boolean) => {
    dispatch({ type: 'UPDATE_PREVIEW', payload: { position, visible } });
  }, []);

  const setValidDropZones = useCallback((zones: Set<string>) => {
    dispatch({ type: 'SET_VALID_DROP_ZONES', payload: zones });
  }, []);

  const validateDropZone = useCallback((zoneId: string, item: DraggedItem): DropValidation => {
    if (onValidateDropZone) {
      return onValidateDropZone(zoneId, item);
    }
    
    // Default validation
    return { isValid: true };
  }, [onValidateDropZone]);

  const undo = useCallback(async (): Promise<boolean> => {
    if (!canUndo()) return false;
    
    const operation = state.operationHistory[state.currentHistoryIndex];
    if (operation && onPerformOperation) {
      try {
        dispatch({ type: 'SET_PROCESSING', payload: true });
        
        // Create reverse operation
        const reverseOperation: DragOperation = {
          ...operation,
          id: `undo-${operation.id}`,
          timestamp: Date.now(),
          operation: operation.operation === 'schedule' ? 'remove' : 'schedule',
          result: 'success'
        };
        
        const success = await onPerformOperation(reverseOperation);
        
        if (success) {
          dispatch({ type: 'UNDO_OPERATION' });
          return true;
        }
      } catch (error) {
        console.error('Undo operation failed:', error);
      } finally {
        dispatch({ type: 'SET_PROCESSING', payload: false });
      }
    }
    
    return false;
  }, [state.operationHistory, state.currentHistoryIndex, onPerformOperation]);

  const redo = useCallback(async (): Promise<boolean> => {
    if (!canRedo()) return false;
    
    const operation = state.operationHistory[state.currentHistoryIndex + 1];
    if (operation && onPerformOperation) {
      try {
        dispatch({ type: 'SET_PROCESSING', payload: true });
        
        const success = await onPerformOperation(operation);
        
        if (success) {
          dispatch({ type: 'REDO_OPERATION' });
          return true;
        }
      } catch (error) {
        console.error('Redo operation failed:', error);
      } finally {
        dispatch({ type: 'SET_PROCESSING', payload: false });
      }
    }
    
    return false;
  }, [state.operationHistory, state.currentHistoryIndex, onPerformOperation]);

  const canUndo = useCallback(() => {
    return state.currentHistoryIndex >= 0 && !state.isProcessing;
  }, [state.currentHistoryIndex, state.isProcessing]);

  const canRedo = useCallback(() => {
    return state.currentHistoryIndex < state.operationHistory.length - 1 && !state.isProcessing;
  }, [state.currentHistoryIndex, state.operationHistory.length, state.isProcessing]);

  const updatePreferences = useCallback((prefs: Partial<DragPreferences>) => {
    dispatch({ type: 'UPDATE_PREFERENCES', payload: prefs });
  }, []);

  const setProcessing = useCallback((processing: boolean) => {
    dispatch({ type: 'SET_PROCESSING', payload: processing });
  }, []);

  const contextValue: DragContextValue = {
    state,
    startDrag,
    updateDrag,
    endDrag,
    cancelDrag,
    updatePreview,
    setValidDropZones,
    validateDropZone,
    undo,
    redo,
    canUndo,
    canRedo,
    updatePreferences,
    setProcessing
  };

  return (
    <DragContext.Provider value={contextValue}>
      {children}
    </DragContext.Provider>
  );
}

// Hook to use drag context
export function useDragContext() {
  const context = useContext(DragContext);
  if (!context) {
    throw new Error('useDragContext must be used within a DragProvider');
  }
  return context;
}

// Utility hooks
export function useDragState() {
  const { state } = useDragContext();
  return state;
}

export function useDragOperations() {
  const { startDrag, updateDrag, endDrag, cancelDrag, undo, redo, canUndo, canRedo } = useDragContext();
  return { startDrag, updateDrag, endDrag, cancelDrag, undo, redo, canUndo, canRedo };
}

export function useDragValidation() {
  const { validateDropZone, setValidDropZones, state } = useDragContext();
  return { validateDropZone, setValidDropZones, validDropZones: state.validDropZones };
}