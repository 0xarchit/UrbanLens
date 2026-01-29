import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

export const config = {
  API_BASE_URL: extra.API_BASE_URL || process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000',
  SUPABASE_URL: extra.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL,
  SUPABASE_ANON_KEY: extra.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
};
