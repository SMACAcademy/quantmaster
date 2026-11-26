# QuantMaster

**Free, open practice for quantitative aptitude and logical reasoning**: concept first, then formula recall, then method, then graded practice, with spaced repetition and mistake review keeping it from fading. Built for bank PO and clerk exams (IBPS, SBI), SSC CGL and CHSL, CAT, railway exams and campus placement tests.

**Use it now: https://smacacademy.github.io/quantmaster/**

[![Stars](https://img.shields.io/github/stars/SMACAcademy/quantmaster?style=social)](https://github.com/SMACAcademy/quantmaster/stargazers) [![Puzzle of the week](https://img.shields.io/badge/puzzle%20of%20the%20week-join%20in-6f42c1)](https://github.com/SMACAcademy/quantmaster/discussions/categories/q-a)

> **Puzzle of the week.** Every Monday a new aptitude puzzle appears on the app's dashboard and in [Discussions](https://github.com/SMACAcademy/quantmaster/discussions/categories/q-a). Check your answer in the app, then post your method: the quickest clear one is marked as the answer. If QuantMaster helps you, a ⭐ helps other aspirants find it.

- **No account, no server, no tracking.** Your progress stays in your own browser.
- **Works offline** once opened, and installs to your phone's home screen like an app.
- **Free and open:** code under the MIT licence, content under CC BY-SA 4.0. Fork it, host your own copy, translate it, improve it.

## What is in it

**Content**
- 79 topics across arithmetic, algebra, geometry, counting and probability, data interpretation and logical reasoning (seating arrangement, puzzles, syllogism, inequalities, blood relations), all with full content
- 21 Advanced units inside their topics (an Advanced lesson and a timed Challenge each): the theorems of Fermat, Euler and Wilson, numbers from their remainders, circular tracks, conditional probability, quantitative comparison, sectors and segments, centres of a triangle and congruence, equal instalments (EMI), AM ≥ GM and maximum values, number bases, true and banker's discount, stocks and shares, and more
- 1,250 hand-written questions (every topic has at least 13), 433 concepts, formula and shortcut cards for every topic
- 11 question types: single choice, multiple choice, numeric entry, formula and method recognition, true/false, assertion–reason, match the following, ordering steps, identify the error, select the next step

**Unlimited practice**
- About 590 question generators cover every concept and produce fresh questions without end (about 140,000 distinct ones in a validation run), including generated tables, charts, geometry figures and reasoning puzzles
- Every generated answer is checked a second, independent way (substitution, simulation or brute-force counting; for reasoning puzzles, trying every possible arrangement) and thrown away if the two disagree
- Wrong options are modelled on real, named mistakes, so a wrong choice teaches something

**Pictures and simulations**
- 66 interactive simulations with sliders, live pictures and "Try this" challenges: percentage changes, interest, alligation, work and pipes, trains, boats, clocks, parabolas, lines, inequalities, progressions, logarithms, triangles, circles, polygons, solids, trigonometry, probability, statistics, ratio bar models, HCF tiles, LCM bells, ages, calendars, fractions, identities as areas, Venn diagrams, counting, Pascal's triangle, the prime sieve, divisibility, decimals, index laws, units, algebra tiles, bar, line and pie charts, DI tables, data sufficiency, parallel lines and a transversal, the quadrilateral family, perimeter against area, shaded regions, recasting solids, a remainder wheel, the primes inside n!, square roots from their two ends, the base method as an area, and for reasoning: seating clues, a puzzle grid, syllogism circles, inequality chains and a growing family tree
- Figures drawn to scale in the questions themselves: charts, tables, coordinate planes, geometry with angle marks, sectors and shaded regions, Venn diagrams, 3D solids, clock faces and number lines

**Learning loop**
- Concept lessons with inline checks; formula revision in five modes (recall, recognise, apply, browse, weak)
- Progressive, question-specific hints; worked solutions and common mistakes; a mistakes list that clears only once you get it right
- Per-concept mastery (0–100, with decay) and spaced repetition; Smart Practice mixes weak concepts, due reviews, new material and maintenance
- Mock tests in four exam patterns (IBPS/SBI prelims, SSC CGL tier 1, CAT quant, campus placement) with the exam's clock and marking, a question palette, and an analysis of time, sections, topics and what to skip next time
- Must-know tables with 60-second speed drills, and printable quick sheets of formulas, shortcuts, common traps and exam strategy for the day before the exam

**Motivation**
- XP, ranks and achievements; a forgiving daily streak with earned freezes and streak repair
- A mastery map on every topic page
- A daily challenge that is the same for everyone on a given day, shareable as a spoiler-free emoji grid
- An optional daily reminder, scheduled by your own browser

## Your progress

Everything lives in your browser's `localStorage` under `quantmaster:v1:*`; nothing is ever sent anywhere.

- **Export:** Settings → Your data → Export downloads a JSON backup.
- **Import:** Settings → Your data → Import (on another device, or after clearing). It shows both copies side by side and merges them by default, so nothing earned on either device is lost; replacing is the other choice.
- **Reset:** Settings → Your data → Reset.

## Run it yourself

Requires Node 20+.

```bash
npm install
npm run dev          # http://localhost:5173
```

| Command | What it does |
| --- | --- |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm run validate-data` | Check every content file: references, answers, hints, figures, and every generator over 400 seeds |
| `npm test` | Engine tests (Vitest) |
| `npm run test:e2e` | Browser tests (Playwright); first run `npx playwright install chromium` |
| `npm run check` | Validate + test + build |
| `npm run check:full` | `check` plus the browser tests: what CI runs |
| `npm run content:export -- <topic>` | Write a topic as a spreadsheet in `content-sheets/` for editing |
| `npm run content:import -- <file>` | Check an edited spreadsheet and show what would change; add `--write` to save it |

### Host your own copy

1. Fork this repository.
2. In your fork: **Settings → Pages → Source: GitHub Actions**.
3. Push to `main` (or run the "CI and deploy" workflow). It validates, tests, builds and publishes to `https://<you>.github.io/<repo>/`. No secrets or settings are needed; the address and sub-path come from your repository.

To build for a sub-path by hand: `BASE_PATH=/quantmaster/ SITE_URL=https://smacacademy.github.io/quantmaster/ npm run build`.

### Install and offline

The production build is a Progressive Web App. A service worker (built from `src/pwa/sw-template.js`) caches the whole app on the first visit, so lessons, questions, simulations and progress all work without a connection. Topic content and the question generators load in the background (see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#loading-and-code-splitting)). Page loads check the network first, so a new version is picked up on the next launch. The service worker is only registered in production builds.

## Adding content

Drop one JSON file into `src/data/content/<topicId>.json` with `concepts`, `formulas`, `levels` and `questions`, then run `npm run validate-data`. No code changes. Or edit a topic in a spreadsheet: `npm run content:export -- <topic>`, edit, `npm run content:import -- <file> --write`. See [docs/ADDING_CONTENT.md](docs/ADDING_CONTENT.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

## Project layout

```
src/
  main.js              routes and global event wiring
  app/                 config (every tunable number), router, state, event bus
  data/                topics.json, achievements.json, content/<topic>.json
  repositories/        content and progress access (the only place storage is touched)
  services/            learning, mastery, spaced repetition, quiz, sessions,
                       recommendations, gamification, sharing, reminders
  generators/          validated question templates (unlimited practice)
  simulations/         interactive simulations: pure models, sliders in, numbers and a picture out
  mock/                mock tests: exam patterns, paper assembly, scoring and analysis
  components/          shell, cards, question renderers, figures, charts, simulations
  views/               one file per screen
  pwa/                 service worker template, install and offline handling
  styles/              tokens, layout, components, animations
scripts/               content validator, spreadsheet export/import, build-time content split
tests/                 engine tests (Vitest) and browser tests (tests/e2e, Playwright)
docs/                  architecture, data model, adding content, roadmap
```

More: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · [docs/DATA_MODEL.md](docs/DATA_MODEL.md) · [docs/ADDING_CONTENT.md](docs/ADDING_CONTENT.md) · [docs/ROADMAP.md](docs/ROADMAP.md)

## Keyboard shortcuts

| Where | Keys |
| --- | --- |
| Quiz | `1`–`6` pick an option · `Enter` submit / next · `H` next hint |
| Formula cards | `Space` flip · `←` need practice · `→` know it |
| Anywhere with search | `/` focus search |

## Known limitations

- Progress is per browser. To move it, export a file and import it on the other device, where it is merged in; there is no automatic sync.
- Reminders appear while the app is open, and on Android when it is installed; they cannot reach a closed app on an iPhone.
- The share button relies on the Web Share API or clipboard access, which some embedded browsers block.
- Mastery and review scheduling are transparent rule-based models, not calibrated psychometrics. The app says so.

## Contributing and licences

Corrections, new questions, translations and code are all welcome: see [CONTRIBUTING.md](CONTRIBUTING.md). Ideas for missing topics or simulations go in [Discussions → Ideas](https://github.com/SMACAcademy/quantmaster/discussions/categories/ideas); every solution in the app also has an "Ask or share a quicker way" link and a "Report a problem" link that open GitHub with the question already filled in. Please follow the [Code of Conduct](CODE_OF_CONDUCT.md); report security issues as described in [SECURITY.md](SECURITY.md).

- **Code:** MIT licence, see [LICENSE](LICENSE).
- **Content** (lessons, questions, explanations, formula and shortcut cards, in `src/data/`): Creative Commons Attribution-ShareAlike 4.0 International, see [CONTENT-LICENSE.md](CONTENT-LICENSE.md).

Made by [Muthukumar Subramanian](https://www.linkedin.com/in/muthu4all/) (SMAC Academy) and [contributors](https://github.com/SMACAcademy/quantmaster/graphs/contributors).
