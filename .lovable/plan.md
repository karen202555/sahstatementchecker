

## Plan: Make the logo larger and improve white background removal

### Problem
1. The logo is too small to read clearly on the page.
2. The white background on the logo PNG is not fully removed by `mix-blend-multiply` -- it shows as a washed-out area against the background photo.

### What I will do

**File: `src/pages/Auth.tsx`** (line 82 only)

1. **Make the logo significantly larger**: Change from `h-24 md:h-36 lg:h-44` to `h-32 md:h-44 lg:h-56` (128px on mobile, 176px on tablet, 224px on desktop). This makes the "StatementChecker" text clearly readable.

2. **Keep `mix-blend-multiply`** -- this is the best CSS-only approach to hide the white background. It works well against the photo background. The result will not be perfect pixel-for-pixel transparency, but it will look natural.

### What will NOT change
- Background image opacity stays at 60%.
- Logo stays top-left positioned.
- Form, inputs, auth logic -- all untouched.

### Note on true transparency
If you have access to a version of this logo with a transparent background (PNG with no white), that would give the cleanest result. The current file has white baked in, so CSS blending is the best workaround available.

