# Architecture

## Stack and why

Vite + vanilla ES modules, no framework. The app is a set of screens that re-render from state on each interaction; that doesn't need a virtual DOM, and plain modules keep it readable for someone learning the codebase. Vitest is used only for tests.

## Layers

```
views/        screens: read derived data, render, call services on user action
components/   reusable UI pieces, including the question renderer registry
services/     all learning logic — no DOM, no storage
repositories/ the only code that knows where data lives
data/         JSON content, discovered automatically
```

Dependencies only point downwards. Views never write progress directly; services never touch `localStorage`; nothing above `repositories/` knows content is JSON.

## Key modules

| Module | Responsibility |
| --- | --- |
| `app/config.js` | Every tunable number: XP values, mastery gains, review intervals, the smart-practice mix, streak rules, session presets |
| `app/router.js` | Hash router. A view is `(ctx) => { element, title, focusMode?, cleanup? }`, or a promise of one (views that need lazily loaded content are async) |
| `app/state.js` | Settings store (persisted) and the in-flight session / last result (transient) |
| `app/eventBus.js` | Cross-cutting signals: XP awarded, achievement unlocked, level completed, streak extended |
| `data/index.js` | Builds the indexed dataset from the catalogue plus whichever topic packs are loaded; `ensureTopics()` loads packs (see *Loading and code splitting*) |
| `services/contentGate.js` | The only place views and click handlers ask for lazily loaded content: one topic, all topics, or the topics behind the learner's mistakes |
| `repositories/contentRepository.js` | Read API for topics, levels, concepts, formulas, questions, achievements |
| `repositories/progressRepository.js` | Read/write API for learner progress, attempts, export/import/reset, schema migration |
| `services/quizEngine.js` | Answer evaluation per type, session state machine, result summary |
| `services/learningEngine.js` | Turns one learner action into all its consequences (mastery, review schedule, level status, XP, streak, achievements) |
| `services/masteryEngine.js` | Bounded 0–100 concept mastery with decay |
| `services/spacedRepetition.js` | Interval ladder + ease factor scheduling |
| `services/sessionBuilder.js` | Builds sessions: level, smart mix, mistakes, daily challenge, exam, formula queues |
| `services/recommendationEngine.js` | Rule-based "what next", each rule carrying a human-readable reason |
| `services/gamification.js` | XP, ranks, streak, achievement evaluation |
| `services/shareService.js` | Emoji result grid + share/clipboard |
| `services/reminders.js` | Optional daily reminder. The page timer and the service worker's periodic check share one state record in Cache Storage |
| `components/MasteryMap.js` | Per-topic mastery map: concepts grouped by the level that introduces them, each with a mastery ring |
| `components/questionRenderers.js` | Registry mapping question type → renderer |
| `utils/reasoning/` | Logical-reasoning solvers with no DOM: seating, puzzles (floors, days, grids), syllogisms, inequality chains, families, directions (walks, shadows), letter and number codes, ranking in a row, dice and painted cubes, mirror images and paper folding, tournaments and routes, letter series and analogies, coded operations (read both as BODMAS left to right and strictly ÷ × + −, and used only when the two agree), input-output machines and reasoning data sufficiency. Each tries every possible arrangement or computes the answer exactly, and each has a second, independently written method (for dice, turning a cube through its 24 rotations and, separately, arrows and determinants; for paper, stacking layers and, separately, reflecting the punch; for a machine, running it step by step and, separately, writing each line from the order of picks); the reasoning generators, simulations and content tests all use them |
| `utils/modulus.js`, `utils/polynomials.js`, `utils/diophantine.js`, `utils/cryptarithm.js` | Maths for the CAT and placement topics with no DOM: solution sets of equations with moduli (points or whole intervals), polynomial division and real roots, whole-number solutions of ax + by = c, and three independent cryptarithm solvers (every digit assignment, column by column, every value of the numbers). The generators and simulations use them; each is tested against brute force |
| `utils/taxes.js` | Taxes, GST and commission with no DOM: GST added to and taken out of a price, the CGST/SGST or IGST split, a supply chain with input tax credit, banded tax for income slabs and tiered commission (and the sales needed for a target), rebate and cess, customs duty and property tax. The generators, the `gst-supply-chain` simulation and the tests use it |
| `generators/` | Validated question templates: seeded RNG, engine that rejects any instance failing independent verification, and the template registry. The rest of the app reaches them through `generators/gate.js`, which loads them lazily |
| `pwa/` | Service worker template and install/offline handling |

## Loading and code splitting

