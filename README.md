# Fordham Exam Buddy

A React + TypeScript web application for Fordham University students to manage exam schedules with AI-powered syllabus parsing.

## Features

- 📝 **Multiple Exam Entry Methods**
  - Manual entry with custom details
  - Schedule lookup from Fordham's final exam database
  - AI-powered syllabus parsing (PDF upload or text paste)

- 📅 **Smart Calendar Views**
  - Month, Week, Day, and Agenda views
  - Color-coded exams for easy organization
  - Interactive event management

- 🔔 **Email Reminders**
  - Configurable reminder notifications
  - Automatic delivery via Resend API
  - Customizable days before exam

- 🤖 **AI Integration**
  - Gemini 2.5 Pro for syllabus parsing
  - Intelligent date extraction
  - Section-specific exam detection

## Tech Stack

- **Frontend**: Vite, React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **AI**: Google Gemini 2.5 Pro
- **Calendar**: React Big Calendar
- **PDF Processing**: PDF.js
- **Email**: Resend API

## Getting Started

### Prerequisites

- Node.js & npm ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- Supabase account
- Resend API key (for email reminders)

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to project directory
cd fordham-exam-buddy-main

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Supabase Edge Functions

Configure the following secrets in your Supabase dashboard:

```
LOVABLE_API_KEY=your-ai-gateway-key
RESEND_API_KEY=your-resend-key
CRON_SECRET=your-cron-secret
```

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Build for development
npm run build:dev

# Lint code
npm run lint

# Preview production build
npm preview
```

## Project Structure

```
src/
├── components/ui/      # shadcn/ui components
├── hooks/              # Custom React hooks
├── integrations/       # Supabase integration
├── lib/                # Utility functions
├── pages/              # Application pages
├── styles/             # CSS styles
└── assets/             # Images and static files

supabase/
├── functions/          # Edge Functions
└── migrations/         # Database migrations
```

## Deployment

### Build

```bash
npm run build
```

The build output will be in the `dist/` directory.

### Deploy Options

- **Vercel**: Connect your repo and deploy
- **Netlify**: Drag and drop the `dist/` folder
- **Any static hosting**: Upload contents of `dist/`

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Documentation

- [CLAUDE.md](CLAUDE.md) - Project guide for AI assistants
- [REFACTORING_SUMMARY.md](REFACTORING_SUMMARY.md) - Recent refactoring changes

## License

This project is built for Fordham University students.
