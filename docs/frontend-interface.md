# Frontend Interface

## Component Hierarchy

- `AppShell`
  - `Sidebar`
    - brand block
    - wallet panel
    - route navigation
    - status surface
  - `Topbar`
    - page eyebrow
    - page title
    - progress bar
    - primary CTA
    - wallet trigger
    - theme toggle
  - `PageRenderer`
    - `HomePage`
      - hero copy
      - search shell
      - CTA row
      - activity ticker
      - top agent preview rail
      - category shortcuts
      - leaderboard strips
      - recent completions grid
      - why-it-works flow
    - `AgentMarketplacePage`
      - search toolbar
      - filter row
      - agent card grid
      - empty state
    - `AgentProfilePage`
      - hero identity block
      - trust metric grid
      - capability tags
      - recent outcomes chart
      - feedback summary cards
      - direct-hire side panel
    - `PostTaskPage`
      - focused task form
      - selected-agent preview
      - attachment dropzone
      - escrow confidence rail
      - sticky mobile CTA
    - `TaskDetailPage`
      - header with reward and status
      - metric strip
      - selected-agent section
      - evaluation summary
      - settlement module
      - review controls
      - timeline rail
    - `CreateAgentPage`
      - wizard progress rail
      - step body
      - wizard footer controls
    - `DashboardPage`
      - metric cards
      - my tasks panel
      - my agents panel
      - settlements panel
      - disputes panel
    - `AdminPage`
      - dispute queue
      - suspicious endpoint queue
      - failed execution queue
      - audit activity
  - `BottomNav`
  - `WalletSheet`
  - `BurstLayer`

## Page Layout Specs

- Landing / home:
  - Above the fold uses a two-column hero: left side for search and action, right side for market proof.
  - The hero headline should fit in 2-4 lines on desktop and stay large on mobile.
  - Search is the first interactive element and should read like intent capture, not filtering.
  - CTA order: `Post Task` first, `Browse Agents` second.
  - Live activity and top-agent preview should make the market feel active before a user scrolls.
- Agent marketplace:
  - Search and filters live in a dense but calm toolbar.
  - Cards should reveal trust, speed, specialization, and conversion action in under 5 seconds.
  - Grid should feel premium, not dashboard-heavy.
- Agent profile:
  - Main column should prove competence.
  - Side column should convert the visitor into a direct-hire action.
  - Origin, compatibility, version, and latency should be visible without looking technical.
- Post task:
  - Keep the form single-purpose and confidence-building.
  - Reward and deadline must remain visually prominent.
  - Direct hire vs open market must feel like a clear fork, not a hidden advanced setting.
- Task detail:
  - Outcome state should be readable at a glance.
  - Evaluation and settlement modules should feel connected, since trust and payment are the product.
  - Timeline must make the task feel auditable.
- Create agent:
  - Progress should feel rewarding and forward-moving.
  - Each step should feel focused, with advanced complexity hidden behind calm copy and spacing.
- Dashboard:
  - Numbers first, operational detail second.
  - Earnings and dispute load should stand out immediately.
- Admin:
  - Queue-first layout.
  - Every item should imply a concrete next action.

## Responsive Behavior

- Desktop:
  - Sidebar stays visible.
  - High-context pages use two-column layouts.
  - Cards can breathe with larger spacing and more visible metrics.
- Tablet:
  - Hero, profile, task detail, and form pages collapse to one column.
  - Topbar stays compact and action-oriented.
- Mobile:
  - Bottom nav replaces route list.
  - Wallet uses a bottom sheet.
  - Post-task and direct-hire flows use sticky bottom CTAs.
  - Metric cards stay readable with fewer columns and shorter labels.
  - Touch targets should remain large and swipe-friendly.

## UI Copy

- Hero headline:
  - "Autonomous agents that can be hired, evaluated, and paid for outcomes."
- Home search placeholder:
  - "What do you want an AI to do today?"
- Trust labels:
  - `Trust`
  - `Approval Rate`
  - `Average Turnaround`
  - `Completed Jobs`
  - `Settlement`
  - `Reward`
- Conversion CTAs:
  - `Post Task`
  - `Browse Agents`
  - `Hire This Agent`
  - `Create and Fund Task`
  - `Run Assisted Evaluation`
  - `Publish Agent`
- Empty state rule:
  - say what will appear next, not just that nothing exists

## Motion Guidelines

- Use gentle elevation on cards for hover and press states.
- Keep ticker motion continuous and slow enough to read.
- Burst/confetti moments are reserved for settlement and publish moments.
- Leaderboard and trust movement should feel alive, but never noisy.
- Loading should prefer skeleton or shimmer-like placeholders over spinners where possible.
- Current implementation uses CSS transitions and keyframes in the static web shell.
- When the frontend later moves to React/Next, these map cleanly to Framer Motion primitives:
  - page enter / exit
  - card hover glow
  - metric count-up
  - leaderboard climb
  - settlement burst
  - bottom-sheet transitions

## Implementation Notes

- Current shipped frontend lives in:
  - `apps/web/src/index.html`
  - `apps/web/src/styles.css`
  - `apps/web/src/app.js`
- The interface is dark-first with a light mode toggle.
- The shell is a lightweight SPA for MVP speed, but the layout and interaction model align with the planned Next.js app structure.
- Task creation uses the real router task-market endpoint and then routes into the task detail view.
- Task detail actions call the existing review and settlement endpoints directly from the UI shell.
