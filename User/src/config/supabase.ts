import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

type ExtraConfig = Record<string, unknown> | undefined;

const extra =
  (Constants.expoConfig?.extra as ExtraConfig) ??
  ((Constants as any).manifest?.extra as ExtraConfig);

const pickString = (value: unknown): string =>
  typeof value === "string" ? value : "";

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  pickString(extra?.EXPO_PUBLIC_SUPABASE_URL) ??
  pickString(extra?.SUPABASE_URL);

const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  pickString(extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY) ??
  pickString(extra?.SUPABASE_ANON_KEY);

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  process.env.EXPO_PUBLIC_API_URL ??
  pickString(extra?.EXPO_PUBLIC_API_BASE_URL) ??
  pickString(extra?.EXPO_PUBLIC_API_URL) ??
  pickString(extra?.API_BASE_URL);

export const CONFIG_ERROR =
  !SUPABASE_URL || !SUPABASE_ANON_KEY
    ? "Missing Supabase configuration"
    : !API_BASE_URL
      ? "Missing API base URL configuration"
      : null;

export const supabase = CONFIG_ERROR
  ? null
  : createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
