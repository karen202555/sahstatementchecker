
# Google Calendar-Style Transaction Calendar

## Problem
1. **Date parsing bug**: Transaction dates are stored as `dd/MM/yy` (e.g., "01/11/25") but the calendar only handles `dd/MM/yyyy`, so no dates match.
2. **Wrong calendar style**: The current small date-picker calendar requires drilling into dates. You want a full Google Calendar-style grid with transactions visible directly on each day.

## Solution
Replace the current `TransactionCalendar` component with a custom-built Google Calendar-style view that supports three view modes:

- **Monthly view** (default): Full grid with 7 columns (Sun-Sat), rows for each week. Transaction descriptions and amounts shown directly in each day cell.
- **Weekly view**: 7-column grid for a single week, with more vertical space per day to show transaction details.
- **Daily view**: Single day showing all transactions in a detailed list format.

The calendar will automatically default to the month containing the transaction data.

## What You Will See
- A toolbar at the top with: Previous/Next navigation arrows, a "Today" button, the current month/week/day label, and Monthly/Weekly/Daily toggle buttons
- In **Monthly view**: A grid like your screenshot - each day cell shows transaction descriptions truncated if needed, with amounts color-coded (red for charges, green for credits)
- In **Weekly view**: Same 7-column layout but taller cells, so more transaction detail is visible per day
- In **Daily view**: A full list of all transactions for that single day with complete descriptions and amounts
- No clicking required to see transactions - they are always visible in the cells

## Technical Details

### 1. Fix date parsing in `TransactionCalendar.tsx`
Add `dd/MM/yy` format to the parseDate function so 2-digit year dates like "01/11/25" are correctly parsed as November 1, 2025.

### 2. Rewrite `TransactionCalendar.tsx`
Replace the entire component with a custom calendar grid:

- **State**: `currentDate` (for navigation), `viewMode` ("month" | "week" | "day")
- **Auto-detect starting month**: Default `currentDate` to the month of the first transaction
- **Monthly grid**: Build a 2D array of weeks using `date-fns` helpers (`startOfMonth`, `startOfWeek`, `endOfMonth`, `endOfWeek`, `eachDayOfInterval`). Render as a CSS grid (7 columns). Each cell shows the day number and up to ~3 transaction snippets with a "+N more" indicator if overflow.
- **Weekly grid**: Same 7-column layout but for a single week, taller cells to show more transactions.
- **Daily view**: Single column listing all transactions for that day with full detail.
- **Navigation**: Previous/Next buttons shift by month, week, or day depending on view mode.
- **Styling**: Charges shown in red, credits in green. Current day highlighted. Days outside current month shown in muted style.

### 3. No changes to `Results.tsx`
The component interface (`transactions` prop) stays the same, so the results page works without modification.

### Dependencies
No new packages needed - uses `date-fns` (already installed) and Tailwind CSS for the grid layout.
