/**
 * provides teacher utils helpers for class merging, shared ui behavior, and component utilities
 *
 * @file teachers/src/lib/utils.js
 * @module teachers/src/lib/utils
 * @exports helpers imported by related app modules
 */

import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
