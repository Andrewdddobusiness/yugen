"use client";

import * as React from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

export function SharedCalendarDndProvider({
  children,
  enabled = true,
}: {
  children: React.ReactNode;
  enabled?: boolean;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const collisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    const slotCollision = pointerCollisions.find((collision) => collision.id.toString().startsWith("slot-"));
    if (slotCollision) return [slotCollision];
    return closestCenter(args);
  };

  return (
    <DndContext
      sensors={enabled ? sensors : []}
      collisionDetection={enabled ? collisionDetection : closestCenter}
    >
      {children}
    </DndContext>
  );
}
