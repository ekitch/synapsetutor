# Synapse

An AI-powered math tutor that guides students through problems using the Socratic method — asking questions instead of giving answers.

## How it works

Students paste a math problem (or upload a PDF assignment). Synapse identifies the target skill, then scaffolds the student up to a solution through targeted questions. When a student gets stuck or makes a wrong step, Synapse can open a focused **drill** on the specific concept that broke down — a parallel conversation that runs alongside the main problem. Students can also highlight any part of Synapse's explanation to open a drill on that phrase.

### Key features

- **Socratic tutoring** — Synapse never gives the answer. It scaffolds up and down a skill ladder based on how the student is performing.
- **Drill branches** — When a student makes an error, Synapse flags the wrong step and offers to open a focused drill. Correct the concept, then return to the original problem.
- **Highlight-to-drill** — Highlight any text in a response to open a drill on that specific phrase, with an optional prompt to describe what you want to understand.
- **Assignment mode** — Upload a PDF assignment. Synapse extracts all problems and walks through them one at a time, tracking progress per problem.
- **Skill graph** — Behind the scenes, Synapse maps student performance onto a prerequisite graph spanning arithmetic through calculus. It descends when a student struggles and climbs when they're confident.
- **Session summary** — At the end of a session, Synapse surfaces which skills the student struggled with and offers targeted practice for each.

## Tech stack

- **Next.js 16** (App Router) with TypeScript
- **Anthropic Claude** — powers all tutoring responses via streaming
- **Supabase** — stores student identity, attempt history, and skill records
- **KaTeX** — renders math expressions inline
- **Tailwind CSS v4**

## Getting started

### Prerequisites

- Node.js 18+
- A Supabase project
- An Anthropic API key

### Setup

```bash
cd app
npm install
```

Create a `.env.local` file in the `app/` directory:

```
ANTHROPIC_API_KEY=your_key_here
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database

Run the following in the Supabase SQL editor to create the required tables:

```sql
create table students (
  id uuid primary key,
  created_at timestamptz default now()
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id),
  original_problem text,
  target_skill_id text,
  created_at timestamptz default now()
);

create table attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id),
  skill_id text,
  session_id uuid references sessions(id),
  student_input text,
  raw_content text,
  correct boolean,
  notes text,
  created_at timestamptz default now()
);

create table skill_records (
  student_id uuid references students(id),
  skill_id text,
  status text,
  attempts int default 0,
  correct_attempts int default 0,
  updated_at timestamptz default now(),
  primary key (student_id, skill_id)
);
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
app/src/
├── app/
│   ├── api/
│   │   ├── chat/          # Streaming tutor response endpoint
│   │   ├── identify-skill/# Identifies target skill for a problem
│   │   └── parse-assignment/ # Extracts problems from PDF uploads
│   ├── layout.tsx
│   └── page.tsx           # Main app state and session logic
├── components/
│   ├── ActiveWindow.tsx   # Chat pane for the active node
│   ├── AssignmentSidebar.tsx
│   ├── BranchTree.tsx     # "Map" — hierarchical drill node tree
│   ├── DodoAvatar.tsx     # Animated mascot
│   ├── LessonsOverlay.tsx # Floating drill node panel
│   ├── SkillMenu.tsx      # Skill progress overlay
│   ├── ToolsBar.tsx       # Left sidebar nav
│   └── WorkInput.tsx      # Step-by-step answer input
├── data/
│   └── skillGraph.ts      # Prerequisite graph for all skills
├── lib/
│   ├── db.ts              # Supabase data layer
│   ├── profileStore.ts    # In-memory skill profile
│   ├── promptEngine.ts    # System prompt builder + skill signal parser
│   └── supabase.ts
└── types/
    ├── branch.ts          # BranchTree / BranchNode types
    └── index.ts
```
