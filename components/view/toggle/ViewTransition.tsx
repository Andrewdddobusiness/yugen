"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useItineraryLayoutStore } from "@/store/itineraryLayoutStore";
import { cn } from "@/lib/utils";

interface ViewTransitionProps {
  children: React.ReactNode;
  viewKey: string;
  className?: string;
  loadingComponent?: React.ReactNode;
}

const transitionVariants = {
  initial: { 
    opacity: 0, 
    scale: 0.95,
    y: 10 
  },
  animate: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.4, 0.0, 0.2, 1]
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    y: -10,
    transition: {
      duration: 0.2,
      ease: [0.4, 0.0, 1, 1]
    }
  }
};

const slideVariants = {
  initial: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 50 : -50,
    scale: 0.98
  }),
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.4, 0.0, 0.2, 1]
    }
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -50 : 50,
    scale: 0.98,
    transition: {
      duration: 0.3,
      ease: [0.4, 0.0, 1, 1]
    }
  })
};

export function ViewTransition({ 
  children, 
  viewKey, 
  className,
  loadingComponent 
}: ViewTransitionProps) {
  const { 
    layoutPreferences, 
    isTransitioningView, 
    transitionDuration 
  } = useItineraryLayoutStore();

  const { enableAnimations } = layoutPreferences;

  // If animations are disabled, render without transitions
  if (!enableAnimations) {
    return (
      <div className={cn("h-full w-full", className)}>
        {isTransitioningView && loadingComponent ? loadingComponent : children}
      </div>
    );
  }

  return (
    <div className={cn("h-full w-full relative overflow-hidden", className)}>
      <AnimatePresence mode="wait" initial={false}>
        {isTransitioningView ? (
          loadingComponent && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 flex items-center justify-center bg-bg-50/80 dark:bg-ink-900/80"
            >
              {loadingComponent}
            </motion.div>
          )
        ) : (
          <motion.div
            key={viewKey}
            variants={transitionVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="h-full w-full"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ViewSlideTransition({ 
  children, 
  viewKey, 
  className,
  direction = 1 
}: ViewTransitionProps & { direction?: number }) {
  const { layoutPreferences, isTransitioningView } = useItineraryLayoutStore();
  const { enableAnimations } = layoutPreferences;

  if (!enableAnimations) {
    return <div className={cn("h-full w-full", className)}>{children}</div>;
  }

  return (
    <div className={cn("h-full w-full relative overflow-hidden", className)}>
      <AnimatePresence mode="wait" initial={false} custom={direction}>
        {!isTransitioningView && (
          <motion.div
            key={viewKey}
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            custom={direction}
            className="h-full w-full"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ViewLoadingState() {
  return (
    <div className="flex items-center justify-center h-32">
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <div className="w-8 h-8 border-2 border-stroke-200 rounded-full animate-spin">
            <div className="absolute top-0 left-0 w-8 h-8 border-2 border-brand-500 rounded-full border-t-transparent animate-spin"></div>
          </div>
        </div>
        <p className="text-sm text-ink-500 dark:text-white/70 font-medium">Switching view…</p>
      </div>
    </div>
  );
}
