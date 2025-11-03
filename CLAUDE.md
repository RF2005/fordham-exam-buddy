# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Fordham Exam Buddy** is a React + TypeScript web application for Fordham University students to manage exam schedules. Students can add exams manually or look them up from Fordham's final exam schedule database. The app includes calendar visualization and automated email reminders.

Built with: Vite, React, TypeScript, Tailwind CSS, shadcn/ui, Supabase (backend + auth), React Query

## Development Commands

```bash
# Install dependencies
npm i

# Run development server
npm run dev

# Build for production
npm run build

# Build in development mode
npm run build:dev

# Lint the codebase
npm run lint

# Preview production build
npm run preview
```

## Architecture Overview

### Frontend Structure

- **Pages** ([src/pages/](src/pages/)): Page components mapped to routes
  - `Auth.tsx`: Authentication page
  - `Dashboard.tsx`: Main dashboard with exam list
  - `Calendar.tsx`: Calendar view of exams
  - `AddExam.tsx`: Three-method exam entry (manual, database lookup, and syllabus upload with OCR)
  - `NotFound.tsx`: 404 error page

- **Routing** ([src/App.tsx](src/App.tsx)): React Router setup with routes for all pages. Auth page is the root route.

- **UI Components** ([src/components/ui/](src/components/ui/)): shadcn/ui component library

- **State Management**:
  - React Query ([src/App.tsx:13](src/App.tsx#L13)) for server state
  - Supabase client for real-time subscriptions and auth

### Backend (Supabase)

**Database Tables** (defined in [src/integrations/supabase/types.ts](src/integrations/supabase/types.ts)):
- `profiles`: User profiles (linked to auth.users)
- `exams`: User-created exam entries
- `courses`: Fordham course catalog
- `final_exam_schedules`: Official Fordham final exam schedule data
- `notification_preferences`: User email reminder settings (reminder_days array)
- `system_config`: Application configuration

**Supabase Edge Functions** ([supabase/functions/](supabase/functions/)):
- `populate-courses`: Import course data into database
- `import-all-courses`: Batch course import

Note: OCR functionality is handled client-side by Tesseract.js - no Edge Function needed.

**Authentication**: Supabase Auth with email/password. Session checks in pages enforce authentication.

### Key Integration Points

1. **Syllabus Parsing with OCR**:
   - Users can upload PDF, DOCX, TXT, or image files (PNG, JPG)
   - Digital PDFs: Extracted using pdfjs-dist (fast, client-side)
   - Scanned PDFs/Images: OCR via Tesseract.js (browser-based, free, no API needed)
   - Extracted text is parsed using strict same-line pattern matching
   - Flow: Upload → Text Extraction (Tesseract.js OCR if needed) → Same-Line Parsing → Display Results
   - Files: [syllabusParser.ts](src/utils/syllabusParser.ts), [ocrService.ts](src/utils/ocrService.ts), [hybridAiParser.ts](src/utils/hybridAiParser.ts)

2. **Final Exam Lookup**:
   - `final_exam_schedules` table pre-populated with Fordham's official schedule
   - Users search by subject + course number in [AddExam.tsx](src/pages/AddExam.tsx)
   - Results auto-populate exam form for quick entry

3. **Calendar Export**:
   - Users can export exams to .ics calendar files
   - Download button in Dashboard and Calendar pages
   - Replaces previous email reminder system

## Environment Variables

Required in `.env`:
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key

No additional environment variables needed for OCR - Tesseract.js runs entirely in the browser with no API keys or server setup required.

## Supabase Configuration

No special Edge Function configuration needed for OCR (handled client-side).

## Important Patterns

- **Form Validation**: Zod schemas (e.g., [AddExam.tsx:17-26](src/pages/AddExam.tsx#L17))
- **Toast Notifications**: useToast hook from shadcn/ui for user feedback
- **Color Coding**: Exams have customizable color field (default: `#821537` - Fordham maroon)
- **Date Handling**:
  - Database stores dates as `YYYY-MM-DD` strings
  - UI uses date-fns for formatting
  - Timezones handled carefully to avoid off-by-one errors

## Deployment

Build and deploy using standard Vite deployment workflow:

```bash
npm run build
```

Deploy the `dist/` directory to any static hosting service:
- Vercel
- Netlify
- GitHub Pages
- Any static host

For custom domains, configure through your hosting provider.
