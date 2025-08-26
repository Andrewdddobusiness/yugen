// This file is temporarily stubbed - wishlist feature is being redesigned
export function DraggableWishlistItem() {
  return null;
}

export function useWishlistItemDrag() {
  return {
    isDraggedItem: false,
    isDragInProgress: false,
    canDrop: true,
    dragState: {}
  };
}

export function createWishlistDragData() {
  return {
    id: '',
    type: 'wishlist-item' as const,
    data: {},
    sourceType: 'wishlist' as const
  };
}