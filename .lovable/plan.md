
Goal: Fix the auth header visual so the logo sits appropriately in the top-left area without covering the page, while keeping the background image visible/transparent behind the form.

1) What is currently wrong
- The logo is set to `h-[30rem]`, which is far too large, especially on mobile.
- The current logo rendering creates a big visual block over the page, making it look like the transparent background image is gone.
- Positioning is technically top-left, but sizing/composition makes it feel broken.

2) Implementation plan
- File: `src/pages/Auth.tsx`
- Update the logo presentation from “giant hero image” to “top-left brand mark”.

Planned changes:
- Keep the logo absolutely positioned in the top-left, but use sensible responsive sizing:
  - Example target behavior: compact on mobile, larger on desktop (not screen-dominating).
- Add safe spacing from edges so it feels intentionally placed:
  - Top/left offsets that scale slightly with breakpoint.
- Preserve layering so the background photo remains visible:
  - Background image at lowest layer.
  - Logo above background.
  - Form content above both.
- If the logo asset itself has a white matte/background, apply display styling that visually blends better with the page (e.g., blend/contain treatment) so it no longer appears as a giant white rectangle.
- Keep the sign-in panel readable and unobstructed.

3) Visual composition target
- Top-left logo occupies roughly a small header-brand zone (not more than ~20–25% viewport width on mobile).
- Background image remains clearly visible across full screen.
- Form remains centered and fully readable with no overlap.

4) Validation checklist (after implementation)
- `/auth` mobile: logo is visibly in top-left and does not cover inputs or CTA.
- `/auth` desktop/tablet: logo still top-left and proportionate.
- Background image remains visible behind content.
- No regression to login/signup/forgot-password behavior.

5) Technical details
- Primary file: `src/pages/Auth.tsx`
- Primary element to adjust: top-left `<img alt="Statement Checker" ... src={logo} />`
- Class strategy:
  - Replace fixed giant height (`h-[30rem]`) with responsive max-height/width classes.
  - Keep `absolute` positioning with top-left offsets.
  - Maintain explicit z-index ordering between background, logo, and form containers.
  - Optionally add blend/contain utility classes if needed to neutralize white matte appearance from the asset.
