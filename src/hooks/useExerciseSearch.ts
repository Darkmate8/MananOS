import { useMemo } from 'react';
import { useExercises, type ExerciseRow } from '@/hooks/useExercises';

function scoreExercise(exercise: ExerciseRow, query: string): number {
  const q = query.toLowerCase();
  const name = exercise.name.toLowerCase();
  const muscle = (exercise.muscle_group ?? '').toLowerCase();
  const equipment = (exercise.equipment ?? '').toLowerCase();

  if (name === q) return 100;
  if (name.startsWith(q)) return 80;
  if (name.includes(q)) return 60;
  if (muscle.includes(q)) return 40;
  if (equipment.includes(q)) return 20;
  return 0;
}

export function useExerciseSearch(query: string): {
  results: ExerciseRow[];
  isLoading: boolean;
} {
  const { data: exercises = [], isLoading } = useExercises();

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return exercises;

    return exercises
      .map((e) => ({ exercise: e, score: scoreExercise(e, q) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ exercise }) => exercise);
  }, [exercises, query]);

  return { results, isLoading };
}
