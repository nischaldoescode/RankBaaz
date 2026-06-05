/**
 * provides public utils helpers for class merging, shared ui behavior, and component utilities
 *
 * @file frontend/src/lib/utils.js
 * @module frontend/src/lib/utils
 * @exports helpers imported by related app modules
 */

import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
