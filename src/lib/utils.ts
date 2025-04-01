import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { pb } from "./pocketbase";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function handleError(error: Error) {
  // TODO: Implement error logging and handling - use toast
  console.error(error)
}

export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function getUserId(msg: string = 'User is not logged in'): string | null {
  const user = pb.authStore.record;
  if (!user?.id) {
    handleError(new Error(msg));
    return null;
  }
  return user.id;
}
