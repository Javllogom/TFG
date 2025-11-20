'use server';

import { supabaseServer } from '@/lib/supabase';

// Types you update from the drawer
export type RuleUpdatePayload = {
  title: string;
  rule: string;
  description: string;
  columns: string[];
};

/**
 * Update a rule row in DB.
 * Priority match by id, else by (binary, title) EXACT (untrimmed).
 * Returns number of updated rows.
 */
export async function updateRuleInDb(
  payload: RuleUpdatePayload,
  opts: { id?: string | null; matchBinary: string; matchTitle: string }
): Promise<number> {
  const sb = supabaseServer();

  let q = sb.from('rules').update(payload);

  if (opts.id) {
    q = q.eq('id', opts.id);
  } else {
    // exact DB values (untrimmed) to avoid trailing-space mismatches
    q = q.eq('binary', opts.matchBinary).eq('title', opts.matchTitle);
  }

  // Ask PostgREST to return updated rows to verify success
  const { error, data } = await q.select();
  if (error) throw error;

  return Array.isArray(data) ? data.length : 0;
}
