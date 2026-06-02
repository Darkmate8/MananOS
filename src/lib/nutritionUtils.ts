import type { MealWithItems, NutritionTotals } from '@/hooks/useNutritionToday';

export function recomputeTotals(meals: MealWithItems[]): NutritionTotals {
  return meals.reduce(
    (acc, meal) => {
      meal.items.forEach((item) => {
        acc.kcal += item.kcal;
        acc.proteinG += item.proteinG;
        acc.carbsG += item.carbsG;
        acc.fatG += item.fatG;
      });
      return acc;
    },
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}
