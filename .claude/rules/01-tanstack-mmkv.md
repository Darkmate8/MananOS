# LAWS OF OFFLINE MUTATIONS: TANSTACK QUERY + MMKV

You must enforce this pattern for all data modifications. Direct, unguarded Supabase API writes within client components are strictly forbidden.

## 1. STORAGE ARCHITECTURE

- **Global Store:** Use `react-native-mmkv` via `@tanstack/react-query-persist-client` to cache all query states.
- **The Sync Queue:** Maintain a specialized MMKV key `[user_id]_sync_queue` storing an ordered array of pending mutations.
- **Idempotency Requirement:** Every local modification must contain a client-side generated `uuidv4` identifier passed explicitly to the `id` table column field to ensure safe server-side `UPSERT` recovery.

## 2. MUTATION LIFECYCLE (THE MANDATORY TRIPLE-PLAY)

When generating any `useMutation` hook for updating data, you must write out these three phases verbatim:

### Phase A: Optimistic UI Update (`onMutate`)

1. Cancel outgoing refetches for the target query key via `queryClient.cancelQueries()`.
2. Snapshot the previous cache state.
3. Direct-write the optimistic client-generated model straight into the TanStack Query cache via `queryClient.setQueryData()`.
4. Return the context snapshot to handle potential fallbacks.

### Phase B: Connectivity Verification (`mutationFn`)

1. Check live connection state via `@react-native-community/netinfo`.
2. **IF ONLINE:** Fire standard Supabase client transaction (`.upsert()`).
3. **IF OFFLINE:** Append the mutation action type, absolute path parameters, table target, and JSON data payload directly to the MMKV sync queue array. Return a resolved promise immediately to prevent UI blocking.

### Phase C: Error & Settlement Handling (`onError` / `onSettled`)

- **`onError`:** If the online write throws an explicit error, instantly roll back the cache state using the context snapshot collected in Phase A.
- **`onSettled`:** Invalidate relevant query keys to ensure automated client background syncing occurs smoothly whenever online networks settle.

## 3. GLOBAL SYNC MANAGER HOOK (`useSyncQueue`)

- Generate a root-level hook that monitors `@react-native-community/netinfo` state shifts.
- When network status transitions from `false -> true` (offline to online), trigger an atomic processing loop:
  1. Read the MMKV sync queue array.
  2. Shift the oldest operation out of the array.
  3. Execute the matching Supabase `.upsert()` operation.
  4. If successful, clear that element from MMKV and continue to the next item until the queue is completely exhausted.
