export interface ItineraryActivity {
  itinerary_activity_id: string;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  notes?: string;
  created_by?: string | null;
  updated_by?: string | null;
  activity?: {
    activity_id?: string;
    name: string;
    address?: string;
    coordinates?: [number, number];
    types?: string[];
    rating?: number;
    price_level?: string;
    phone_number?: string;
    website_url?: string;
    photo_names?: string[];
    place_id?: string;
  };
  deleted_at?: string | null;
}

export interface EditingField {
  activityId: string;
  field: 'name' | 'time' | 'notes';
}

export interface SortableActivityItemProps {
  activity: ItineraryActivity;
  index: number;
  editingField: EditingField | null;
  editingValues: { [key: string]: string };
  savingStates: { [key: string]: boolean };
  onStartEditing: (activityId: string, field: 'name' | 'time' | 'notes', currentValue: string) => void;
  onCancelEditing: () => void;
  onSaveField: (activity: ItineraryActivity) => void;
  onRemoveActivity: (placeId: string) => void;
  onEditKeyDown: (e: React.KeyboardEvent, activity: ItineraryActivity) => void;
  onEditingValueChange: (key: string, value: string) => void;
  formatTime: (timeString: string | null) => string | null;
  formatTimeForEditing: (startTime: string | null, endTime: string | null) => string;
  validateTimeInput: (value: string) => boolean;
  getPriceDisplay: (priceLevel?: string) => string | null;
  isMobile: boolean;
  isDragging?: boolean;
  // Bulk selection props
  isSelected: boolean;
  onToggleSelection: (activityId: string, selected: boolean, event?: React.MouseEvent) => void;
  selectionMode: boolean;
  searchTerm: string;
}
