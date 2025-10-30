import { Skeleton } from '@/components/ui/skeleton';

/**
 * Settings Page Loading State
 *
 * Displayed automatically by Next.js while settings page data is loading.
 * Shows skeleton matching SettingsPageClient form structure.
 */
export default function SettingsLoading() {
  return (
    <div className="container max-w-2xl py-8">
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-9 w-32 rounded-md" /> {/* "Settings" heading */}
          <Skeleton className="h-5 w-96 max-w-full rounded" /> {/* Description */}
        </div>

        {/* Form skeleton */}
        <div className="space-y-6 p-6 rounded-lg border bg-card">
          {/* Default deadline days field */}
          <div className="space-y-2">
            <Skeleton className="h-5 w-48 rounded" /> {/* Label */}
            <Skeleton className="h-10 w-full rounded-md" /> {/* Input */}
            <Skeleton className="h-4 w-64 rounded" /> {/* Help text */}
          </div>

          {/* Timezone field */}
          <div className="space-y-2">
            <Skeleton className="h-5 w-32 rounded" /> {/* Label */}
            <Skeleton className="h-10 w-full rounded-md" /> {/* Select dropdown */}
            <Skeleton className="h-4 w-80 max-w-full rounded" /> {/* Detected timezone text */}
          </div>

          {/* Apply to existing items checkbox */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" /> {/* Checkbox */}
              <Skeleton className="h-5 w-56 rounded" /> {/* Label with count */}
            </div>
            <Skeleton className="h-4 w-72 max-w-full rounded" /> {/* Help text */}
          </div>

          {/* Submit button */}
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}