Simulations (`src/simulations/`) are pure models (a simulation belongs to one topic and may list `alsoTopicIds` to show on related topic pages; plot kinds include `rects` for area and bar models, `venn`, and for data interpretation `chart` (drawn by `components/Chart.js`, as in DI questions), `table` and `candidates`, `wheel` for a walk round n positions (remainders), and for lines, shapes and mensuration `geometry` (a flat figure in model units, drawn to scale with angle sectors, shaded regions and tick and parallel marks) and `stack` (two plots, one above the other), and `numberlines` (number lines sharing a scale, with points, bands and an answer badge), `steps` (an expression collapsing one operation at a time), `tree` (a tree of choices), `setdots` (elements placed in two or three sets), `subsets` (a power set) and `passage` (a paragraph read sentence by sentence), for integer solutions `lattice` (whole-number points on a line, with the step between them) for cryptarithms `cryptarithm` (a letter sum worked column by column, with each letter's remaining digits), and for taxes `gstchain` (GST through a supply chain: each seller's input credit and net tax, and the total beside GST on the final price, split into CGST and SGST or shown as IGST), and for logical reasoning `seats`, `grid`, `euler`, `chain` and `family` (drawn by `components/reasoningPlots.js`) and `walk`, `wheels`, `queue`, `cubes`, `fold` and `mirrorclock` (`components/reasoningPlotsMore.js`), and `points`, `strip`, `tiles`, `conveyor` and `arrangements` (`components/reasoningPlotsFinal.js`, one file per topic); a control with `showWhen: { mode: 'speed' }` shows only while that choice is set; an xy plot with `equalUnits` keeps graph-paper units): `compute(values)` turns slider values into numbers, readouts, an insight and a plot description, with no DOM, so the maths is unit-tested. `components/Simulation.js` renders the controls and redraws only the picture and numbers on input (the slider keeps focus); `components/simPlots.js` draws the plot kinds as SVG with the theme's `--cat-*` colours. They appear at `#/explore`, `#/explore/<id>`, on topic pages, and in lessons through a `simulation` block. The models and drawing code are a separate chunk, loaded only when a simulation is opened (`loadSimulationKit()` in `simulations/meta.js`); pages that merely list simulations use the small `SIMULATION_META` list, which a test keeps in step with the models.

Figures: `components/Figure.js` dispatches on `figure.type`: `coordinate-plane` and `diagram` (2D geometry), `venn` (`components/venn.js`) and `solid` (`components/solid.js`, 3D solids, including prisms and pyramids, drawn to scale from the pure geometry in `utils/solidGeometry.js`), `clock` and `numberline` (`components/clockFigure.js`), and for reasoning `dice` (views and nets of a die) and `paper` (a sheet folded and punched), drawn by `components/reasoningFigures.js` from `utils/reasoning/cubes.js` and `mirror.js`. The content validator checks every figure, authored or generated, with the same rules the renderers rely on.


Mock tests: `src/mock/patterns.js` describes each exam (sections with topics, counts and difficulties; minutes; marking). `src/mock/mockEngine.js` assembles a paper (about half hand-written questions, half generated, sections in order), keeps the attempt (responses, marks for review, time per question, palette states) and analyses it, with no DOM. `MockRunView` (`#/mock/run`, navigation hidden) shows one clock, the palette and free movement, and submits automatically when time runs out; every answer is recorded through the learning engine like any practice. `MockResultView` (`#/mock/result`) shows the analysis. The last 30 results stay on the device (`quantmaster:v1:mock-history`).

Must-know tables and speed drills: `src/drills/tables.js` computes every table (nothing typed by hand) and the drill questions built from it; `src/drills/drill.js` holds the marking, question order and best scores, with no DOM. `TablesView` (`#/tables`) and `DrillView` (`#/drill/<table>`, or `mixed`) render them with the navigation hidden. Drills earn no XP; best scores stay on the device.

Revision cards are of two kinds, formulas and shortcuts (`kind` on the card; see DATA_MODEL.md). `FormulaRevisionView` teaches them as flashcards and can be limited to one kind. `QuickSheetView` (`#/sheet`, `#/sheet/<topic>`) lists one kind on a single page for reading: it returns `bare: true`, which makes the shell hide the sidebar, top bar and bottom navigation, and it records nothing.

The main bundle holds the app code and a small **catalogue**: every topic's concepts, formula cards (without their flashcard text) and levels (without lesson blocks), plus an index of which topic owns each question. `scripts/contentSplitPlugin.js` builds it at build time from the unchanged authoring files. Everything heavy is loaded on demand:

