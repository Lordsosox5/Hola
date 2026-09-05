import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase environment variables are missing. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your .env file.'
  );
}

const expoSecureStoreAdapter = {
  async getItem(key: string) {
    const value = await SecureStore.getItemAsync(key);
    return value ?? null;
  },
  async setItem(key: string, value: string) {
    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string) {
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase: SupabaseClient = createClient(supabaseUrl ?? 'https://khpattkykgsxpimzbavk.supabase.co', supabaseAnonKey ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtocGF0dGt5a2dzeHBpbXpiYXZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMDM4MDgsImV4cCI6MjEwMzc3OTgwOH0.5cdavp0bxBNDrjdxblpJwRRZrBWFhy4Y98wFtA2mhzk', {
  auth: {
    storage: expoSecureStoreAdapter,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'tawsel-mobile',
    },
  },
});

export const legacyStorage = {
  async getItem(key: string) {
    return AsyncStorage.getItem(key);
  },
  async setItem(key: string, value: string) {
    await AsyncStorage.setItem(key, value);
  },
  async removeItem(key: string) {
    await AsyncStorage.removeItem(key);
  },
};

export const getSupabaseSession = async () => {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error('Supabase session error:', error.message);
  }

  return data.session;
};
