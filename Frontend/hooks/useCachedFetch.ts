"use client";

import { useState, useEffect, useCallback } from "react";

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_KEY_PREFIX = "urbanlens_cache_";

// Helper to get full URL (duplicated logic, but safe for synchronous init)
const getFullUrl = (url: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
  return url.startsWith("http") ? url : `${baseUrl}${url}`;
};

export function useCachedFetch<T>(url: string, options?: RequestInit) {
  const fullUrl = url ? getFullUrl(url) : "";

  // 1. Initialize logic: Try memory cache -> Try localStorage -> Default null
  const [data, setData] = useState<T | null>(() => {
    if (!fullUrl) return null; // Skip if no URL
    // Try memory first (fastest)
    if (cache.has(fullUrl)) {
      return cache.get(fullUrl)!.data;
    }
    // Try localStorage (persistence)
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(CACHE_KEY_PREFIX + fullUrl);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Hydrate memory cache while we're at it
          cache.set(fullUrl, parsed); 
          return parsed.data;
        }
      } catch (e) {
        console.warn("Cache parse error", e);
      }
    }
    return null;
  });

  // Calculate generic initial loading state based on whether we found data
  const [loading, setLoading] = useState(() => {
    if (!fullUrl) return true; // Default to loading if waiting for URL? Or false? 
    // Actually if URL is empty, we are "idle". Let's say loading=true if we expect a URL eventuall?
    // Consistently, if URL is missing, we are NOT loading data yet because we can't.
    // Ideally loading should be false if URL is empty, but let's stick to simple logic:
    const cached = cache.get(fullUrl);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return false; 
    }
    return true; 
  });

  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async (isRevalidating = false) => {
    if (!fullUrl) return; // Skip fetch if no URL

    const cached = cache.get(fullUrl);
    const isCacheValid = cached && (Date.now() - cached.timestamp < CACHE_TTL);

    // If we have valid cache and we are NOT forcing a revalidate, stopping here is an option
    // BUT the user wants "background sync", so we proceeds to fetch unless completely fresh? 
    // Actually, "stale-while-revalidate" means we show cached, but fetch anyway.
    
    if (!isRevalidating) {
      if (isCacheValid) {
        setLoading(false); 
      } else {
        setLoading(true);
      }
    }

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      };

      const res = await fetch(fullUrl, { ...options, headers });
      
      if (!res.ok) {
        // If 401/403, we might want to handle it (though api.ts usually does)
        if (res.status === 401) localStorage.removeItem("token");
        throw new Error(`Fetch error: ${res.status}`);
      }

      const freshData = await res.json();
      const cacheEntry = { data: freshData, timestamp: Date.now() };

      // Update Memory
      cache.set(fullUrl, cacheEntry);
      
      // Update LocalStorage
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(CACHE_KEY_PREFIX + fullUrl, JSON.stringify(cacheEntry));
        } catch (e) {
           console.warn("Quota exceeded likely", e);
        }
      }

      setData(freshData);
      setError(null);
    } catch (err) {
      console.error("Fetch failed:", err);
      if (!data) setError(err as Error); // Only show error if no cached data
    } finally {
      if (!isRevalidating) setLoading(false);
    }
  }, [fullUrl, JSON.stringify(options)]); 

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const revalidate = () => fetchData(true);

  return { data, loading, error, revalidate };
}
