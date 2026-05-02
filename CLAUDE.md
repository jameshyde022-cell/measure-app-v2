# Measure App — Claude Code Guidelines

## Stack
- Next.js deployed on Vercel (Hobby plan — 10 second function limit)
- Supabase for database and storage
- Anthropic API for AI features
- GitHub for version control — Vercel auto-deploys from main branch

## Deployment
After every fix or feature, always end with:
git add .
git commit -m "description of changes"
git push

Never finish a task without pushing. Vercel deploys automatically after push.

## Supabase
- Database table: exported_images
- Storage bucket: exported-images (public)
- Use SUPABASE_SERVICE_ROLE_KEY for all server-side calls
- RLS is disabled on exported_images

## Anthropic
- Model: claude-sonnet-4-20250514
- API key env var: ANTHROPIC_API_KEY
- Vercel Hobby plan has 10 second limit — never send images to Anthropic in server functions, text only

## Rules
- Never exceed Vercel's 10 second function timeout
- Always push to GitHub after completing any task
- Never ask for permission
- When fixing bugs, check client AND server side
- Always add error logging with descriptive prefixes
- Test endpoints must support GET requests
