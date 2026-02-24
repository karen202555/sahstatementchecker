

# Statement Checker — Complete Build Prompt

---

## Purpose

**Statement Checker** is a web application for Australian NDIS and Support at Home (SAH) participants to upload provider billing statements (PDF, CSV, or TXT), automatically extract transactions, and detect overcharges, duplicates, unusual fees, and billing anomalies. It helps participants and their families identify billing errors and generate dispute reports to send to providers or plan managers.

---

## Tech Stack

- **Frontend:** React 18 + TypeScript, Vite, React Router v6, Tailwind CSS, shadcn/ui (Radix primitives), Recharts, jsPDF + jspdf-autotable, date-fns, TanStack React Query
- **Backend:** Supabase (Postgres database, Auth, Edge Functions)
- **AI:** Lovable AI Gateway (`google/gemini-2.5-flash`) for parsing PDFs and TXT files into structured transaction data
- **Font:** Inter (Google Fonts)
- **Color theme:** Teal primary (`hsl(168, 72%, 40%)`), light/dark mode support

---

## Database Tables

### `transactions`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, `gen_random_uuid()` |
| session_id | text | Groups files uploaded together |
| date | text | `yyyy-MM-dd` format |
| description | text | Transaction description |
| amount | numeric | Negative = expense, positive = income |
| file_name | text | Nullable, original upload filename |
| user_id | uuid | Nullable, linked to auth user |
| created_at | timestamptz | Default `now()` |

**RLS:** Users can SELECT and DELETE own rows (`auth.uid() = user_id`). No INSERT or UPDATE via client — inserts happen via edge function using service role.

### `transaction_decisions`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| transaction_id | uuid | FK-like reference to transactions |
| user_id | uuid | Auth user |
| decision | text | `approve`, `dispute`, or `not-sure` |
| note | text | Nullable, free-text reason for dispute |
| created_at / updated_at | timestamptz | |

**RLS:** Full CRUD for own rows. Unique constraint on `(transaction_id, user_id)`.

### `decision_memory`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | Auth user |
| category | text | Auto-categorized label (e.g. "Meals & Food") |
| preferred_decision | text | `approve`, `dispute`, or `not-sure` |
| occurrence_count | integer | Default 1, increments each time |
| created_at / updated_at | timestamptz | |

**RLS:** Full CRUD for own rows. Unique constraint on `(user_id, category)`. Used for "smart suggestions" — after 2+ decisions on a category, the app suggests the same decision for new transactions in that category.

### `profiles`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, matches auth.users.id |
| display_name | text | Nullable |
| preferred_language | text | Default `'en'` |
| created_at / updated_at | timestamptz | |

**RLS:** Users can SELECT, INSERT, UPDATE own profile. Auto-created on signup via trigger.

### `beta_feedback`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| session_id | text | Which upload session |
| rating | text | `accurate`, `missed`, or `incorrect` |
| comment | text | Nullable |
| user_id | uuid | Nullable |
| created_at | timestamptz | |

**RLS:** Anyone can INSERT. Users can SELECT own rows.

---

## Edge Functions

### `parse-statement` (JWT verification disabled)
- Accepts `multipart/form-data` with `file` (PDF/CSV/TXT, max 5MB) and `session_id` (UUID).
- Rate-limited: 20 requests per session per hour.
- **CSV parsing:** Custom parser that auto-detects headers, date formats (DD/MM vs MM/DD, defaults Australian DD/MM), and amount columns. Handles currency symbols, parentheses for negatives, comma separators.
- **PDF/TXT parsing:** Sends file content to Lovable AI Gateway (`google/gemini-2.5-flash`) with a detailed system prompt instructing it to extract transactions as a JSON array of `{date, description, amount}`. PDFs are sent as base64-encoded images. TXT is sent as truncated text (15,000 chars max).
- Sanitizes descriptions (strips CSV injection characters, 500 char max). Validates amounts (max 1 billion).
- Inserts parsed transactions into `transactions` table using **service role key** (bypasses RLS).
- Returns `{transactions, count, low_confidence}`. Low confidence is flagged when parsing yields few valid results relative to input size.

### `get-shared-transactions`
- Public GET endpoint. Accepts `session_id` query param (validated as UUID).
- Uses service role to read transactions for a session — enables shared link access without authentication.
- Returns `{transactions: [...]}`.

---

## Authentication

