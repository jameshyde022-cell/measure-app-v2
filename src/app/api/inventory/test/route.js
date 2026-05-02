import { getSupabase } from '../../../../lib/auth'

// Force dynamic: this route must run server-side on every request, never pre-rendered.
export const dynamic = 'force-dynamic'

export async function GET() {
  const results = {
    env: {},
    table: {},
    storage: {},
    overall: 'unknown',
  }

  // ── 1. Check env vars (presence only, no values) ──────────────────────────
  results.env = {
    SUPABASE_URL:               !!process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_URL:   !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY:  !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_ANON_KEY:          !!process.env.SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ANTHROPIC_API_KEY:          !!process.env.ANTHROPIC_API_KEY,
    usingKeyType: process.env.SUPABASE_SERVICE_ROLE_KEY
      ? 'service_role (bypasses RLS)'
      : process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ? 'anon (subject to RLS)'
        : 'none',
  }

  // ── 2. Connect to Supabase ─────────────────────────────────────────────────
  let supabase
  try {
    supabase = getSupabase()
    results.table.connected = true
  } catch (e) {
    results.table.connected = false
    results.table.error = e.message
    results.overall = 'FAIL: cannot connect to Supabase'
    return Response.json(results, { status: 200 })
  }

  // ── 3. Test table: does exported_images exist? Can we select? ─────────────
  const { data: selectData, error: selectError } = await supabase
    .from('exported_images')
    .select('id')
    .limit(1)

  if (selectError) {
    results.table.select = 'FAIL'
    results.table.selectError = { code: selectError.code, message: selectError.message, hint: selectError.hint }
    results.table.diagnosis = selectError.code === '42P01'
      ? 'Table does not exist — run supabase/migrations/001_exported_images.sql'
      : selectError.code === '42501' || selectError.message?.toLowerCase().includes('forbidden') || selectError.message?.toLowerCase().includes('rls')
        ? 'RLS is blocking SELECT — run supabase/migrations/002_fix_rls.sql'
        : 'Unknown table error'
  } else {
    results.table.select = 'OK'
    results.table.rowCount = selectData?.length ?? 0
  }

  // ── 4. Test table: can we insert + delete a probe row? ────────────────────
  const { data: insertData, error: insertError } = await supabase
    .from('exported_images')
    .insert({
      user_email:    'test@measure-probe.internal',
      image_url:     'https://probe-delete-me',
      brand:         'PROBE',
      clothing_type: 'test',
    })
    .select('id')
    .single()

  if (insertError) {
    results.table.insert = 'FAIL'
    results.table.insertError = { code: insertError.code, message: insertError.message, hint: insertError.hint }
    results.table.insertDiagnosis = insertError.code === '42501' || insertError.message?.toLowerCase().includes('forbidden')
      ? 'RLS is blocking INSERT — run supabase/migrations/002_fix_rls.sql'
      : insertError.code === '42P01'
        ? 'Table does not exist — run supabase/migrations/001_exported_images.sql'
        : 'Unknown insert error'
  } else {
    results.table.insert = 'OK'
    // Clean up probe row
    await supabase.from('exported_images').delete().eq('id', insertData.id)
    results.table.cleanup = 'probe row deleted'
  }

  // ── 5. Test storage: does the bucket exist? ───────────────────────────────
  const { data: buckets, error: bucketsError } = await supabase
    .storage
    .listBuckets()

  if (bucketsError) {
    results.storage.listBuckets = 'FAIL'
    results.storage.bucketsError = bucketsError.message
  } else {
    const bucket = buckets?.find(b => b.id === 'exported-images')
    results.storage.listBuckets = 'OK'
    results.storage.bucketExists = !!bucket
    results.storage.bucketPublic = bucket?.public ?? null
    if (!bucket) {
      results.storage.bucketDiagnosis = 'Bucket "exported-images" not found — create it in Supabase Storage dashboard (set to Public) then run 002_fix_rls.sql'
    }
  }

  // ── 6. Test storage: can we upload a tiny probe file? ────────────────────
  if (results.storage.bucketExists) {
    const probeBytes = Buffer.from('probe')
    const probePath  = `probe/${Date.now()}.txt`

    const { error: uploadError } = await supabase.storage
      .from('exported-images')
      .upload(probePath, probeBytes, { contentType: 'text/plain', upsert: true })

    if (uploadError) {
      results.storage.upload = 'FAIL'
      results.storage.uploadError = uploadError.message
      results.storage.uploadDiagnosis = uploadError.message?.toLowerCase().includes('forbidden') || uploadError.statusCode === '403'
        ? 'Storage RLS is blocking uploads — run supabase/migrations/002_fix_rls.sql'
        : 'Unknown storage upload error'
    } else {
      results.storage.upload = 'OK'
      // Clean up
      await supabase.storage.from('exported-images').remove([probePath])
      results.storage.cleanup = 'probe file deleted'
    }
  }

  // ── 7. Overall verdict ────────────────────────────────────────────────────
  const allOk = results.table.select === 'OK'
    && results.table.insert === 'OK'
    && results.storage.bucketExists
    && results.storage.upload === 'OK'

  results.overall = allOk
    ? 'ALL OK — pipeline should work'
    : 'FAILURES DETECTED — see individual fields above'

  return Response.json(results, { status: 200 })
}
