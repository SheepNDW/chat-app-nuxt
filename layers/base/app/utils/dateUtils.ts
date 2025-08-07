import type { Chat } from '~~/layers/chat/app/types';

/**
 * Checks if a given date is within the last specified number of days from now.
 * @param date - The Date object to check.
 * @param days - The number of days in the lookback period.
 * @returns True if the date is within the last 'days' days, false otherwise.
 */
export function isWithinDays(date: Date, days: number): boolean {
  const now = new Date();
  const timeAgo = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return date >= timeAgo;
}

/**
 * Filters an array of Chat objects by a date range relative to the current date.
 * @param chats - Array of Chat objects to filter.
 * @param startDays - Lower bound in days; if endDays is undefined, returns chats older than this value.
 * @param endDays - Optional upper bound in days; when provided, returns chats between startDays and endDays days old.
 * @returns Array of Chat objects filtered by the specified date range and sorted by updatedAt descending.
 */
export function filterChatsByDateRange(chats: Chat[], startDays: number, endDays?: number) {
  return chats
    .filter((chat) => {
      const date = new Date(chat.updatedAt);
      if (endDays === undefined) {
        // For older chats (e.g., older than 30 days)
        return !isWithinDays(date, startDays);
      }
      // For date ranges (e.g., between 1-7 days)
      return !isWithinDays(date, startDays) && isWithinDays(date, endDays);
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}
