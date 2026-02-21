

# User Profile Settings Page

## What You Get
A new "/settings" page accessible from the header, where you can:
- **Update your display name** with instant save
- **Change your password** (new password + confirmation)
- **Set preferred language** (dropdown, stored for future multilingual support)

## How It Works

### New Route and Page
A new `src/pages/Settings.tsx` page with three clearly separated sections in card layouts. The route `/settings` is added as a protected route in `App.tsx`.

### Header Update
A small gear/settings icon (or your avatar) in `src/components/Header.tsx` links to `/settings`, giving easy access from any page.

### Display Name
- Pre-fills with your current display name from the profile
- On save, updates both the `profiles` table (via Supabase) and the auth user metadata
- Shows a success toast on completion

### Change Password
- Two fields: new password and confirm password
- Client-side validation (minimum 6 characters, passwords must match)
- Calls `supabase.auth.updateUser({ password })` to update
- Shows success/error feedback

### Preferred Language
- A dropdown with English selected by default (more languages added later with the multilingual plan)
- Stored in the `profiles` table via a new `preferred_language` column (default: `'en'`)
- This column will be read by the i18n system when multilingual support is implemented

## Technical Details

### Database Change
One migration to add the language column:
```sql
ALTER TABLE public.profiles
  ADD COLUMN preferred_language text NOT NULL DEFAULT 'en';
```

### Files Created
- `src/pages/Settings.tsx` -- the settings page with three form sections

### Files Modified
- `src/App.tsx` -- add `/settings` as a protected route
- `src/components/Header.tsx` -- add a settings link/icon next to the sign-out button
- `src/hooks/use-auth.tsx` -- include `preferred_language` in the Profile type and `loadProfile` query

### Validation
- Display name: trimmed, 1-100 characters
- Password: minimum 6 characters, must match confirmation
- Language: must be one of the supported locale codes

