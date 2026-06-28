# Google Setup — מה אתה צריך לעשות

הקוד מוכן. בלי ההגדרות האלה, **Import from Google Business** ו-**העלאת מדיה** לא יעבדו.

---

## 1. Supabase — הרץ migration חדש

SQL Editor → הרץ:

`supabase/migrations/003_gmb_and_media.sql`

זה מוסיף:
- שדות GMB ל-`businesses`
- Storage bucket `check-in-media`
- טבלת tokens ל-Google Business

---

## 2. Google Cloud Console

פתח: https://console.cloud.google.com

### A. הפעל APIs (חובה)

ב-**APIs & Services → Library**, חפש והפעל:

| API | למה |
|-----|-----|
| **Maps JavaScript API** | כתובות / autocomplete |
| **Places API** | כתובות |
| **My Business Account Management API** | רשימת חשבונות GMB |
| **My Business Business Information API** | רשימת locations |

### B. OAuth Consent Screen

**APIs & Services → OAuth consent screen**

1. User type: **External** (או Internal אם Workspace)
2. App name: `FieldCheck`
3. Add scope: `https://www.googleapis.com/auth/business.manage`
4. Test users: הוסף את המייל שלך (במצב Testing)

### C. OAuth Client ID

**APIs & Services → Credentials → Create Credentials → OAuth client ID**

- Type: **Web application**
- Authorized redirect URIs — הוסף **שניהם**:

```
http://localhost:3000/api/google-business/callback
https://olympos-beta.vercel.app/api/google-business/callback
```

שמור:
- **Client ID**
- **Client Secret**

> אפשר להשתמש באותו OAuth client של Supabase Google login — רק להוסיף את ה-redirect URI החדש.

---

## 3. Environment Variables

הוסף ל-`.env.local` **ול-Vercel**:

```env
# Google OAuth (GMB import + future publish)
GOOGLE_OAUTH_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret

# Already required
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_key
APP_BASE_URL=http://localhost:3000
```

ב-Vercel production:
```env
APP_BASE_URL=https://olympos-beta.vercel.app
```

---

## 4. בדיקה — צעד אחר צעד

```bash
cd mentor-app && npm run dev
```

1. `/login` → Google
2. `/businesses` → **Connect Google Business**
3. אשר הרשאות → חזרה לאתר
4. לחץ **Refresh locations** → **Import**
5. `/check-ins` → צור check-in → העלה תמונות/סרטון

---

## 5. שגיאות נפוצות

| שגיאה | פתרון |
|--------|--------|
| `Google OAuth is not configured` | חסרים `GOOGLE_OAUTH_CLIENT_ID/SECRET` |
| `redirect_uri_mismatch` | ה-redirect URI לא תואם ב-Google Console |
| `Access blocked: app not verified` | הוסף себя כ-Test user ב-OAuth consent |
| `Failed to load Google Business accounts` | API לא מופעל או חשבון ללא GMB |
| Storage upload failed | הרץ migration 003 |

---

## מה עובד אחרי ההגדרה

| תכונה | סטטוס |
|--------|--------|
| Login עם Google | ✓ |
| Import עסק מ-Google Business | ✓ (אחרי setup) |
| העלאת תמונות/סרטונים ל-check-in | ✓ (אחרי migration 003) |
| שמירה ב-DB + Storage ל-widget | ✓ |
| פרסום post ל-GMB | הבא בתור |

---

אחרי שסיימת — כתוב **"הגדרתי"** ונבדוק יחד.
