# משימות הקמה חיצוניות

## 1. Supabase

1. פתח חשבון ב-Supabase.
2. צור Project חדש בשם `mentor`.
3. Region מומלץ: `eu-central-1` או האזור האירופי הקרוב ביותר.
4. שמור:
   - Project URL
   - anon public key
   - service_role key
5. העתק את `.env.example` אל `.env.local` ומלא:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

## 2. Google OAuth

לבצע אחרי ש-Supabase קיים.

1. Google Cloud Console -> Project חדש.
2. OAuth consent screen.
3. Credentials -> OAuth Client ID -> Web application.
4. להוסיף Redirect URL:
   - `https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`
5. ב-Supabase:
   - Authentication -> Providers -> Google -> Enable
   - להדביק Client ID + Client Secret

## 3. Meta WhatsApp Cloud API

לא נדרש לשלב הקוד הראשון. נדרש לפני n8n.

צריך להשיג:
1. Meta Business Account.
2. WhatsApp Business Account ID.
3. Phone Number ID.
4. Permanent System User Access Token.
5. App Secret.
6. Business verification במידת הצורך.

## 4. n8n

לא לפתוח workflow עדיין. קודם מחברים Supabase ומוכיחים:

1. משתמש נרשם.
2. שאלון נשמר.
3. נוצר אימון יומי.
4. כפתורי ביצוע מעדכנים DB.

אחרי זה בונים workflows.
