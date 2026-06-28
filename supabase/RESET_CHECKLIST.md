# Supabase Reset Checklist

After running `000_reset_legacy_and_create_fieldcheck.sql`, complete these manual steps in the Supabase Dashboard.

## 1. SQL (required)

Dashboard → **SQL Editor** → paste and run:

`supabase/migrations/000_reset_legacy_and_create_fieldcheck.sql`

Expected result at the bottom:

```
businesses
check_in_media
check_ins
```

## 2. Edge Functions (delete manually)

Dashboard → **Edge Functions** → delete if they exist:

- `send-morning-workout`
- `send-morning-reminder`
- `send-evening-reminder`
- `whatsapp-webhook`

## 3. Edge Function Secrets (optional cleanup)

Dashboard → **Edge Functions** → **Secrets** → remove if no longer needed:

- `CRON_SECRET`
- `META_ACCESS_TOKEN`
- `META_PHONE_NUMBER_ID`
- `META_WABA_ID`
- `META_APP_SECRET`
- `META_WEBHOOK_VERIFY_TOKEN`

## 4. Auth (keep as-is)

**Do NOT delete** auth users — Google login accounts stay.

Update if needed:

- **Site URL:** `http://localhost:3000` (dev) or your Vercel URL (prod)
- **Redirect URLs:** `/auth/callback` for localhost + production

## 5. What stays vs. what goes

| Keep | Remove |
|------|--------|
| `auth.users` (Google accounts) | `users`, `user_profile`, `cohorts` |
| `businesses`, `check_ins`, `check_in_media` | `training_*`, `enrollments` |
| Supabase project + API keys | `whatsapp_messages`, `scheduled_messages` |
| Google OAuth provider | WhatsApp cron jobs |
| | `monthly_performance_tests`, `training_debriefs` |
| | All legacy RPC functions & views |
