# BhashaVerse

**Learn Indian languages by living them.** An immersive language learning platform powered by Sarvam AI, built with psychology-grounded features that go far beyond flashcards and grammar drills.

## Features

- **Scenario Rooms** — Voice-driven role-play in real Indian life situations (market haggling, auto rickshaw negotiation, restaurant ordering)
- **Identity Forge** — Build a linguistic alter-ego that lives in the target culture, driven by social identity theory
- **Eavesdrop Loops** — Passive listening to AI-generated natural conversations with interactive transcripts
- **Shadow Speaking** — Real-time pronunciation comparison against native speakers using Sarvam STT
- **Mistake Garden** — Spaced repetition system (FSRS) that reframes errors as seeds that grow into blooming knowledge

## Tech Stack

- **Frontend:** Next.js 16 + `@sarvam/tatva` component library (Tailwind v4)
- **AI:** Sarvam AI APIs (Chat Completion, TTS Bulbul V3, STT Saaras V2, Translation, Transliteration, Language ID)
- **State:** Zustand with persistence
- **Styling:** Sarvam Tatva design system (dark mode)

## Supported Languages (Phase 1)

Hindi, Tamil, Telugu, Kannada, Bengali, Marathi, Malayalam, Gujarati

## Getting Started

```bash
# Install dependencies
npm install

# Set your Sarvam AI API key
cp .env.local.example .env.local
# Edit .env.local with your key from https://www.sarvam.ai/api-pricing

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start learning.

## Project Structure

```
src/
├── app/
│   ├── (app)/                 # Authenticated routes with sidebar
│   │   ├── dashboard/         # Main dashboard with stats and quick actions
│   │   ├── scenario-rooms/    # Scenario room list + [roomId] for active sessions
│   │   ├── eavesdrop/         # Eavesdrop loop player
│   │   ├── shadow-speaking/   # Pronunciation practice
│   │   ├── garden/            # Mistake garden with FSRS review
│   │   └── settings/          # Profile and preferences
│   ├── onboarding/            # Identity Forge onboarding flow
│   └── api/sarvam/            # Server-side Sarvam AI proxy routes
├── components/
│   └── AppShell.tsx           # Sidebar layout wrapper
└── lib/
    ├── constants.ts           # Languages, scenarios, difficulty levels
    ├── sarvam.ts              # Sarvam AI API client
    ├── fsrs.ts                # Free Spaced Repetition Scheduler
    └── store.ts               # Zustand global state
```

## Psychology Framework

Every feature maps to proven language acquisition research:

| Principle | Feature |
|---|---|
| Krashen's i+1 Comprehensible Input | Eavesdrop Loops |
| Affective Filter Hypothesis | Mistake Garden (no punishment) |
| Flow State (Csikszentmihalyi) | Scenario Rooms (adaptive difficulty) |
| Social Identity Theory | Identity Forge |
| Desirable Difficulty | Shadow Speaking |
| Spaced Repetition | FSRS in Mistake Garden |
