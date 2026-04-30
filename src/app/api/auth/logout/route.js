export const runtime = 'edge'

export async function POST() {
  const res = Response.json({ ok: true })
  res.headers.set('Set-Cookie', 'measure_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0')
  return res
}
