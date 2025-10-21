# Fordham Exam Buddy

🔗 **Live Application:** [https://fordhamexambuddy.vercel.app/](https://fordhamexambuddy.vercel.app/)

A modern web application designed for Fordham University students to efficiently manage their exam schedules. Built with React and TypeScript, Exam Buddy provides three convenient ways to add exams—manual entry, lookup from Fordham's official final exam database, or automatic extraction from uploaded syllabi. The app features calendar visualization with multiple view options and automated email reminders to help students stay organized throughout the semester.

**Main Features:**
- Three exam entry methods (manual entry, database lookup, and syllabus upload)
- AI-powered syllabus parsing that automatically extracts exam dates from PDF, DOCX, and TXT files
- Interactive calendar with month, week, day, and agenda views
- Configurable email reminders for upcoming exams
- Color-coded exam organization

## Quick Start

**For Students:**
1. Visit [https://fordhamexambuddy.vercel.app/](https://fordhamexambuddy.vercel.app/)
2. Sign in with your Fordham Google account (@fordham.edu)
3. Start managing your exam schedule!

**For Developers:**
See [Installation Instructions](#installation-instructions) below to run locally.

## Table of Contents

1. [Installation Instructions](#installation-instructions)
2. [Usage Instructions](#usage-instructions)
3. [Contribution Guidelines](#contribution-guidelines)
4. [License Information](#license-information)
5. [Credits](#credits)

## Installation Instructions

### Prerequisites

Before installing Fordham Exam Buddy, ensure you have the following:

- **Node.js** (v18 or higher) and **npm** - [Install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- **Supabase Account** - Required for backend services ([Sign up free](https://supabase.com))
- **Resend API Key** - Required for email reminder functionality ([Get your key](https://resend.com))

### Local Setup

1. **Clone the repository**
   ```bash
   git clone <YOUR_GIT_URL>
   cd fordham-exam-buddy-main
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env` file in the root directory with the following variables:
   ```env
   VITE_SUPABASE_URL=your-supabase-project-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Configure Supabase Edge Functions**

   In your Supabase dashboard, navigate to Edge Functions and set the following secrets:
   ```
   RESEND_API_KEY=your-resend-api-key
   CRON_SECRET=your-custom-cron-secret
   ```

5. **Deploy Supabase Edge Functions**
   ```bash
   # Install Supabase CLI if you haven't already
   npm install -g supabase

   # Link to your Supabase project
   supabase link --project-ref your-project-ref

   # Deploy edge functions
   supabase functions deploy send-exam-reminders
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5173`

### Available Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run build:dev    # Build in development mode
npm run lint         # Lint the codebase
npm run preview      # Preview production build locally
```

## Usage Instructions

### Getting Started

1. **Authentication**
   - Visit the application and sign up with your email address
   - Check your email for a confirmation link
   - Sign in to access your dashboard

2. **Adding Exams**

   Navigate to the "Add Exam" page where you'll find three methods:

   **Method 1: Manual Entry**
   ```typescript
   // Fill out the form with exam details:
   - Course Name (e.g., "Introduction to Computer Science")
   - Exam Type (e.g., "Final", "Midterm")
   - Date and Time
   - Location
   - Notes (optional)
   - Color (for calendar organization)
   ```

   **Method 2: Lookup from Database**
   ```typescript
   // Search Fordham's official exam schedule:
   1. Enter subject code (e.g., "CISC")
   2. Enter course number (e.g., "1600")
   3. Select your course from results
   4. Exam details auto-populate
   ```

   **Method 3: Upload Syllabus (NEW!)**
   ```typescript
   // Automatically extract exam dates from your syllabus:
   1. Enter the course name (e.g., "CISC 1600")
   2. Upload your syllabus file (PDF, DOCX, or TXT)
   3. Review automatically extracted exam dates
   4. Add all exams to your schedule with one click

   // Supported file types:
   - PDF (.pdf)
   - Word Documents (.docx, .doc)
   - Text Files (.txt)

   // Automatically detects:
   - Exams and Final Exams
   - Midterms
   - Tests and Quizzes
   - Projects and Presentations

   // Supported date formats:
   - MM/DD/YYYY (e.g., 01/15/2025)
   - Month DD, YYYY (e.g., January 15, 2025)
   - Mon DD, YYYY (e.g., Jan 15, 2025)
   - DD Month YYYY (e.g., 15 January 2025)
   ```

3. **Viewing Your Calendar**

   Navigate to the "Calendar" page to see your exams:
   - **Month View**: Overview of all exams in a month
   - **Week View**: Detailed weekly schedule
   - **Day View**: Hour-by-hour breakdown
   - **Agenda View**: List format with chronological ordering

   Click on any exam to view details or edit.

4. **Managing Reminders**

   Configure email notifications in the "Test Reminders" page:
   ```typescript
   // Example configuration:
   - Enable reminders: Toggle on
   - Reminder days: [7, 3, 1] // Receive emails 7, 3, and 1 day before exam
   - Email: your-email@fordham.edu
   ```

### Screenshots and Examples

**Dashboard Example:**
- View all upcoming exams in a list format
- Quick access to add, edit, or delete exams
- Color-coded cards for visual organization

**Calendar Example:**
```
October 2024
─────────────────────────────────
Mon  Tue  Wed  Thu  Fri  Sat  Sun
                1    2    3    4
5    6    7    8    9   10   11
12   13   14  [15]  16   17   18
                ↑
         Midterm Exam
         CISC 1600
```

**Email Reminder Example:**
```
Subject: Exam Reminder: CISC 1600 Midterm in 3 days

You have an upcoming exam:

Course: Introduction to Computer Science
Type: Midterm Exam
Date: October 15, 2024
Time: 2:00 PM
Location: Room 401

Good luck with your preparation!
```

## Contribution Guidelines

We welcome contributions from the community! Here's how you can help improve Fordham Exam Buddy:

### Reporting Bugs

If you encounter a bug, please open an issue with:
- **Clear title**: Describe the bug in one sentence
- **Steps to reproduce**: Numbered list of steps to trigger the bug
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Environment**: Browser, OS, Node version
- **Screenshots**: If applicable

Example:
```
Title: Calendar not displaying exams in Week view

Steps to reproduce:
1. Add an exam for next week
2. Navigate to Calendar page
3. Switch to Week view

Expected: Exam should appear in the calendar
Actual: Week view shows empty
Environment: Chrome 120, macOS 14.2, Node 18.19
```

### Suggesting Features

To suggest a new feature, open an issue with:
- **Feature description**: Clear explanation of the feature
- **Use case**: Why this feature would be valuable
- **Proposed implementation**: Any technical suggestions (optional)

### Submitting Code Contributions

1. **Fork the repository** to your GitHub account

2. **Create a feature branch** from `main`
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow the existing code style
   - Use TypeScript types consistently
   - Add comments for complex logic
   - Update tests if applicable

4. **Test your changes**
   ```bash
   npm run lint    # Check for linting errors
   npm run build   # Ensure build succeeds
   ```

5. **Commit your changes** with clear messages
   ```bash
   git commit -m "feat: Add support for recurring exams"
   ```

   Use conventional commit prefixes:
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `style:` Code style changes (formatting)
   - `refactor:` Code refactoring
   - `test:` Test updates
   - `chore:` Build process or dependency updates

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Open a Pull Request**
   - Provide a clear title and description
   - Reference any related issues
   - Include screenshots if UI changes are involved
   - Ensure all checks pass

### Code Style Guidelines

- Use TypeScript for all new code
- Follow existing naming conventions
- Use functional components and hooks in React
- Keep components small and focused
- Write self-documenting code with meaningful variable names
- Add JSDoc comments for complex functions

## License Information

**Educational Use License**

This project is developed for educational purposes specifically for Fordham University students to manage their exam schedules.

**Permissions:**
- Use the application for personal exam management
- Modify the code for personal learning purposes
- Study the codebase as an educational resource

**Restrictions:**
- Commercial use is not permitted
- Do not redistribute without attribution
- Do not use Fordham branding outside of Fordham University context

**Disclaimer:**
This project is not officially affiliated with or endorsed by Fordham University. All trademarks and branding remain property of their respective owners.

For questions regarding licensing, please contact the repository maintainer.

## Credits

### Development Team
- **RF2005** - Lead Developer
- Built with passion by students for students at Fordham University

### Technologies and Frameworks

**Frontend:**
- [React](https://react.dev/) - UI library
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [Vite](https://vitejs.dev/) - Build tool and dev server
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [shadcn/ui](https://ui.shadcn.com/) - Re-usable component library
- [React Big Calendar](https://jquense.github.io/react-big-calendar/) - Calendar component
- [React Query](https://tanstack.com/query/latest) - Data fetching and state management
- [date-fns](https://date-fns.org/) - Date utility library
- [PDF.js](https://mozilla.github.io/pdf.js/) - PDF parsing library
- [Mammoth.js](https://github.com/mwilliamson/mammoth.js) - DOCX parsing library

**Backend:**
- [Supabase](https://supabase.com/) - Backend-as-a-Service (PostgreSQL, Auth, Edge Functions)
- [PostgreSQL](https://www.postgresql.org/) - Database

**Email:**
- [Resend](https://resend.com/) - Email delivery API

**Development Tools:**
- [ESLint](https://eslint.org/) - Code linting
- [Zod](https://zod.dev/) - Schema validation

### Acknowledgments

Special thanks to:
- Fordham University for inspiration and the student community
- The open-source community for the amazing tools and libraries
- All contributors who have helped improve this project

### External Resources

- Fordham University Final Exam Schedule data
- Icons and assets from open-source libraries

---

**Note:** This project is continuously evolving. For the latest updates and detailed technical documentation, see [CLAUDE.md](CLAUDE.md).
