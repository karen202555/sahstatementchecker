

# Rename "Parsing" to "Processing"

Replace all user-facing instances of "parse/parsing/parsed" with more intuitive "process/processing/processed" terminology.

## Changes

### `src/components/FileDropzone.tsx`
- Button text: "Parse 3 files" → "Process 3 files"
- Progress text: "Parsed 2 of 3..." → "Processing 2 of 3..."
- State variable names stay as-is (internal, no user impact)

### `src/pages/Index.tsx` (if any references)
- Update any headings or descriptions mentioning "parse"

### Toast messages in `FileDropzone.tsx`
- Error toast title: "Parsing failed" → "Processing failed"

