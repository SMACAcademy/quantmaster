# Adding content

All content is JSON. You never need to touch application code to add a topic, level, formula or question. You can edit the JSON directly, or edit a topic in a spreadsheet and import it (next section); both end up as the same files.

After any change:

```bash
npm run validate-data
```

It reports broken references, unanswerable questions, duplicate ids, malformed hints and ambiguous matches. Fix every error; warnings are advisory.

## Edit content in a spreadsheet

Instead of editing JSON, you can edit a topic in Excel (or any program that opens `.xlsx`):

```bash
npm run content:export -- averages
```

This writes `content-sheets/averages.xlsx` (the folder is not committed). Edit it, save, then:

```bash
npm run content:import -- content-sheets/averages.xlsx
```

That is a dry run: it checks every row and lists what would be added, changed and removed, without saving anything. When it looks right:

```bash
npm run content:import -- content-sheets/averages.xlsx --write
```

`--write` saves into `src/data`, then runs the content validator. If the validator finds a problem, the files are put back exactly as they were. Afterwards run `npm run check` and commit as usual.

Other forms: `npm run content:export -- all` exports every topic; `npm run content:template` writes a small example workbook for a new topic (the topic must be in `topics.json` before you import it); adding `--csv` to an export writes a folder with one `.csv` per sheet, and `content:import` accepts that folder.

### The sheets

| Sheet | One row per | Notes |
| --- | --- | --- |
| Topic | (one row) | The topic's id. |
| Concepts | concept | Row order is the teaching order. |
| Formulas | formula or shortcut card | `kind`: blank for a formula, `shortcut` for a shortcut. `variables`: one per line in the cell, as `symbol = meaning`. |
| Levels | level | Row order is the level order. |
| Lessons | lesson block | `level` says which level it belongs to; blocks appear in row order. |
| Questions | question | Options in `optionA`–`optionE`, the answer in `correct`, steps, hints and mistakes in their own columns. |
| Guide | column | What every column means. Ignored on import. |

Every workbook's **Guide** sheet describes each column, so it is not repeated here. The essentials:

