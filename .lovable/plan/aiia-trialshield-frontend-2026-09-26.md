# AIIA TrialShield frontend

## What I’ll build

- A premium public landing page for AIIA TrialShield, using the supplied forest green, Ayurvedic copper, warm ivory, and white palette.
- A restrained institutional visual language combining clinical research structure, subtle manuscript texture, and botanical line details.
- A top-navigation command center with focused operational priorities rather than a conventional sidebar or metric-heavy admin dashboard.
- Dedicated Portfolio, Studies, Safety, Compliance, Analytics, Documents, and Exports screens.
- A detailed study workspace with overview, participants, visits, safety, compliance, documents, and audit-trail tabs.
- Timeline-led safety and compliance views highlighting cases, escalations, follow-ups, approvals, amendments, deadlines, and open risks.

## Experience details

- The landing page will include the supplied headline, tagline, supporting copy, two primary actions, and all seven capability sections.
- Navigation and key actions will work throughout the prototype, with realistic sample research data clearly presented as demonstration content.
- Motion will remain subtle: measured reveals, progress transitions, status changes, and calm hover feedback, with reduced-motion support.
- Layouts will adapt cleanly across desktop and mobile without introducing a large sidebar.

## Technical details

- Use TanStack Start routes with shared top navigation and route-specific metadata.
- Use semantic Tailwind design tokens in `src/styles.css`; no raw colors in page markup.
- Build focused reusable components for status indicators, progress, timelines, operational lists, and tabbed study workflows.
- Keep all data local and illustrative; no authentication, database, or external service integration is included in this frontend scope.
- Validate the running preview and current build diagnostics before completion.

CRITICAL DESIGN DIRECTION

Do not design this as a dashboard-first product.

Design it as a workflow-first platform.

Every major screen should answer:

- What needs attention?

- Why is it at risk?

- Who owns it?

- What action is required?

Prefer:

- timelines

- investigation views

- command-center layouts

- study journey maps

- evidence panels

- workflow visualization

Over:

- KPI grids

- large data tables

- card walls

- admin templates

The UI should feel closer to:

Linear

Notion

Vercel

Stripe Radar  
than a hospital management system.  
  
Include subtle Ayurveda-specific visual language:

- botanical illustrations

- medicinal plant line art

- manuscript-inspired textures

- formulation cards

- Ayurveda intervention displays

Avoid:

- yoga aesthetics

- spiritual imagery

- religious visuals

Keep it clinical, research-oriented and modern.  
  
For this project, I'd much rather have:

```

```

```
Next.js
TypeScript
Tailwind
shadcn/ui
Framer Motion
```