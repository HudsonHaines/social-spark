// src/components/Skeleton.jsx
import React from 'react';

const cx = (...a) => a.filter(Boolean).join(" ");

// Base skeleton component
export function Skeleton({ className = "", children, ...props }) {
  return (
    <div
      className={cx(
        "animate-pulse bg-gray-200 rounded",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Skeleton for text lines
export function SkeletonText({ lines = 1, className = "" }) {
  return (
    <div className={cx("space-y-2", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={cx(
            "h-4",
            i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"
          )}
        />
      ))}
    </div>
  );
}

// Skeleton for avatar/circular images
export function SkeletonAvatar({ size = "w-10 h-10", className = "" }) {
  return (
    <Skeleton className={cx(size, "rounded-full", className)} />
  );
}

// Skeleton for rectangular images
export function SkeletonImage({ className = "" }) {
  return (
    <Skeleton className={cx("aspect-square w-full", className)} />
  );
}

// Skeleton for buttons
export function SkeletonButton({ className = "" }) {
  return (
    <Skeleton className={cx("h-9 w-20 rounded-md", className)} />
  );
}

// Skeleton for deck list items
export function SkeletonDeckItem() {
  return (
    <div className="px-3 py-2 border-b last:border-b-0">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Skeleton className="w-4 h-4 rounded-full" />
          <Skeleton className="w-4 h-4 rounded-full" />
          <div className="min-w-0 flex-1">
            <SkeletonText lines={1} className="mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="w-8 h-6 rounded" />
      </div>
    </div>
  );
}

// Skeleton for post cards in deck items
export function SkeletonPostCard() {
  return (
    <div className="border border-app rounded-lg overflow-hidden">
      <div className="aspect-square bg-gray-200 animate-pulse relative">
        <div className="absolute top-2 right-2">
          <Skeleton className="w-12 h-6 rounded-full" />
        </div>
      </div>
      <div className="p-2">
        <SkeletonText lines={1} className="mb-1" />
        <Skeleton className="h-3 w-20 mb-2" />
        <div className="flex items-center justify-end gap-2">
          <SkeletonButton className="w-12 h-6" />
          <SkeletonButton className="w-16 h-6" />
        </div>
      </div>
    </div>
  );
}

// Skeleton for delivery page post cards
export function SkeletonDeliveryCard() {
  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/40 overflow-hidden">
      <div className="flex flex-col lg:flex-row">
        {/* Preview Section */}
        <div className="lg:w-80 lg:flex-shrink-0">
          <SkeletonImage className="aspect-square" />
        </div>
        
        {/* Content Section */}
        <div className="flex-1 p-6 lg:p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <Skeleton className="h-8 w-24 mb-2" />
              <Skeleton className="h-4 w-40" />
            </div>
            <SkeletonButton className="h-12 w-32" />
          </div>
          
          {/* Content sections */}
          <div className="space-y-6">
            <div>
              <Skeleton className="h-6 w-20 mb-3" />
              <div className="bg-gray-50 rounded-xl p-4">
                <SkeletonText lines={3} />
              </div>
            </div>
            
            <div>
              <Skeleton className="h-6 w-32 mb-3" />
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-xl p-4">
                  <SkeletonText lines={2} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Skeleton for the main deck loading state
export function SkeletonDeckPage() {
  return (
    <div className="panel w-full overflow-hidden flex flex-col">
      <div className="panel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SkeletonButton className="h-9 w-16" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonButton className="h-9 w-24" />
          <SkeletonButton className="h-9 w-20" />
          <SkeletonButton className="h-9 w-16" />
        </div>
      </div>

      <div className="bg-app-surface p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Deck list skeleton */}
          <div className="card p-0 overflow-hidden">
            <div className="px-3 py-2 border-b">
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="max-h-[60vh] overflow-auto">
              {Array.from({ length: 5 }, (_, i) => (
                <SkeletonDeckItem key={i} />
              ))}
            </div>
          </div>

          {/* Items skeleton */}
          <div className="md:col-span-2 card p-0 overflow-hidden">
            <div className="px-3 py-2 border-b">
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }, (_, i) => (
                <SkeletonPostCard key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}