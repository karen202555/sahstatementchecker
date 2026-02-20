

# Speed Up Multi-File Statement Parsing

## Problem
When uploading 3 documents, each file is sent to the backend one after another (sequentially). Each PDF requires an AI call to Gemini which takes 10-30 seconds. So 3 PDFs = 30-90 seconds of waiting.

## Solution: Two Changes

### 1. Upload all files in parallel (client-side)
**File:** `src/components/FileDropzone.tsx`

Change the sequential `for` loop to `Promise.all()` so all 3 files are uploaded and parsed at the same time instead of one by one. This alone can cut total time by ~60-70%.

Also add per-file progress feedback so you can see which files have finished.

### 2. Use a faster AI model for parsing (backend)
**File:** `supabase/functions/parse-statement/index.ts`

Switch from `google/gemini-2.5-pro` to `google/gemini-2.5-flash`. Flash is significantly faster (2-5x) while still accurate enough for structured data extraction like bank statement parsing. Pro is overkill for this task.

## What You Will See
- All files process simultaneously instead of waiting for each one
- A progress indicator showing "Parsed 1 of 3...", "Parsed 2 of 3..." etc.
- Total parsing time drops from ~60-90 seconds to ~15-25 seconds for 3 PDFs

## Technical Details

### Client changes (`src/components/FileDropzone.tsx`)
- Replace the `for (const file of files) { await uploadAndParse(...) }` loop with `Promise.all(files.map(...))`
- Add a `parsedCount` state to show real-time progress (e.g., "Parsed 2 of 3 files...")
- Update the button text during parsing to show this progress

### Backend changes (`supabase/functions/parse-statement/index.ts`)
- Change model from `google/gemini-2.5-pro` to `google/gemini-2.5-flash` in the `parseWithAI` function
- No other backend changes needed

