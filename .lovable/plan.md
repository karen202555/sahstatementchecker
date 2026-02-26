

## Problem

The logo is set to `h-[30rem]` (480px) with `absolute top-6 left-6`, but it is not appearing on the page. Looking at the code, the `src` points to `/lovable-uploads/263f22f8-fe64-4aeb-8063-b91884509880.png`. The logo was also saved as `src/assets/logo.png` and imported at the top of the file, but the `img` tag is using the public path instead of the imported asset.

## Fix

Update the logo `<img>` tag to use the imported `logo` variable (which references `src/assets/logo.png`) instead of the hardcoded public path. Keep the positioning (`absolute top-6 left-6`) and large size (`h-[30rem]`).

### Change in `src/pages/Auth.tsx`

Line 82 — change:
```tsx
<img alt="Statement Checker" className="absolute top-6 left-6 h-[30rem] w-auto z-10" src="/lovable-uploads/263f22f8-fe64-4aeb-8063-b91884509880.png" />
```
to:
```tsx
<img alt="Statement Checker" className="absolute top-6 left-6 h-[30rem] w-auto z-10" src={logo} />
```

This uses the already-imported `logo` from `src/assets/logo.png`, which is the uploaded image that was saved earlier. The logo will render in the top-left corner at the large size requested.