- **Topic packs**, one chunk per topic: its questions, lesson blocks and flashcard text.
- **Generators**, one chunk: `generators/index.js` and all templates.

The engines and repositories stay synchronous. Instead, code awaits content before it needs it:

- A view about one topic (topic page, level, per-topic revision) awaits `ensureTopicContent(topicId)`.
- Anything that can build a session across topics (Practice, the dashboard's session buttons, all-topic revision, Settings' statistics) awaits `ensureAllContent()`.
- At boot, `ensureMistakeContent()` loads the topics behind the learner's wrong answers, so mistake counts are right on every screen from the first render.

After the first screen, `prefetchAllContent()` loads everything else while the browser is idle, and the service worker precaches every chunk, so the app still works fully offline after one visit. Tests load all packs and the generators up front (`tests/setup.js`).

## Tests

- **Engine tests** (`npm test`, Vitest, `tests/*.test.js`): the learning rules, generators (every template over many seeds), simulations' maths, figures' geometry, streaks and reminders.
- **Browser tests** (`npm run test:e2e`, Playwright, `tests/e2e/`): a production build served by `vite preview`, driven through real screens. `offline.spec.js` turns the service worker on and cuts the network.
- CI (`.github/workflows/ci.yml`) runs content validation, both test suites and the build on every push and pull request, and publishes `main` to GitHub Pages.

## Generated questions

A generated question id is `gen:<templateId>:<version>:<seed>`. The seeded RNG makes generation deterministic, so the id alone is enough to rebuild the exact question — which is how generated questions flow through progress, mistakes and review scheduling without storing their text. `questionRepository.getById` handles both authored and generated ids.

Where they are used:

- **Smart Practice** — half of the weak-concept slice uses fresh variations; the "new ground" slice and backfill use generators once the authored bank is exhausted, before recycling seen questions.
- **Level replays** — questions already solved are swapped for variations on the same concept at the same or lower difficulty; unresolved mistakes stay exactly as they were.
- **Fresh Questions mode** — unlimited, weighted towards weak concepts.
- **"Try a similar question"** — offered after a wrong answer; inserts a variation as the next question.

Daily challenges stay authored so they remain identical for everyone.

## How an answer flows

1. `QuizView` holds the current response and calls `quizEngine.submitAnswer`.
2. `quizEngine` evaluates the response against the question data and calls `learningEngine.recordQuestionAttempt`.
3. `learningEngine`, inside a single `progressRepository.update`:
   - updates the question record (tracking mistakes and whether one was corrected in a *later* session)
   - folds the attempt into concept mastery
   - reschedules the concept's review
   - updates topic and global stats
   - awards XP (reduced for hints), records the day's activity for the streak
   - checks achievements
4. Events fire (`xp:awarded`, `achievement:unlocked`, …); the shell and toasts react.
5. At the end, `completeSession` and (for levels) `completeLevelAttempt` apply pass criteria and unlock the next level.

## Extending

**New question type:** add an evaluator branch in `quizEngine.evaluateAnswer` (and `isResponseComplete` if the response isn't a single id), register a renderer in `questionRenderers.js`, and add the type to `VALID_QUESTION_TYPES` in `scripts/validate-data.js`. If the renderer holds its own DOM state (inputs, selects), leave it out of `RERENDER_ON_CHANGE` and use functional `setResponse(prev => …)` updates.

**New storage backend:** reimplement the exported functions of `progressRepository.js` (and, for content, `data/index.js` / `contentRepository.js`). Nothing else changes. The functions are synchronous today; an API-backed version would make them async and the views would need `await` at their call sites.

**Tuning pedagogy:** edit `app/config.js`. The engine tests cover the behavioural rules (no jump to full mastery, hinted answers earn less than unaided ones, lapses reschedule immediately), so run `npm test` after changing numbers.

## Deliberate choices

- **No server, no accounts.** Everything a learner does stays in their browser (`localStorage`, plus Cache Storage for the offline copy and reminders). The app is static files served by GitHub Pages; anyone can fork it and host their own copy.
- **Rule-based adaptivity.** Every recommendation states its reason. No opaque "AI" scoring.
- **Rewards follow learning.** XP for recall, corrections and completion; almost none for swiping or wrong guesses. An in-session retry doesn't count as a corrected mistake.
- **Forgiving streaks.** One missed day doesn't reset the streak.
- **Mastery includes coverage.** Topic mastery averages across all concepts, so touching one concept can't make a topic look mastered.
- **Deterministic daily challenge.** Seeded by date, so everyone gets the same set and shared results are comparable.
