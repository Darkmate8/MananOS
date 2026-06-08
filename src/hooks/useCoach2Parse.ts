import { useState, useCallback } from 'react';
import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import { getApiKey } from '@/hooks/useApiKeys';
import type { ParseResult } from '@/lib/nutritionMockParser';

const COACH_2_SYSTEM = `Role: High-Precision NLP Nutritional Extraction Engine.
Goal: Convert unstructured, natural-language human text describing a meal into a strictly validated, deterministic JSON data object.

CORE OPERATING PRINCIPLES:
- Absolute Silence: You are a background data processor, not a chatbot. Output ONLY the raw JSON object.
- Estimation Engine: You have expert knowledge of global macronutrient profiles. When a user inputs relative measurements ("a handful of almonds", "two medium chapatis", "a large bowl of dal"), extrapolate standard serving sizes and calculate total kilocalories, protein, carbs, and fats.
- Confidence Scoring: Self-assess your parsing accuracy. If an entry is highly ambiguous ("I ate some food" or "the usual lunch"), your confidence score must drop below 70.

EDGE CASE PROTOCOLS:
- Unit Normalization: Always attempt to convert abstract units to standard metric grams (g) or milliliters (ml) when possible. If impossible (e.g., "1 apple"), use "piece".
- Zero Values: If a macronutrient is not present (e.g., zero fat in black coffee), return 0. Do not return null for macro values.
- Compound Meals: If a user logs "a double cheeseburger with medium fries", separate this into at least two distinct objects within the items array.
- Safety Fallback: If the input text contains zero decipherable food items, immediately return a confidence_score of 0, set clarification_needed to true, and request the user to try again in the clarification_message.
- clarification_message MUST be a non-empty string if clarification_needed is true. If clarification_needed is false, return an empty string "" for clarification_message.`;

const NlpResultSchema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.number(),
      unit: z.enum(['g', 'ml', 'serving', 'piece']),
      kcal: z.number(),
      protein_g: z.number(),
      carbs_g: z.number(),
      fat_g: z.number(),
    }),
  ),
  confidence_score: z.number().min(0).max(100),
  clarification_needed: z.boolean(),
  clarification_message: z.string(),
});

export function useCoach2Parse() {
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const parse = useCallback(async (text: string): Promise<ParseResult | null> => {
    setIsParsing(true);
    setParseError(null);

    try {
      const apiKey = await getApiKey('gemini');
      if (!apiKey) {
        setParseError('No Gemini API key configured. Add it in Settings.');
        return null;
      }

      const google = createGoogleGenerativeAI({ apiKey });

      const { object } = await generateObject({
        model: google('gemini-2.5-flash'),
        schema: NlpResultSchema,
        system: COACH_2_SYSTEM,
        prompt: text,
      });

      const needsClarification = object.confidence_score < 70 || object.clarification_needed;
      const clarifyMsg = needsClarification
        ? (object.clarification_message || 'Could you be more specific about what you ate?')
        : null;

      return {
        items: object.items,
        confidence_score: object.confidence_score,
        clarification_needed: needsClarification,
        clarification_message: clarifyMsg,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Parse failed. Try again.';
      setParseError(msg);
      return null;
    } finally {
      setIsParsing(false);
    }
  }, []);

  return { parse, isParsing, parseError };
}