- **Email/password** auth via Supabase Auth. Email confirmation required (no auto-confirm).
- **Beta gating:** Signup requires an invite code (`BETA2026`, case-insensitive). Invalid code shows toast with instructions to email `admin@statementchecker.au`.
- **Signup fields:** Display name, beta invite code, email, password (min 6 chars).
- **Password reset:** "Forgot password?" link sends reset email. Redirect URL is hardcoded to `https://sahstatementchecker.lovable.app/reset-password` (with localhost fallback for dev). The `/reset-password` page listens for `PASSWORD_RECOVERY` auth event, shows new password form, calls `updateUser({password})`, then redirects to home.
- **Auth context:** `AuthProvider` wraps the app, provides `user`, `session`, `profile`, `loading`, `signOut`. Uses `onAuthStateChange` listener set up before `getSession()`.

---

## Routes

| Path | Access | Component | Description |
|---|---|---|---|
| `/auth` | Public only (redirects to `/` if logged in) | Auth | Login / Signup / Forgot password |
| `/reset-password` | Public | ResetPassword | Set new password from email link |
| `/` | Protected | Index | Home — file upload + statement history |
| `/results?session=<uuid>` | Public | Results | View parsed transactions (shareable) |
| `/settings` | Protected | Settings | Profile, password, language preferences |
| `*` | Public | NotFound | 404 page |

---

## User Flow

1. User visits `/auth`, signs up with beta code `BETA2026`, display name, email, password.
2. Receives confirmation email, clicks link, lands on home page.
3. On `/` (home), user sees a **file dropzone** — drag & drop or click to browse. Accepts `.pdf`, `.csv`, `.txt`. Multiple files allowed.
4. User clicks "Process N file(s)" button. Each file is sent to `parse-statement` edge function. A new `session_id` (UUID) is generated client-side.
5. On completion, user is redirected to `/results?session=<uuid>`.
6. Results page shows:
   - **Issue Summary panel** — 4 stats: total transactions, possible duplicates, anomalies, fee issues.
   - **Tabs:** Calendar (default), Table, Summary, Alerts.
   - **Action bar:** Share link, Print, Excel export, PDF report, Export Disputes (if any), Clear Memory.
7. Authenticated users can **approve/dispute/mark "not sure"** each transaction in the Table view. Disputes expand an inline note field.
8. Decision memory learns user preferences by category — after 2+ decisions, suggests the same for new transactions.
9. **Beta feedback** widget at bottom of results asks "Was this analysis accurate?" with options: Yes / Some issues missed / Something flagged incorrectly, plus optional comment.
10. Home page shows **statement history** for logged-in users — grouped by session, showing file names, upload date, transaction count, date range. Users can view or delete individual sessions, or clear all.

---

## Transaction Categorization

Keyword-based categorization into 13 categories, each with an assigned HSL color:
- **Income** (keywords: income, payment received, deposit, credit, funding, ndis payment, etc.)
- **Nursing** (nursing, nurse)
- **Meals & Food** (meal, food, lunch, dinner, catering, grocery, etc.)
- **Domestic** (domestic, cleaning, laundry, housekeeping, home care)
- **Allied Health** (allied health, dietician, physio, therapy, occupational, speech, psychology)
- **Transport** (transport, taxi, uber, bus, fuel, parking, toll)
- **Personal Care** (personal care, hygiene, grooming, pharmacy, chemist)
- **Housing & Accommodation** (rent, housing, accommodation, sil, supported independent)
- **Health & Medical** (medical, health, doctor, hospital, dental)
- **Community & Social** (community, social, activity, recreation, excursion)
- **Support Worker** (support worker, support staff, carer, aide)
- **Fees & Admin** (fee, admin, management, plan management, service fee, commission)
- **Equipment & Supplies** (equipment, supplies, consumable, assistive, wheelchair, continence)
- **Other** (fallback)

Matching is case-insensitive, first match wins.

---

## Overcharge Detection Logic

Four detection algorithms run client-side on the transactions array:

1. **Duplicate detection:** Pairwise comparison using trigram-based fuzzy similarity on descriptions. Flags pairs where:
   - Same date + similar amount (within $0.50) + description similarity >= 0.6, OR
   - Similarity >= 0.8 + similar amount + 1-3 days apart, OR
   - Same date + similarity >= 0.85 + similar amount.
   Severity: high.

2. **Unusual amounts:** IQR-based outlier detection. Flags transactions where `amount > Q3 + 1.5 * IQR` and `amount > $50`. Severity: medium.

3. **Changed fees:** Groups transactions by normalized description. If the same service has >10% price variation (and >$5 difference), flags it. Severity: high if >50% change, else medium.

