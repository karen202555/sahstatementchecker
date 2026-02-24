

## Fix Password Recovery Redirect

**Problem:** When you click "Forgot password?" from the Lovable preview, `window.location.origin` captures the preview URL (e.g., `https://id-preview--...lovable.app`). The reset email link then redirects to that preview URL, which takes you into the Lovable editor instead of your app.

**Solution:** Use your published app URL (`https://sahstatementchecker.lovable.app`) as the redirect target, with a fallback to `window.location.origin` for local development.

### Changes

**File: `src/pages/Auth.tsx`**
- Create a helper that determines the correct app URL:
  - If running on `localhost`, use `window.location.origin` (for local dev)
  - Otherwise, use the published URL `https://sahstatementchecker.lovable.app`
- Update the `resetPasswordForEmail` call to use this helper
- Update the `signUp` email redirect to use the same helper

**File: `src/pages/ResetPassword.tsx`**
- No changes needed -- it already handles the recovery flow correctly once the user lands on the right URL.

### Technical Detail

```text
Before:  redirectTo: `${window.location.origin}/reset-password`
After:   redirectTo: `https://sahstatementchecker.lovable.app/reset-password`
         (with localhost fallback for development)
```

This ensures the password reset email always links to your live published app, regardless of where the request was initiated.
