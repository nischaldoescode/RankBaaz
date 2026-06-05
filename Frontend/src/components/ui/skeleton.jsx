/**
 * renders the reusable skeleton ui primitive with accessible states and theme friendly styling
 *
 * @file frontend/src/components/ui/skeleton.jsx
 * @module frontend/src/components/ui/skeleton
 * @exports component used by pages and shared layouts
 */

import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-primary/10", className)}
      {...props} />
  );
}

export { Skeleton }
