// Stubs Coach 2 (Phase 3.2). Replaced by real generateObject in Phase 4.3.

export type FoodUnit = 'g' | 'ml' | 'serving' | 'piece';

export interface ParsedItem {
  name: string;
  quantity: number;
  unit: FoodUnit;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface ParseResult {
  items: ParsedItem[];
  confidence_score: number;
  clarification_needed: boolean;
  clarification_message: string | null;
}

const KNOWN_FOODS: Record<string, ParsedItem[]> = {
  egg: [{ name: 'Egg', quantity: 1, unit: 'piece', kcal: 78, protein_g: 6, carbs_g: 0.6, fat_g: 5 }],
  eggs: [{ name: 'Egg', quantity: 2, unit: 'piece', kcal: 156, protein_g: 12, carbs_g: 1.2, fat_g: 10 }],
  banana: [{ name: 'Banana', quantity: 1, unit: 'piece', kcal: 89, protein_g: 1.1, carbs_g: 23, fat_g: 0.3 }],
  oats: [{ name: 'Oats', quantity: 80, unit: 'g', kcal: 303, protein_g: 11, carbs_g: 54, fat_g: 5 }],
  rice: [{ name: 'White Rice (cooked)', quantity: 200, unit: 'g', kcal: 260, protein_g: 5, carbs_g: 57, fat_g: 0.4 }],
  chicken: [{ name: 'Chicken Breast', quantity: 150, unit: 'g', kcal: 248, protein_g: 47, carbs_g: 0, fat_g: 5 }],
  dal: [{ name: 'Dal (lentil curry)', quantity: 1, unit: 'serving', kcal: 180, protein_g: 12, carbs_g: 28, fat_g: 3 }],
  chapati: [{ name: 'Chapati', quantity: 2, unit: 'piece', kcal: 200, protein_g: 5, carbs_g: 38, fat_g: 4 }],
  roti: [{ name: 'Roti', quantity: 2, unit: 'piece', kcal: 200, protein_g: 5, carbs_g: 38, fat_g: 4 }],
  salad: [{ name: 'Mixed Green Salad', quantity: 1, unit: 'serving', kcal: 35, protein_g: 2, carbs_g: 6, fat_g: 0.3 }],
  milk: [{ name: 'Whole Milk', quantity: 250, unit: 'ml', kcal: 150, protein_g: 8, carbs_g: 12, fat_g: 8 }],
  coffee: [{ name: 'Black Coffee', quantity: 240, unit: 'ml', kcal: 5, protein_g: 0.3, carbs_g: 0, fat_g: 0 }],
  apple: [{ name: 'Apple', quantity: 1, unit: 'piece', kcal: 95, protein_g: 0.5, carbs_g: 25, fat_g: 0.3 }],
  bread: [{ name: 'Bread', quantity: 2, unit: 'piece', kcal: 160, protein_g: 5, carbs_g: 30, fat_g: 2 }],
  protein: [{ name: 'Protein Shake', quantity: 1, unit: 'serving', kcal: 130, protein_g: 25, carbs_g: 5, fat_g: 2 }],
  shake: [{ name: 'Protein Shake', quantity: 1, unit: 'serving', kcal: 130, protein_g: 25, carbs_g: 5, fat_g: 2 }],
  yogurt: [{ name: 'Greek Yogurt', quantity: 150, unit: 'g', kcal: 130, protein_g: 15, carbs_g: 9, fat_g: 4 }],
  paneer: [{ name: 'Paneer', quantity: 100, unit: 'g', kcal: 265, protein_g: 18, carbs_g: 3, fat_g: 21 }],
  almonds: [{ name: 'Almonds', quantity: 30, unit: 'g', kcal: 174, protein_g: 6, carbs_g: 6, fat_g: 15 }],
};

const AMBIGUOUS_TRIGGERS = ['food', 'lunch', 'dinner', 'breakfast', 'the usual', 'something', 'stuff', 'ate'];

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
}

export function mockParseNlp(text: string): ParseResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      items: [],
      confidence_score: 0,
      clarification_needed: true,
      clarification_message: 'Please describe what you ate in more detail.',
    };
  }

  const tokens = tokenize(trimmed);
  const matched: ParsedItem[] = [];

  for (const token of tokens) {
    if (KNOWN_FOODS[token]) {
      matched.push(...KNOWN_FOODS[token]);
    }
  }

  // De-duplicate by name (keep first match)
  const seen = new Set<string>();
  const deduped = matched.filter((item) => {
    if (seen.has(item.name)) return false;
    seen.add(item.name);
    return true;
  });

  const hasAmbiguousTrigger = tokens.some((t) => AMBIGUOUS_TRIGGERS.includes(t));

  if (deduped.length === 0) {
    if (hasAmbiguousTrigger) {
      return {
        items: [],
        confidence_score: 45,
        clarification_needed: true,
        clarification_message: 'What specific foods did you eat? (e.g., "2 eggs, 1 banana, and a cup of oats")',
      };
    }
    return {
      items: [],
      confidence_score: 30,
      clarification_needed: true,
      clarification_message: "I couldn't identify any food items. Try describing what you ate (e.g., \"chicken and rice\").",
    };
  }

  const confidence = Math.min(95, 70 + deduped.length * 5);

  return {
    items: deduped,
    confidence_score: confidence,
    clarification_needed: false,
    clarification_message: null,
  };
}
