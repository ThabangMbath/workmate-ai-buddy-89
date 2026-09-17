# WorkMate AI

WorkMate AI is an AI-powered workplace productivity assistant. It turns messy meeting notes into structured summaries and tasks, drafts emails for you, and builds a work schedule around your priorities — all in one place.

## Features

- **AI Email Generator** — describe the purpose, recipient and key points, pick a tone (Formal, Friendly, Persuasive or Professional), and get a ready-to-send draft you can edit, copy and save.
- **Meeting Notes Summarizer** — paste raw meeting notes and get a title, summary, key points, decisions and action items. Every action item can be added to your task list in one click, and you can generate a follow-up email from the meeting.
- **Task Planner** — manage tasks with priority (Critical / High / Medium / Low), status, due date and estimated duration. Create, edit, complete and delete.
- **AI Scheduler** — set your working hours and let the AI build a daily or weekly schedule from your open tasks, respecting priorities and deadlines.
- **Dashboard** — today's tasks, upcoming deadlines, today's schedule and recent meetings, plus quick actions.
- **AI Assistant** — a chat panel that answers questions about your own tasks, meetings, schedule and emails ("What are my upcoming deadlines?").
- **Accounts** — sign up with email or Google. Each user sees only their own data.

## How it fits together

```text
Meeting notes → AI summary → action items → tasks → AI schedule → follow-up email
```

The AI only works with what you give it: it never invents decisions, deadlines or names that aren't in your notes, and everything it generates stays editable.

## Tech stack

- TanStack Start (React + TypeScript)
- Tailwind CSS
- Lovable Cloud (database, authentication, storage)
- Lovable AI

## Getting started

Run it locally:

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

The hosted version is available at [workmate-ai-buddy-89.lovable.app](https://workmate-ai-buddy-89.lovable.app).

## Project structure

- `src/routes/` — the app's pages (dashboard, emails, meetings, tasks, schedule, assistant, settings)
- `src/lib/` — AI server functions and shared data helpers
- `drizzle/migrations/` — database schema migrations

## Notes

- New accounts must confirm their email address before signing in.
- All data is private per user — tasks, meetings, emails and schedules are only visible to the account that created them.
