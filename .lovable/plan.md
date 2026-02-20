

# Smart Date Handling for Bank Statements

## Problem
When you uploaded an October statement, dates like `01/10/25` were interpreted as January 10th instead of October 1st. This happens because:
1. The AI extracts dates in the raw format from the statement (e.g., `01/10/25`)
2. The calendar then guesses which part is the month vs day -- and guesses wrong for Australian dd/MM format
3. There is no mechanism to use the statement's own context (header, period, filename) to resolve ambiguity

## Solution
Fix this at the source -- make the AI return dates in a single unambiguous format (yyyy-MM-dd) by using the statement's own context clues (header month, statement period, etc.) to resolve dd/MM vs MM/dd ambiguity.

### Changes

### 1. Update AI System Prompt (Edge Function)
**File:** `supabase/functions/parse-statement/index.ts`

Update the system prompt to instruct the AI to:
- Look at the statement header, title, or period to determine the statement month
- Use that context to correctly interpret ambiguous dates (e.g., if the statement says "October 2025", then `01/10/25` = October 1st)
- Always return dates in **yyyy-MM-dd** (ISO) format, not the raw format from the statement
- Default to dd/MM/yy (Australian) when no context clues are available

Updated prompt rules:
- "IMPORTANT: Look at the statement header, title, or period line to determine what month/year this statement covers."
- "Use that context to correctly interpret ambiguous date formats (dd/MM vs MM/dd)."
- "If the statement says 'October 2025' but a date reads '01/10/25', that means 1 October 2025, NOT 10 January."
- "Default to dd/MM/yy (day/month/year, Australian format) when no context is available."
- "Return ALL dates in yyyy-MM-dd format (e.g., 2025-10-01)."

### 2. Normalize CSV Dates in the Edge Function
**File:** `supabase/functions/parse-statement/index.ts`

For CSV parsing (which doesn't go through the AI), add a post-processing step:
- After parsing all transaction dates, analyze the batch to detect the likely format
- If all dates have day values <= 12 (ambiguous), check if a consistent month emerges from one interpretation vs the other
- Apply a `normalizeDate` function that converts raw dates to yyyy-MM-dd using the detected format
- Default to dd/MM (Australian) for ambiguous cases

### 3. Simplify Calendar Date Parsing
**File:** `src/components/TransactionCalendar.tsx`

Since dates will now arrive in consistent yyyy-MM-dd format from the backend:
- Keep the multi-format `parseDate` as a fallback for legacy data
- But prioritize `yyyy-MM-dd` as the first format tried (move it to top of the list)

### 4. Redeploy Edge Function
The updated edge function will be automatically deployed.

## What You Will See
- Upload an Australian bank statement and dates will be correctly placed in the right month
- The calendar will open to the correct month (e.g., October for an October statement)
- Mixed-format statements will be handled intelligently using context from the statement header
- CSV files will also get smart date detection

