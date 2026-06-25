import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { generateId } from '@/lib/generateId';
import { zustandMMKVStorage } from '@/lib/mmkv';

export interface ActiveSet {
  id: string;
  exerciseId: string;
  setIndex: number;
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
  isWarmup: boolean;
  isDropSet: boolean;
  restSeconds: number | null;
  isCompleted: boolean;
}

export interface ActiveExercise {
  exerciseId: string;
  exerciseName: string;
  isUnilateral: boolean;
  defaultRestSeconds: number | null;
  restSecondsOverride: number | null;
  sets: ActiveSet[];
}

interface SessionState {
  sessionId: string | null;
  startedAt: string | null;
  exercises: ActiveExercise[];
  restTimerSeconds: number | null;

  // Selectors
  hasActiveSession: () => boolean;

  // Lifecycle — NEVER call reset on unmount/blur; only on explicit "Finish" or "Discard"
  startSession: () => void;
  finishSession: () => ActiveExercise[];
  discardSession: () => void;

  // Exercise management
  addExercise: (exerciseId: string, exerciseName: string, isUnilateral?: boolean, defaultRestSeconds?: number | null) => void;
  removeExercise: (exerciseId: string) => void;

  // Set management
  addSet: (exerciseId: string, partial?: Partial<Omit<ActiveSet, 'id' | 'exerciseId' | 'setIndex'>>) => void;
  updateSet: (exerciseId: string, setId: string, updates: Partial<Omit<ActiveSet, 'id' | 'exerciseId' | 'setIndex'>>) => void;
  removeSet: (exerciseId: string, setId: string) => void;

  // Rest timer
  setRestTimer: (seconds: number) => void;
  clearRestTimer: () => void;
  setExerciseRestSeconds: (exerciseId: string, seconds: number | null) => void;
  completeSet: (exerciseId: string, setId: string, restSeconds?: number) => void;
}

const emptyState = {
  sessionId: null,
  startedAt: null,
  exercises: [],
  restTimerSeconds: null,
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      ...emptyState,

      hasActiveSession: () => get().sessionId !== null,

      startSession: () =>
        set({
          sessionId: generateId(),
          startedAt: new Date().toISOString(),
          exercises: [],
          restTimerSeconds: null,
        }),

      // Returns exercises snapshot to flush into useMutation before clearing
      finishSession: () => {
        const exercises = get().exercises;
        set({ ...emptyState });
        return exercises;
      },

      discardSession: () => set({ ...emptyState }),

      addExercise: (exerciseId, exerciseName, isUnilateral = false, defaultRestSeconds = null) =>
        set((s) => {
          if (s.exercises.some((e) => e.exerciseId === exerciseId)) return s;
          return { exercises: [...s.exercises, { exerciseId, exerciseName, isUnilateral, defaultRestSeconds, restSecondsOverride: null, sets: [] }] };
        }),

      removeExercise: (exerciseId) =>
        set((s) => ({ exercises: s.exercises.filter((e) => e.exerciseId !== exerciseId) })),

      addSet: (exerciseId, partial = {}) =>
        set((s) => ({
          exercises: s.exercises.map((e) => {
            if (e.exerciseId !== exerciseId) return e;
            const setIndex = e.sets.length + 1;
            const newSet: ActiveSet = {
              id: generateId(),
              exerciseId,
              setIndex,
              weightKg: null,
              reps: null,
              rpe: null,
              isWarmup: false,
              isDropSet: false,
              restSeconds: null,
              isCompleted: false,
              ...partial,
            };
            return { ...e, sets: [...e.sets, newSet] };
          }),
        })),

      updateSet: (exerciseId, setId, updates) =>
        set((s) => ({
          exercises: s.exercises.map((e) => {
            if (e.exerciseId !== exerciseId) return e;
            return {
              ...e,
              sets: e.sets.map((ws) =>
                ws.id === setId ? { ...ws, ...updates } : ws,
              ),
            };
          }),
        })),

      removeSet: (exerciseId, setId) =>
        set((s) => ({
          exercises: s.exercises.map((e) => {
            if (e.exerciseId !== exerciseId) return e;
            const filtered = e.sets.filter((ws) => ws.id !== setId);
            // Re-index after removal
            return {
              ...e,
              sets: filtered.map((ws, i) => ({ ...ws, setIndex: i + 1 })),
            };
          }),
        })),

      setRestTimer: (seconds) => set({ restTimerSeconds: seconds }),
      clearRestTimer: () => set({ restTimerSeconds: null }),

      setExerciseRestSeconds: (exerciseId, seconds) =>
        set((s) => ({
          exercises: s.exercises.map((e) =>
            e.exerciseId === exerciseId ? { ...e, restSecondsOverride: seconds } : e,
          ),
        })),

      completeSet: (exerciseId, setId, restSeconds = 90) =>
        set((s) => {
          const exercise = s.exercises.find((e) => e.exerciseId === exerciseId);
          const effectiveRest = exercise?.restSecondsOverride ?? restSeconds;
          return {
            restTimerSeconds: effectiveRest,
            exercises: s.exercises.map((e) => {
              if (e.exerciseId !== exerciseId) return e;
              return {
                ...e,
                sets: e.sets.map((ws) =>
                  ws.id === setId ? { ...ws, isCompleted: true } : ws,
                ),
              };
            }),
          };
        }),
    }),
    {
      name: 'session-store',
      storage: createJSONStorage(() => zustandMMKVStorage),
    },
  ),
);
