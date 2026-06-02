import * as SecureStore from 'expo-secure-store';
import { useState, useEffect, useCallback } from 'react';

const KEYS = {
  openai: 'api_key_openai',
  gemini: 'api_key_gemini',
} as const;

export type ApiKeyProvider = keyof typeof KEYS;

async function readKey(provider: ApiKeyProvider): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS[provider]);
}

async function writeKey(provider: ApiKeyProvider, value: string): Promise<void> {
  if (value.trim() === '') {
    await SecureStore.deleteItemAsync(KEYS[provider]);
  } else {
    await SecureStore.setItemAsync(KEYS[provider], value.trim());
  }
}

export async function getApiKey(provider: ApiKeyProvider): Promise<string | null> {
  return readKey(provider);
}

export function useApiKeys() {
  const [openaiKey, setOpenaiKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([readKey('openai'), readKey('gemini')]).then(([oai, gem]) => {
      setOpenaiKey(oai ?? '');
      setGeminiKey(gem ?? '');
      setLoaded(true);
    });
  }, []);

  const save = useCallback(async (): Promise<void> => {
    setSaving(true);
    await Promise.all([writeKey('openai', openaiKey), writeKey('gemini', geminiKey)]);
    setSaving(false);
  }, [openaiKey, geminiKey]);

  const clearAll = useCallback(async (): Promise<void> => {
    setSaving(true);
    await Promise.all([
      SecureStore.deleteItemAsync(KEYS.openai),
      SecureStore.deleteItemAsync(KEYS.gemini),
    ]);
    setOpenaiKey('');
    setGeminiKey('');
    setSaving(false);
  }, []);

  return { openaiKey, setOpenaiKey, geminiKey, setGeminiKey, loaded, saving, save, clearAll };
}
