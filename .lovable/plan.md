

# Improve PDF Parsing Accuracy

## Problem

The current PDF parsing has a fundamental flaw: it calls `file.text()` on PDF files, which are binary formats. This produces garbled/unreadable text that the AI model then has to guess from, resulting in hallucinated or inaccurate transaction data.

## Solution

Send the PDF as a **base64-encoded file** to Gemini's vision/multimodal capability, so the AI can actually "read" the PDF visually rather than receiving corrupted binary-as-text. Also upgrade the model and prompt for better accuracy.

## Changes

### 1. Update `supabase/functions/parse-statement/index.ts`

**Read PDF as binary (base64) instead of text:**
- For PDF files, read the file as an `ArrayBuffer`, convert to base64
- Send the base64 PDF as an inline data URL in the multimodal message content (using the `image_url` content part with `data:application/pdf;base64,...`)
- Keep `.text()` for CSV/TXT files which are actually text

**Upgrade the AI model:**
- Switch from `google/gemini-3-flash-preview` to `google/gemini-2.5-pro` for better accuracy on complex document extraction

**Improve the prompt:**
- Add explicit instructions to extract exact amounts as shown on the statement
- Instruct the model to differentiate debits (negative) from credits (positive)
- Ask it to exclude summary rows like "Opening Balance" and "Closing Balance"
- Specify expected date format preservation

**Increase truncation limit:**
- Raise the base64 size limit to handle larger statements (most single-page statements fit well within limits)

### 2. No frontend changes needed

The table and calendar views will automatically display the improved data.

## Technical Details

```text
Current flow (broken for PDFs):
  PDF binary --> file.text() --> garbled string --> AI guesses --> wrong data

New flow:
  PDF binary --> ArrayBuffer --> base64 --> multimodal AI message --> accurate extraction
```

Key code changes in the edge function:
- Add `arrayBufferToBase64()` helper
- Branch logic: if PDF, read as ArrayBuffer and encode base64; otherwise read as text
- Update `parseWithAI` to accept either base64 data (for PDFs) or plain text (for TXT)
- Use multimodal content format with `image_url` type for base64 PDFs
- Switch model to `google/gemini-2.5-pro`
- Enhanced system prompt with stricter extraction rules

