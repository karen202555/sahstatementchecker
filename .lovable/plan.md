

## Plan: Fix Auth Page Logo and Background

### What I will do

1. **Replace the logo file** with the new uploaded image (green checkmark + magnifying glass).
2. **Make the logo larger** — `h-24` on mobile, `md:h-36`, `lg:h-44` (roughly 96px → 144px → 176px). Clearly visible as a brand mark.
3. **Remove the white background** on the logo using `mix-blend-multiply` so it blends naturally with the page.
4. **Fix the background image** — increase opacity from `opacity-40` to `opacity-60` so the background photo is actually visible.

### Changes

**File 1: `src/assets/logo.png`**
- Replace with the uploaded image (`ChatGPT_Image_Feb_26_2026_02_50_07_PM.png`).

**File 2: `src/pages/Auth.tsx`** (two lines)

Line ~80 — background image:
```
opacity-40  →  opacity-60
```

Line ~82 — logo img:
```
h-12 md:h-16 lg:h-20  →  h-24 md:h-36 lg:h-44
```
Add `mix-blend-multiply` class to visually remove white background from the logo.

### Result
- Large, clearly visible logo in top-left with no white rectangle around it.
- Background photo visible behind the form.
- Form stays centered and readable.

