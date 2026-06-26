/**
 * One-time exercise library import from ExerciseDB (https://exercisedb.dev).
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=... SEED_USER_ID=<auth.users uuid> npx ts-node scripts/seed-exercises.ts
 *
 * Reads EXPO_PUBLIC_SUPABASE_URL from .env automatically. The service-role key is
 * required because RLS restricts `exercises` writes to the row owner; SEED_USER_ID
 * is the anonymous user the app signed in as (visible in Supabase Auth dashboard).
 *
 * Runs once at build time — the app never calls this API at runtime.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const API_URL = 'https://exercisedb.dev/api/v2/exercises?limit=1000';
const COMPOUND_KEYWORDS = ['squat', 'deadlift', 'bench', 'row', 'press'];
const UNILATERAL_KEYWORDS = ['single', 'unilateral'];

interface ExerciseDbItem {
  exerciseId?: string;
  id?: string;
  name: string;
  bodyParts?: string[];
  bodyPart?: string;
  equipments?: string[];
  equipment?: string;
  gifUrl?: string;
  instructions?: string[] | string;
}

interface SeedRow {
  user_id: string;
  external_id: string;
  name: string;
  muscle_group: string | null;
  equipment: string | null;
  is_unilateral: boolean;
  default_rest_seconds: number;
  gif_url: string | null;
  instructions: string | null;
}

function loadEnvUrl(): string {
  if (process.env.EXPO_PUBLIC_SUPABASE_URL) return process.env.EXPO_PUBLIC_SUPABASE_URL;
  const env = readFileSync(join(__dirname, '..', '.env'), 'utf8');
  const match = env.match(/^EXPO_PUBLIC_SUPABASE_URL=(.+)$/m);
  if (!match) throw new Error('EXPO_PUBLIC_SUPABASE_URL not found in env or .env');
  return match[1].trim();
}

function deriveIsUnilateral(name: string, equipment: string | null): boolean {
  const lowerName = name.toLowerCase();
  if (equipment?.toLowerCase() === 'dumbbell') return true;
  return UNILATERAL_KEYWORDS.some((kw) => lowerName.includes(kw));
}

function deriveRestSeconds(name: string, equipment: string | null): number {
  const lowerName = name.toLowerCase();
  if (COMPOUND_KEYWORDS.some((kw) => lowerName.includes(kw))) return 180;
  if (equipment && equipment.toLowerCase().replace(/\s/g, '') === 'bodyweight') return 60;
  return 90;
}

function toRow(item: ExerciseDbItem, userId: string): SeedRow | null {
  const externalId = item.exerciseId ?? item.id;
  if (!externalId || !item.name) return null;

  const muscleGroup = item.bodyParts?.[0] ?? item.bodyPart ?? null;
  const equipment = item.equipments?.[0] ?? item.equipment ?? null;
  const instructions = Array.isArray(item.instructions)
    ? item.instructions.join('\n')
    : item.instructions ?? null;

  return {
    user_id: userId,
    external_id: externalId,
    name: item.name,
    muscle_group: muscleGroup,
    equipment,
    is_unilateral: deriveIsUnilateral(item.name, equipment),
    default_rest_seconds: deriveRestSeconds(item.name, equipment),
    gif_url: item.gifUrl ?? null,
    instructions,
  };
}

async function main(): Promise<void> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const userId = process.env.SEED_USER_ID;
  if (!serviceKey || !userId) {
    console.error('Set SUPABASE_SERVICE_ROLE_KEY and SEED_USER_ID env vars.');
    process.exit(1);
  }

  const supabase = createClient(loadEnvUrl(), serviceKey, {
    auth: { persistSession: false },
  });

  console.log(`Fetching ${API_URL} …`);
  const response = await fetch(API_URL);
  if (!response.ok) throw new Error(`ExerciseDB request failed: ${response.status}`);
  const body = (await response.json()) as { data?: ExerciseDbItem[] } | ExerciseDbItem[];
  const items = Array.isArray(body) ? body : (body.data ?? []);
  console.log(`Fetched ${items.length} exercises.`);

  // Dedupe by name — exercises has unique (user_id, name)
  const seenNames = new Set<string>();
  const rows: SeedRow[] = [];
  for (const item of items) {
    const row = toRow(item, userId);
    if (!row) continue;
    const nameKey = row.name.toLowerCase();
    if (seenNames.has(nameKey)) continue;
    seenNames.add(nameKey);
    rows.push(row);
  }
  console.log(`Prepared ${rows.length} unique rows.`);

  const CHUNK = 200;
  let upserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase
      .from('exercises')
      .upsert(chunk, { onConflict: 'user_id,external_id' });
    if (error) throw new Error(`Upsert failed at chunk ${i / CHUNK}: ${error.message}`);
    upserted += chunk.length;
    console.log(`Upserted ${upserted}/${rows.length}`);
  }

  console.log('Done. Exercise library seeded.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
