import AsyncStorage from '@react-native-async-storage/async-storage';
import { Issue } from '../types';

const CACHE_KEY = 'ISSUES_CACHE';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

interface CacheData {
  issues: Issue[];
  timestamp: number;
}

export const cacheService = {
  /**
   * Retrieves issues from cache.
   * @param ignoreExpiry If true, returns cached data even if expired (useful for initial render while fetching)
   */
  async getIssuesCache(ignoreExpiry = false): Promise<Issue[] | null> {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      
      const data: CacheData = JSON.parse(cached);
      const isExpired = Date.now() - data.timestamp > CACHE_EXPIRY_MS;
      
      if (isExpired && !ignoreExpiry) {
        // We don't clear here if we want to allow stale retrieval later
        return null;
      }
      
      return data.issues;
    } catch {
      return null;
    }
  },

  async setIssuesCache(issues: Issue[]): Promise<void> {
    try {
      const data: CacheData = {
        issues,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch {
      // Ignore write errors
    }
  },

  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
    } catch {
      // Ignore errors
    }
  },
};
