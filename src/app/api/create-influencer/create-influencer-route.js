import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

export async function POST(req) {
  try {
    const { name, email, code } = await req.json();

    if (!name || !email || !code) {
      return NextResponse.json({ error: 'name, email and code are required' }, { status: 400 });
    }

    // Normalize code to uppercase, no spaces
    const normalizedCode = code.toUpperCase().replace(/\s+/g, '');

    const { data, error } = await supabase
      .from('influencers')
      .insert({ name, email, code: normalizedCode })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Code or email already exists' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, influencer: data });
  } catch (err) {
    console.error('Create influencer error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