4. **Management fee check:** Identifies management/admin line items by keywords (admin, management, package management, on-cost, coordination, case management). In "self-managed" mode (default): flags if total management fees exceed 10% of total service charges (high severity), or individual admin charges >$100 (medium). In "provider-managed" mode: flags individual admin charges >$200 or >50% of average service charge.

---

## UI Components & Layout

### Header
- Logo (FileSpreadsheet icon in teal rounded square) + "Statement Checker" text. Clickable, navigates to `/`.
- When logged in: shows user display name (or email), Settings gear icon, Sign out button.

### Home Page (`/`)
- Centered layout, max-width container.
- Headline: "Don't get **overcharged**" (primary color on "overcharged").
- Subtitle about Support at Home provider statements.
- File dropzone (max-width 2xl, dashed border, drag-and-drop with visual feedback).
- Selected files list with size and remove button.
- "Process N file(s)" button.
- Beta disclaimer with info icon.
- Statement history section (logged-in users only).
- Feature cards: 3-column grid — "Smart Processing", "Overcharge Detector", "Export & Share".

### Results Page (`/results`)
- Back to Home button + transaction count.
- Action buttons: Share, Print, Excel, PDF Report, Export Disputes, Clear Memory.
- Issue Summary card (4-stat grid).
- Tabbed content:
  - **Table:** Full transaction table with columns: Date (DD/MM/YYYY display), Category (colored dot + label), Description, Govt. Contribution (placeholder dash), Client Contribution (placeholder dash), Income (green, right-aligned), Expense (red, right-aligned), Flag (destructive badge), Decision (approve/dispute/not-sure buttons with smart suggestions). Rows are color-coded by category, decision state, or flag state. Dispute rows expand with note input.
  - **Calendar:** Month/week/day views. Auto-navigates to month with most transactions. Each day cell shows transaction pills color-coded by category with amount and description. Flagged items show in red. Legend bar at bottom. Navigation with prev/next arrows and Today button.
  - **Summary:** Pie chart (Recharts) of spending by category + category breakdown list with percentages + monthly totals grid (if multiple months).
  - **Alerts:** Card list of detected issues, each with icon, severity badge, title, description, and involved transaction details. Shows "No issues detected" with shield icon if clean.
- Beta feedback widget at bottom.
- Dispute export dialog: modal with pre-formatted plain text dispute report, copy-to-clipboard button.

### Settings Page (`/settings`)
- Back button, "Settings" heading.
- Three cards: Display Name (text input + save), Change Password (new + confirm + update), Preferred Language (dropdown: English, Vietnamese, Chinese, Japanese, Korean, Spanish, French — saved to profile).

### Print Support
- Elements with class `no-print` are hidden when printing (action buttons, tabs, feedback).
- Calendar has a print header.

---

## Export Outputs

### Excel Export
- TSV format with `.xls` extension and BOM for Excel compatibility.
- Columns: Date, Description, Amount.

### PDF Report (jsPDF + jspdf-autotable)
- Title: "Statement Analysis Report"
- Generated date + period + transaction count + total.
- Section 1: Spending by Category table (category, count, total, % of spend) with green header.
- Section 2: Potential Issues table (severity, type, issue, details) with red header — only if alerts exist.
- Section 3: Disputed Transactions table (date, description, amount, reason) — only if disputed transactions exist.
- Section 4: All Transactions table (date, description, amount) with striped theme.
- Footer on each page: "Statement Checker · Page X of Y".

### Dispute Report (plain text)
- Header: "DISPUTED TRANSACTIONS - STATEMENT REVIEW"
- Date, total disputed items, total disputed amount.
- Numbered list with date, description, amount, reason for each disputed transaction.
- Footer: "Generated by SAH Statement Checker".
- Displayed in a modal dialog with copy-to-clipboard button.

---

## Settings & Configuration

- `supabase/config.toml`: `parse-statement` function has `verify_jwt = false` (allows unauthenticated uploads so the edge function handles auth extraction from JWT manually).
- Published URL: `https://sahstatementchecker.lovable.app`
- Beta invite code: `BETA2026` (hardcoded in Auth.tsx, case-insensitive comparison).
- Rate limit: 20 file uploads per session per hour (in-memory map in edge function).
- Max file size: 5MB.
- Max CSV: 10,000 lines / 1MB text.
- AI model: `google/gemini-2.5-flash` via `https://ai.gateway.lovable.dev/v1/chat/completions`.
- Date format default: Australian DD/MM/YYYY with auto-detection.

