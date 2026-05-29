import { createMMKV } from 'react-native-mmkv';
import { StateStorage } from 'zustand/middleware';

export const storage = createMMKV({ id: 'manan-os-store' });

// Zustand persist middleware adapter (synchronous MMKV)
export const zustandMMKVStorage: StateStorage = {
  getItem: (name) => storage.getString(name) ?? null,
  setItem: (name, value) => storage.set(name, value),
  removeItem: (name) => { storage.remove(name); },
};

// TanStack Query sync persister storage adapter
export const tanstackMMKVStorage = {
  getItem: (name: string): string | null => storage.getString(name) ?? null,
  setItem: (name: string, value: string): void => storage.set(name, value),
  removeItem: (name: string): void => { storage.remove(name); },
};

// Typed MMKV sync queue helpers — keyed per-user
export const getSyncQueue = (userId: string): string => {
  return storage.getString(`${userId}_sync_queue`) ?? '[]';
};

export const setSyncQueue = (userId: string, queue: unknown[]): void => {
  storage.set(`${userId}_sync_queue`, JSON.stringify(queue));
};

export const clearSyncQueue = (userId: string): void => {
  storage.remove(`${userId}_sync_queue`);
};
