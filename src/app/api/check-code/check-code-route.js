import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req) {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
  );
  try {
    const { code } = await req.json();
    if (!code) return NextResponse.json({ valid: false });

    const normalized = code.toUpperCase().replace(/\s+/g, '');
    const { data } = await supabase
      .from('influencers')
      .select('id')
      .eq('code', normalized)
      .single();

    return NextResponse.json({ valid: !!data });
  } catch {
    return NextResponse.json({ valid: false });
  }
}
