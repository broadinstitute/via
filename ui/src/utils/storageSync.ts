// The change notifications behind every localStorage-backed store (preferences, recent searches,
// saved searches). A store calls notify() after it writes, and a component subscribes to the
// store's key through useSyncExternalStore so it re-renders when the store changes anywhere in
// the page, or in another tab (the browser's "storage" event, which only fires across tabs).

const listeners = new Map<string, Set<() => void>>();

/** Re-renders every subscriber of `key`. Call after writing that key. */
export function notifyStorageKey(key: string) {
  listeners.get(key)?.forEach((listener) => listener());
}

/** A useSyncExternalStore `subscribe` for one storage key. */
export function subscribeToStorageKey(key: string, listener: () => void): () => void {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(listener);
  // Another tab changing the same key (or clearing storage, where event.key is null).
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === key) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    set.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
