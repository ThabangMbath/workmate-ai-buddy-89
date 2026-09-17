# WorkMate Assistant

Build a complete MVP called WorkMate AI, an AI Workplace Productivity Assistant.

IMPORTANT: Optimize for low Lovable credit usage. Build the core application in one implementation. Do not add unnecessary animations, complex UI, extra pages, advanced analytics, or features not listed below. Prioritize working functionality over visual perfection. Reuse components and keep the code simple and maintainable.

Core Features

1. Smart Email Generator

Create a page where users enter:

Email purpose

Recipient

Key points

Tone

Tone options:

Formal

Friendly

Persuasive

Professional

Use AI to generate the email.

Actions:

Generate

Regenerate

Edit

Copy

Save generated emails to the database.

2. Meeting Notes Summarizer

Create a page where users paste meeting notes.

Use AI to extract:

Summary

Key points

Decisions

Action items

Deadlines

Responsible person

Each action item must have an Add to Tasks button.

Add a Generate Follow-Up Email button that creates an email from the meeting information.

Save meetings to the database.

3. Task Planner

Create a simple task manager.

Tasks must contain:

Title

Description

Priority

Status

Due date

Estimated duration

Priority:

Critical

High

Medium

Low

Status:

To Do

In Progress

Completed

Allow users to create, edit, delete, and complete tasks.

4. AI Scheduler

Create a Schedule page.

The user can enter their working hours.

Use existing tasks, priorities, deadlines, and estimated durations to generate a simple daily or weekly schedule.

Allow users to:

Generate schedule

Regenerate schedule

Mark tasks complete

Edit schedule items

Do not build complex calendar integrations for the MVP.

Dashboard

Create one simple dashboard showing:

Today's tasks

Upcoming deadlines

Today's schedule

Recent meetings

Quick actions

Quick actions:

Generate Email

Summarize Meeting

Add Task

Generate Schedule

IMPORTANT FEATURE INTEGRATION

All features must use the same database and user data.

Workflow:

Meeting Notes
→ AI Summary
→ Action Items
→ Tasks
→ AI Prioritization
→ Schedule
→ Follow-Up Email

Also allow tasks to generate related emails.

AI Assistant

Add a simple AI chat panel where users can ask questions about their tasks, meetings, schedules, and emails.

Examples:

"What tasks do I have today?"

"Create a schedule for tomorrow."

"Summarize my latest meeting."

"Write a follow-up email."

Keep this simple for the MVP.

Authentication & Database

Implement basic authentication and user-specific data.

Create database tables for:

Users

Emails

Meetings

Tasks

Schedule Items

Users must only see their own data.

UI

Use a clean, modern, responsive SaaS design.

Use one reusable layout with:

Sidebar

Header

Cards

Forms

Tables/lists

Simple calendar/schedule

Navigation:
Dashboard | Emails | Meetings | Tasks | Schedule | AI Assistant | Settings

Do NOT spend credits on:

Complex animations

Landing page marketing sections

Advanced analytics

Dark mode

Calendar integrations

Team collaboration

Notifications

Complex drag-and-drop

Unnecessary decorative components

AI Rules

AI should:

Never invent meeting decisions or deadlines.

Clearly separate extracted information from AI suggestions.

Allow users to edit AI-generated content.

Handle missing information gracefully.

Development Priority

Build in this order:

Database and authentication

Main layout/navigation

Task management

Meeting summarizer

Email generator

AI scheduler

Feature integration

Simple AI assistant

Basic responsive styling

Do not stop after creating the UI. Implement the actual functionality, database operations, and AI interactions.

Before finishing, test the main workflow:

Meeting Notes → Action Items → Tasks → Schedule → Follow-Up Email

Make sure this complete workflow works end-to-end.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://workmate-ai-buddy-89.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/389dffbf-02fb-45ed-a699-9e433ed83f76).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
