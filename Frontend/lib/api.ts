"use client";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
if (!API_URL) {
  throw new Error("Missing NEXT_PUBLIC_API_URL");
}
const REQUEST_TIMEOUT_MS = 30000;
const MAX_RETRIES = 2;

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retries = 0,
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const res = await fetchWithTimeout(
      `${API_URL}${endpoint}`,
      { ...options, headers },
      REQUEST_TIMEOUT_MS,
    );

    if (res.status === 401 || res.status === 403) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/signin";
      }
      throw new ApiError("Session expired. Please sign in again.", res.status);
    }

    if (res.status >= 500 && retries < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, 1000 * (retries + 1)));
      return apiRequest<T>(endpoint, options, retries + 1);
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new ApiError(data.detail || "Request failed", res.status);
    }

    if (res.status === 204) {
      return {} as T;
    }

    return res.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new ApiError("Request timed out. Please try again.", 408);
      }
      if (retries < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1000 * (retries + 1)));
        return apiRequest<T>(endpoint, options, retries + 1);
      }
    }

    throw new ApiError("Network error. Please check your connection.", 0);
  }
}

export async function apiGet<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, { method: "GET" });
}

export async function apiPost<T>(endpoint: string, body?: unknown): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiPatch<T>(
  endpoint: string,
  body?: unknown,
): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiDelete(endpoint: string): Promise<void> {
  await apiRequest(endpoint, { method: "DELETE" });
}

export { ApiError };
