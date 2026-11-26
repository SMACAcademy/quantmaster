# QuantMaster

**Free, open practice for quantitative aptitude**: concept first, then formula recall, then method, then graded practice, with spaced repetition and mistake review keeping it from fading. Built for bank PO and clerk exams (IBPS, SBI), SSC CGL and CHSL, CAT, railway exams and campus placement tests.

**Use it now: https://smacacademy.github.io/quantmaster/**

- **No account, no server, no tracking.** Your progress stays in your own browser.
- **Works offline** once opened, and installs to your phone's home screen like an app.
- **Free and open:** code under the MIT licence, content under CC BY-SA 4.0. Fork it, host your own copy, translate it, improve it.

## What is in it

**Content**
- 70 topics across arithmetic, algebra, geometry, counting and probability, and data interpretation, all with full content
- 16 Advanced units inside their topics (an Advanced lesson and a timed Challenge each): circular tracks, conditional probability, quantitative comparison, sectors and segments, centres of a triangle and congruence, equal instalments (EMI), AM ≥ GM and maximum values, number bases, true and banker's discount, stocks and shares, and more
- Over 1,000 hand-written questions (every topic has at least 13), 377 concepts, formula and shortcut cards for every topic
- 11 question types: single choice, multiple choice, numeric entry, formula and method recognition, true/false, assertion–reason, match the following, ordering steps, identify the error, select the next step

**Unlimited practice**
- About 500 question generators cover every concept and produce fresh questions without end (about 119,000 distinct ones in a validation run), including generated tables, charts and geometry figures
- Every generated answer is checked a second, independent way (substitution, simulation or brute-force counting) and thrown away if the two disagree
- Wrong options are modelled on real, named mistakes, so a wrong choice teaches something

**Pictures and simulations**
- 47 interactive simulations with sliders, live pictures and "Try this" challenges: percentage changes, interest, alligation, work and pipes, trains, boats, clocks, parabolas, lines, inequalities, progressions, logarithms, triangles, circles, polygons, solids, trigonometry, probability, statistics, ratio bar models, HCF tiles, LCM bells, ages, calendars, fractions, identities as areas, Venn diagrams, counting, Pascal's triangle, the prime sieve, divisibility, decimals, index laws, units and algebra tiles
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
- **Import:** Settings → Your data → Import (on another device, or after clearing). It replaces the current progress, after asking.
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

- Progress is per browser. To move it, export and import a file; there is no automatic sync.
- Reminders appear while the app is open, and on Android when it is installed; they cannot reach a closed app on an iPhone.
- The share button relies on the Web Share API or clipboard access, which some embedded browsers block.
- Mastery and review scheduling are transparent rule-based models, not calibrated psychometrics. The app says so.

## Contributing and licences

Corrections, new questions, translations and code are all welcome: see [CONTRIBUTING.md](CONTRIBUTING.md). Please follow the [Code of Conduct](CODE_OF_CONDUCT.md); report security issues as described in [SECURITY.md](SECURITY.md).

- **Code:** MIT licence, see [LICENSE](LICENSE).
- **Content** (lessons, questions, explanations, formula and shortcut cards, in `src/data/`): Creative Commons Attribution-ShareAlike 4.0 International, see [CONTENT-LICENSE.md](CONTENT-LICENSE.md).

Made by SMAC Academy and contributors.
