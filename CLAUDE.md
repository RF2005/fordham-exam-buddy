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
  - `AddExam.tsx`: Two-method exam entry (manual and database lookup)
  - `TestReminders.tsx`: Reminder preferences management

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
- `send-exam-reminders`: Cron-triggered function that sends email reminders via Resend API based on user preferences
- `test-send-reminders`: Manual testing endpoint for reminder functionality
- `populate-courses`: Import course data into database
- `import-all-courses`: Batch course import

**Authentication**: Supabase Auth with email/password. Session checks in pages enforce authentication.

### Key Integration Points

1. **Exam Reminder System**:
   - Users set reminder_days array in notification_preferences table
   - `send-exam-reminders` edge function runs on cron (requires CRON_SECRET auth header)
   - Function queries upcoming exams and sends emails via Resend API
   - Email template includes exam details with Fordham branding

2. **Final Exam Lookup**:
   - `final_exam_schedules` table pre-populated with Fordham's official schedule
   - Users search by subject + course number in [AddExam.tsx](src/pages/AddExam.tsx)
   - Results auto-populate exam form for quick entry

## Environment Variables

Required in `.env`:
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key

Required in Supabase Edge Functions (set in Supabase dashboard):
- `RESEND_API_KEY`: Resend API key for email delivery
- `CRON_SECRET`: Secret for authenticating cron jobs
- `SUPABASE_URL`: Auto-provided by Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Auto-provided by Supabase

## Supabase Configuration

**Edge Function Settings** ([supabase/config.toml](supabase/config.toml)):
- `send-exam-reminders`: JWT verification disabled (uses CRON_SECRET instead)
- `test-send-reminders`: JWT verification enabled

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
