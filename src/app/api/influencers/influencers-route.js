import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getEmailFromRequest } from '../../../lib/auth';
import { isAdminEmail } from '../../../lib/adminEmails';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

export async function GET(request) {
  const email = await getEmailFromRequest(request);
  if (!isAdminEmail(email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { data, error } = await supabase
      .from('influencers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ influencers: data });
  } catch (err) {
    console.error('List influencers error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
