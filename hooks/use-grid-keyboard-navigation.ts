import { useEffect, useCallback, useRef } from 'react';

interface GridNavigationOptions {
  rows: number;
  columns: number;
  currentCell: { row: number; col: number };
  onCellSelect: (row: number, col: number) => void;
  onCellActivate?: (row: number, col: number) => void;
  onMultiSelect?: (row: number, col: number, add: boolean) => void;
  onEscape?: () => void;
  enabled?: boolean;
}

/**
 * Hook for keyboard navigation in calendar grid
 */
export function useGridKeyboardNavigation({
  rows,
  columns,
  currentCell,
  onCellSelect,
  onCellActivate,
  onMultiSelect,
  onEscape,
  enabled = true
}: GridNavigationOptions) {
  const isShiftPressed = useRef(false);

  const moveCell = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    let newRow = currentCell.row;
    let newCol = currentCell.col;

    switch (direction) {
      case 'up':
        newRow = Math.max(0, currentCell.row - 1);
        break;
      case 'down':
        newRow = Math.min(rows - 1, currentCell.row + 1);
        break;
      case 'left':
        newCol = Math.max(0, currentCell.col - 1);
        break;
      case 'right':
        newCol = Math.min(columns - 1, currentCell.col + 1);
        break;
    }

    if (newRow !== currentCell.row || newCol !== currentCell.col) {
      if (isShiftPressed.current && onMultiSelect) {
        onMultiSelect(newRow, newCol, true);
      } else {
        onCellSelect(newRow, newCol);
      }
    }
  }, [currentCell, rows, columns, onCellSelect, onMultiSelect]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Track shift key state
    if (event.key === 'Shift') {
      isShiftPressed.current = true;
    }

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        moveCell('up');
        break;
      case 'ArrowDown':
        event.preventDefault();
        moveCell('down');
        break;
      case 'ArrowLeft':
        event.preventDefault();
        moveCell('left');
        break;
      case 'ArrowRight':
        event.preventDefault();
        moveCell('right');
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (onCellActivate) {
          onCellActivate(currentCell.row, currentCell.col);
        }
        break;
      case 'Escape':
        event.preventDefault();
        if (onEscape) {
          onEscape();
        }
        break;
      case 'Home':
        event.preventDefault();
        if (event.ctrlKey) {
          // Go to first cell
          onCellSelect(0, 0);
        } else {
          // Go to start of row
          onCellSelect(currentCell.row, 0);
        }
        break;
      case 'End':
        event.preventDefault();
        if (event.ctrlKey) {
          // Go to last cell
          onCellSelect(rows - 1, columns - 1);
        } else {
          // Go to end of row
          onCellSelect(currentCell.row, columns - 1);
        }
        break;
      case 'PageUp':
        event.preventDefault();
        // Move up by visible rows (approximate)
        const pageUpRow = Math.max(0, currentCell.row - 10);
        onCellSelect(pageUpRow, currentCell.col);
        break;
      case 'PageDown':
        event.preventDefault();
        // Move down by visible rows (approximate)
        const pageDownRow = Math.min(rows - 1, currentCell.row + 10);
        onCellSelect(pageDownRow, currentCell.col);
        break;
    }
  }, [enabled, currentCell, rows, columns, moveCell, onCellActivate, onCellSelect, onEscape]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Shift') {
      isShiftPressed.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [enabled, handleKeyDown, handleKeyUp]);

  return {
    currentCell,
    moveCell
  };
}

/**
 * Hook for managing grid cell focus
 */
export function useGridCellFocus(gridRef: React.RefObject<HTMLElement>) {
  const focusCell = useCallback((row: number, col: number) => {
    if (!gridRef.current) return;

    const cellSelector = `[data-grid-cell="${row}-${col}"]`;
    const cell = gridRef.current.querySelector(cellSelector) as HTMLElement;
    
    if (cell) {
      cell.focus();
      cell.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest', 
        inline: 'nearest' 
      });
    }
  }, [gridRef]);

  const blurAllCells = useCallback(() => {
    if (!gridRef.current) return;

    const focusedCell = gridRef.current.querySelector('[data-grid-cell]:focus') as HTMLElement;
    if (focusedCell) {
      focusedCell.blur();
    }
  }, [gridRef]);

  return {
    focusCell,
    blurAllCells
  };
}