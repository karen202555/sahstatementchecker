

## Fix: Remove Red-Toned Category Colors

Red is reserved for "Potential Issue" flags, so categories using red/rose/pink tones need new colors to avoid confusion.

### Changes Required

**Affected categories and their new colors:**

| Category | Current Color | New Color |
|---|---|---|
| Nursing | hsl(340, 65%, 50%) (rose/red) | hsl(25, 70%, 50%) (warm amber) |
| Health & Medical | hsl(0, 70%, 55%) (red) | hsl(175, 60%, 40%) (teal) |

### Files to Update

1. **`src/lib/categorize.ts`** (lines 12, 19)
   - Change Nursing color from `hsl(340, 65%, 50%)` to `hsl(25, 70%, 50%)`
   - Change Health & Medical color from `hsl(0, 70%, 55%)` to `hsl(175, 60%, 40%)`

2. **`src/components/TransactionCalendar.tsx`**
   - Update `CATEGORY_COLORS` map: change Nursing from `bg-rose-200` to `bg-amber-200` tones, and Health & Medical from `bg-pink-200` to `bg-teal-200` tones
   - Update `CATEGORY_DOT_COLORS` map to match the new hsl values

This is a small, focused color change across two files with no logic changes.