- **A new question needs only**: `concept`, `level`, `difficulty`, `type`, `question`, the options (or nothing, for `numerical_input`), `correct` and `explanation`. Leave `id` blank and it gets the next free `<topic>-q-NNN`.
- **`correct`** is the letter of the right option (`B`), several letters for `multiple_choice` (`A, C`), or the number for `numerical_input`.
- **A question joins its level automatically.** If a level's `questions` cell is blank, the level uses every question whose `level` is that level, in row order. Fill the cell in only to choose a different set or order.
- **Blank cells take sensible defaults**: a level's id is `<topic>-level-<order>`, its prerequisite is the level above (write `none` for no prerequisite), and a question's `stage` follows its difficulty.
- **Never change an id** that learners have already used: progress is stored by id. To retire a question, set `active` to `FALSE`.
- **`extra`** holds the parts that do not fit in columns (a question's `table`, `chart` or `figure`, matching `pairs`, ordering `steps`) as JSON, in the shapes given in [DATA_MODEL.md](DATA_MODEL.md). Leave it alone unless you are editing one of those.

Mistakes are reported by sheet and row, for example `Questions, row 16: correct answer "E" is not one of the options given`.

Two things to know about spreadsheet programs. Excel likes to turn `1/2` into a date, `3:4` into a time and `25%` into 0.25; the exported workbooks format the option and answer columns as Text to stop that, and the importer refuses a cell that became a date rather than guess. And CSV has no such protection, so prefer `.xlsx` when editing by hand.

## Add a simulation

Simulations live in code, not JSON, because each one is a small model: `src/simulations/<area>.js`, listed in `src/simulations/index.js`. The shape is described at the top of `src/simulations/core.js`:

- `controls`: sliders (`range`), choices (`choice`) and a "run again" button (`reroll`, for random experiments).
- `compute(values)`: returns the raw `numbers`, the `readouts` to show, the `plot` to draw (`xy`, `bars`, `clock` or `seesaw`, see `src/components/simPlots.js`) and one `insight` sentence about the current settings.
- `tasks`: two to four "Try this" challenges, each with a `check` and a `solution` (the settings "Show me" applies).

Then add its entry to `src/simulations/meta.js` (id, topic, title, summary, challenge ids): the app lists simulations from there without loading them, and a test fails if the two disagree.

`tests/simulations.test.js` runs every simulation at every corner of its settings, checks that each challenge's solution solves it and that the starting settings solve none, and holds the maths to the topic's formulas. Add a case there for the new one.

To show a simulation inside a lesson, add a block `{ "type": "simulation", "simulationId": "<id>" }` (in a spreadsheet: type `simulation`, id in the `simulation` column). Every simulation also appears on its topic page and on the Explore page automatically.

## Add a topic

1. **The catalogue entry** probably already exists in `src/data/topics.json` (all 74 current topics are there). If not, add one with a unique `id`, a `category` from `arithmetic | algebra | geometry | combinatorics | data | advanced`, a short `glyph` and a `description`. Adding `whyItMatters` shows a callout on the topic page.
2. **The content** goes in one new file: `src/data/content/<topicId>.json`

```json
{
  "topicId": "trains",
  "concepts": [],
  "formulas": [],
  "levels": [],
  "questions": []
}
```

The topic becomes playable as soon as it has at least one level. Copy `content/time-and-work.json` as a template; it has every level type a normal topic uses.

A good default ladder:

| order | type | purpose |
| --- | --- | --- |
| 0 | `concept` | lesson with 1–2 inline checks |
| 1 | `formula_revision` | 3–6 formula cards |
| 2 | `easy_practice` | 3–5 one-step questions, one recognition question |
| 3 | `medium_practice` | 3–5 two-step questions |
| 4 | `complex_practice` | 2–3 multi-concept questions |
| 5 | `mixed_practice` | `questionQuery` over the whole topic |

Chain them with `prerequisiteLevelIds` pointing at the previous level.

## Add a level

Append to the topic's `levels` array with a unique id (convention `<topicId>-level-<n>`) and a unique `order`. Use either `questionIds` or a `questionQuery`:

```json
"questionQuery": {
  "topicId": "trains",
  "difficulties": ["medium", "complex"],
  "count": 8,
  "preferUnseen": true
}
```

For a timed challenge add `"timerSecondsPerQuestion": 60` — learners get an optional timed toggle.

## Add a formula

```json
{
  "id": "trains-crossing",
  "topicId": "trains",
  "conceptId": "trains-length",
  "title": "Train crossing a platform",
  "prompt": "How far does a train travel to completely cross a platform?",
  "formula": "Distance = Train length + Platform length",
  "variables": [],
  "explanation": "The front must travel the platform's length, then the rest of the train must clear it.",
  "example": "150 m train, 250 m platform → 400 m",
  "commonMistake": "Using only the platform length.",
  "applicationPrompt": "A 150 m train crosses a 250 m platform. What distance does it cover?",
  "difficulty": "easy"
}
```

### Add a shortcut

A shortcut is the same card with `"kind": "shortcut"` (in a spreadsheet, the `kind` column on the Formulas sheet). Use it for a faster route to an answer, not for the rule itself: "two discounts of a% and b% equal a + b − ab/100 %", "65² is 6 × 7 followed by 25".

- `prompt`: the situation in which the shortcut applies, as a question.
- `formula`: the shortcut itself, short enough to read at a glance. Line breaks are kept.
- `example`: one worked example with real numbers. Required in practice: the shortcut sheet shows it, and a shortcut without an example is hard to trust. Work the numbers out before you commit them.
- `commonMistake`: the usual slip.

Shortcuts appear in the shortcut sheet and under "Shortcuts" on the topic page, and can be revised as flashcards on their own. They are not added to a topic's Formula Revision level unless you list their ids there.

Write `prompt` as a question the learner can try to answer from memory. It's the front of the card.

## Add a question

Minimal single-choice question:

```json
{
  "id": "trains-q-001",
  "topicId": "trains",
  "conceptId": "trains-length",
  "levelId": "trains-level-2",
  "difficulty": "easy",
  "learningStage": "independent",
  "type": "single_choice",
  "question": "A 150 m train passes a pole in 10 seconds. What is its speed?",
  "options": [
    { "id": "a", "text": "10 m/s" },
    { "id": "b", "text": "15 m/s" },
    { "id": "c", "text": "25 m/s" },
    { "id": "d", "text": "54 m/s" }
  ],
  "correctAnswer": ["b"],
  "explanation": "Passing a pole means covering the train's own length: 150 ÷ 10 = 15 m/s.",
  "solutionSteps": ["Distance = train length = 150 m.", "Speed = 150 ÷ 10 = 15 m/s."],
  "formulaIds": ["trains-crossing"],
  "method": "Distance is the train's length when passing a point.",
  "hints": [
    { "level": 1, "text": "What distance does the train cover to pass a single pole?" },
    { "level": 2, "text": "Its own length — 150 m." }
  ],
  "commonMistakes": ["Adding a platform length that isn't there."],
  "tags": ["basic"],
  "estimatedSeconds": 40,
  "source": "original",
  "version": 1,
  "active": true
}
```

Then add its id to a level's `questionIds` (or make sure a `questionQuery` level covers its topic). The validator warns about unreachable questions.

See [DATA_MODEL.md](DATA_MODEL.md) for the extra fields each question type needs.

## Quality checklist

The validator can't check the maths. Before committing a question:

- Work the answer out independently and substitute it back into the question.
- Make each distractor a *specific* plausible error (wrong base, forgot to halve, added percentages), and name those errors in `commonMistakes`.
- Hints escalate: which concept → which formula → first step. Never "think carefully".
- `explanation` says *why*, not just the result.
- Match `difficulty` to reasoning depth, not to the size of the numbers.
- For `match_following`, every right-hand value must be unique.
- `npm test` also checks every question accepts its own stated answer.

## Add a question generator (template)

Authored questions teach; generators give unlimited practice on the same concept. A template is code (not JSON) because it has to compute and verify an answer. Templates live in `src/generators/templates/*.js` and are listed in `src/generators/index.js`.

```js
{
  id: 'tsd-basic-speed',          // stable; part of every generated question id
  version: 1,                      // bump when the maths or wording changes
  topicId: 'time-speed-distance',
  conceptId: 'tsd-relation',
  difficulty: 'easy',
  type: 'single_choice',           // or 'numerical_input'
  formulaIds: ['tsd-basic'],
  answerDecimals: 0,               // the correct answer must be this clean
  formatValue: (value) => format.kmh(value),

  params(rng) {                    // pick numbers; return null to reject a seed
    const t = rng.int(2, 8);
    const speed = rng.int(3, 15) * 5;
    return { t, d: speed * t };
  },
  answer: ({ d, t }) => d / t,
  distractors: ({ d, t }) => [      // each one a real, named mistake
    { value: d * t, why: 'multiplied instead of dividing' },
    { value: t / d, why: 'inverted the ratio' },
    { value: d - t, why: 'subtracted' }
  ],
  verify: ({ d, t }, value) => nearlyEqual(value * t, d),   // an INDEPENDENT check
  render: ({ d, t }, { fmt }) => ({
    question: `A car covers ${d} km in ${t} hours. What is its speed?`,
    explanation: `Speed = ${d} ÷ ${t} = ${fmt(d / t)}.`,
    solutionSteps: ['…'],
    method: 'Distance ÷ time.',
    hints: ['…', '…'],
    commonMistakes: ['…']
  })
}
```

Rules the engine enforces before anyone sees a question:

- `verify` must confirm the answer by a different route than `answer` — substitute it back, simulate it step by step, or brute-force count. If they disagree, the seed is discarded.
- The answer must be finite and within `answerDecimals`.
- There must be at least three distractors that are valid, non-negative and display differently from the answer.
- No rendered text may contain `NaN`, `undefined` or `Infinity`.

Then run `npm run validate-data` (400 seeds per template, reports valid-seed rate and variety) and `npm test` (300 seeds per template, checks options, marking and exact rebuild from the id). Aim for a valid-seed rate above 30% — if it is lower, construct the numbers so they are clean by design rather than rejecting most seeds.

**Changing a template:** bump `version`. Generated questions saved in learners' progress under the old version are then treated as unavailable instead of silently changing.

## Deactivating content

Set `"active": false` on a question or topic to hide it without deleting it.
