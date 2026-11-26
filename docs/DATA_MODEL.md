# Data model

## Content files

```
src/data/
  topics.json               the catalogue (all 84 topics)
  achievements.json
  content/<topicId>.json    { topicId, concepts[], formulas[], levels[], questions[] }
  concepts/percentages.json   ┐
  formulas/percentages.json   │ split layout, used for the large reference topic.
  levels/percentages.json     │ Each file holds one of the four arrays.
  questions/percentages.json  ┘
```

Both layouts are loaded automatically and can be mixed.

## Topic

```json
{
  "id": "percentages",
  "name": "Percentages",
  "category": "arithmetic",
  "categoryName": "Arithmetic",
  "description": "…",
  "whyItMatters": "…",
  "glyph": "%",
  "colorToken": "arithmetic",
  "prerequisites": [],
  "sortOrder": 10,
  "contentStatus": "reference | core | seeded | planned",
  "active": true,
  "tags": []
}
```

A topic is "playable" when at least one level references it. Level ids are derived from the levels, not stored on the topic, so they can't drift apart.

`colorToken` maps to a CSS variable `--cat-<token>`: `arithmetic`, `algebra`, `geometry`, `combinatorics`, `data`, `reasoning`, `advanced`. `reasoning` (Logical Reasoning) is the only token with a separate light-theme value, a deeper cyan for contrast.

## Concept

```json
{ "id": "pct-reverse", "topicId": "percentages", "name": "Reverse percentage", "description": "…", "sortOrder": 9 }
```

Mastery is tracked per concept. Topic mastery is the average over all of a topic's concepts.

## Formula

```json
{
  "id": "pct-reverse",
  "topicId": "percentages",
  "conceptId": "pct-reverse",
  "kind": "formula | shortcut",
  "title": "Reverse percentage",
  "prompt": "A value is known AFTER a percentage change. How do you find the original?",
  "formula": "Original = New ÷ (1 ± r/100)",
  "variables": [{ "symbol": "r", "meaning": "the percentage change already applied" }],
  "explanation": "…",
  "example": "…",
  "commonMistake": "…",
  "applicationPrompt": "After a 20% discount an item costs ₹960. Which formula gives the marked price?",
  "tags": [],
  "difficulty": "easy | medium | complex"
}
```

`prompt` is the card front. `applicationPrompt` drives the "Apply" revision mode. Wrong options in "Recognise" and "Apply" modes are other cards, preferring the same topic and the same kind.

`commonMistake` also feeds the traps sheet (`#/sheet?kind=traps`), which lists every card's mistake by topic. Exam-strategy cards are not topic content: they live in `src/data/strategies.js`, each with a `check()` that recomputes its example.

`kind` is optional and defaults to `formula`. A `shortcut` is a faster route to an answer (a derived result, a mental-arithmetic trick) rather than the rule itself. Both kinds are revision cards and share everything else: flashcards, review scheduling, sync. The kind only decides where a card is listed: the Revise page can be limited to one kind, and the quick sheets (`#/sheet`) show formulas and shortcuts separately. A shortcut should always carry an `example` and a `commonMistake`, because the shortcut sheet shows them.

## Level

```json
{
  "id": "percentages-level-6",
  "topicId": "percentages",
  "order": 6,
  "title": "Reverse Percentages",
  "description": "…",
  "type": "concept | formula_revision | formula_recognition | method_recognition | guided_practice | easy_practice | medium_practice | complex_practice | mixed_practice | challenge",
  "difficulty": "medium",
  "estimatedMinutes": 12,
  "prerequisiteLevelIds": ["percentages-level-5"],
  "conceptIds": ["pct-reverse"],
  "questionIds": ["percentages-q-141"],
  "questionQuery": { "topicId": "percentages", "difficulties": ["medium", "complex"], "count": 8, "preferUnseen": true },
  "formulaIds": [],
  "lesson": { "blocks": [] },
  "passCriteria": { "minimumAccuracy": 70, "minimumQuestionsAttempted": 5 },
  "timerSecondsPerQuestion": 75,
  "xpReward": 45
}
```

Which fields apply depends on `type`:

| Type | Uses |
| --- | --- |
| `concept` | `lesson.blocks` |
| `formula_revision` | `formulaIds`; pass with `passCriteria.minimumRecalled` |
| everything else | `questionIds` **or** `questionQuery` |

`questionQuery` lets mixed and challenge levels draw from the topic's pool instead of listing ids.

Clock figures: `{ type: "clock", hour: 3, minute: 40, hands: "both" }` draws a clock face with the hands at that time (the hour hand moves with the minutes). `hands` is `both` (default), `hour`, `minute` or `none`; use `none` when the hands would give the answer away.

Number-line figures: `{ type: "numberline", min: -5, max: 5, step?: 1, ranges: [{ from: -2, to: null, fromOpen: true }], points: [{ value: 3, label: "3", open?: false }] }`. A range is drawn as a band; `from: null` runs to −∞ and `to: null` to +∞; open ends are hollow dots, closed ends filled.

Dice figures: `{ type: "dice", views: [{ top: "1", front: "2", right: "3" }, ...] }` draws each view of one die as a cube showing its top, front and right faces (with the same slant as solid figures); `{ type: "dice", net: [[column, row, label], ...] }` draws a flat net of six squares (row 0 at the top), which must fold into a cube. Also give the views in the question's `context` as text, for screen readers and for checking.

Paper figures: `{ type: "paper", size: 4, folds: ["left", "top"], punches: ["D4"], unfolded?: true }` draws a square sheet ruled into size × size squares (columns A, B, ... from the left, rows 1, 2, ... from the top), one panel per fold with the moving half shaded and the fold line dashed, then the punched paper; `unfolded` adds the sheet opened out (for lessons, not for questions that ask where the holes are). Folds: `left`, `right`, `top`, `bottom` (half over the other half) and `diag`, `anti` (along a diagonal, last only). Every punch must lie on the folded paper and not on a diagonal fold line; `src/utils/reasoning/mirror.js` has the rules.

Solid figures (3D): `{ type: "solid", parts: [{ shape: "cylinder", r: 7, h: 10, labels: { r: "7 cm", h: "10 cm" } }, { shape: "cone", r: 7, h: 24, labels: { l: "?" } }] }`. Parts stack from the bottom up on one axis. Shapes: `cube { a }`, `cuboid { l, b, h }` and `sphere { r }` on their own; `cylinder { r, h }`, `cone { r, h, down? }`, `hemisphere { r, down? }` and `frustum { R, r, h }` in any sensible stack (`down` only on the bottom part: an ice-cream cone, a bowl). Sizes are the question's own numbers, so the drawing is to scale. Label keys per shape are listed in `src/utils/solidGeometry.js` (`d` is a space diagonal, `l` a slant height); label only what the question gives, and use `"?"` only for the single length asked for.

Venn figures: `{ type: "venn", sets: ["Cricket", "Football"], universe: "50 students", regions: { a: 20, b: 15, ab: 8, none: "?" } }`. Two or three sets; region keys name the circles a region is inside (`a`, `b`, `c`, `ab`, `ac`, `bc`, `abc`) or `none`; each value is a count or `"?"`, and a region left out is drawn empty. Show only numbers the question already gives, and `"?"` only where the answer is that single region.

Diagram figures: arcs, sectors and shaded regions. Angles are bearings, in degrees clockwise from the top as seen on screen (0 = up, 90 = right), and `endAngle` must be greater than `startAngle` (use 270 → 360, not 270 → 0).
- `{ type: "arc", center, radius, startAngle, endAngle }` draws just the arc; `{ type: "sector", center, radius, startAngle, endAngle }` draws the slice (both radii and the arc).
- `shaded: [{ parts: [...], mode?, label?, labelAt? }]` shades a region with a light tint and hatching, under the outlines. Parts are `{ type: "polygon", points: [ids] }`, `{ type: "circle", center, radius }`, `{ type: "sector", center, radius, startAngle, endAngle }` and `{ type: "segment", center, radius, startAngle, endAngle }` (a circular segment: the arc and its chord). By default a spot is shaded when it lies inside an odd number of parts, so a square plus its inscribed circle shades the corners, two circles make a ring, and a square plus four corner sectors shades what the sectors leave. `mode: "intersect"` shades only where all parts overlap (the "leaf" of two quarter circles). `label` (for example `"?"`) is written at the point `labelAt`; a point can be `hidden: true` just to place it.
- Shade only the region the question is about, and never write its area on the figure.

Diagram figures: a `segment` shape may carry a `label` (for example "30 m" or "?"), drawn beside its middle; `labelOffset: [dx, dy]` in pixels moves it.

Charts: `type` is `bar`, `line`, `pie`, `combo` (each series has `kind: "bar"` or `"line"`, sharing one axis; at least one of each) or `radar` (one spoke per category, at least 3).

Lesson block types: `text` (title, body), `formula` (title, body, caption), `example` (title, body), `callout` (tone, body), `check` (questionId — an inline question), `simulation` (simulationId — an interactive simulation from `src/simulations/`).

Levels unlock when all `prerequisiteLevelIds` are completed. Any level can be replayed.

## Question

Common fields:

```json
{
  "id": "percentages-q-141",
  "topicId": "percentages",
  "conceptId": "pct-reverse",
  "levelId": "percentages-level-6",
  "difficulty": "easy | medium | complex",
  "learningStage": "foundation | recognition | guided | independent | mixed | challenge",
  "type": "single_choice",
  "question": "A number becomes 500 after being increased by 25%. What was the original number?",
  "context": "optional preamble or worked solution to inspect",
  "table": { "caption": "…", "headers": ["…"], "rows": [["…"]] },
  "explanation": "…",
  "solutionSteps": ["…"],
  "formulaIds": ["pct-reverse"],
  "method": "…",
  "hints": [{ "level": 1, "text": "…" }, { "level": 2, "text": "…" }],
  "commonMistakes": ["…"],
  "tags": [],
  "estimatedSeconds": 55,
  "templateId": null,
  "source": "original",
  "version": 1,
  "active": true
}
```

Difficulty (how hard) and learning stage (how supported) are separate on purpose.

Type-specific fields:

| Type | Fields |
| --- | --- |
| `single_choice`, `formula_recognition`, `formula_selection`, `method_recognition`, `statement_evaluation`, `identify_error`, `next_step`, `estimate` | `options: [{id, text}]`, `correctAnswer: [id]` |
| `assertion_reason` | as above, plus `assertion`, `reason` |
| `multiple_choice` | `options`, `correctAnswer: [id, id, …]` (exact set required) |
| `numerical_input` | `answer: { value, tolerance, unit? }` — commas, spaces, ₹ and % in the typed answer are ignored |
| `match_following` | `pairs: [{ left, right }]` — right-hand values must be unique |
| `ordering` | `steps: [{ id, text }]` in the correct order; shown shuffled |

Hints must be numbered 1…n and specific to the question.

## Learner progress (`localStorage: quantmaster:v1:progress`)

```text
schemaVersion, createdAt, updatedAt, lastActivityAt
xp            { total, byDay: { "YYYY-MM-DD": n } }
rankId
streak        { current, longest, lastPracticeDay, days: { "YYYY-MM-DD": { questions, correct, formulas, lessons, xp, sessions } } }
stats         { questionsAnswered, correctAnswers, hintsUsed, totalTimeSeconds, sessionsCompleted,
                formulasReviewed, formulaRecallCorrect, mistakesCorrected, conceptLessonsCompleted,
                timedChallengesCompleted, levelsCompleted, longestSessionQuestions,
                independentAfterGuided, perfectSessionBest }
topics        { [topicId]: { startedAt, lastVisitedAt, questionsAnswered, correctAnswers, currentLevelId, completedLevels } }
levels        { [levelId]: { status, attempts, bestAccuracy, questionsAnswered, completedAt, lastAttemptAt } }
concepts      { [conceptId]: { attempts, correctAttempts, hintedAttempts, totalTimeMs, lastAttemptedAt, lastCorrectAt,
                               lastSessionId, consecutiveCorrect, consecutiveIncorrect, masteryScore } }
formulas      { [formulaId | "concept:<id>"]: { lastReviewedAt, nextReviewAt, intervalDays, ladderStep, ease,
                               reviewCount, correctCount, incorrectCount, lapses, confidence, status } }
questions     { [questionId]: { attempts, correctAttempts, timesWrong, firstSeenAt, lastAttemptAt, lastResult,
                               lastHintsUsed, lastWrongSessionId, neededHints, resolved, mistakeType } }
achievements  { [id]: { unlockedAt } }
sessionLog    [ { id, at, mode, title, total, attempted, correct, accuracy, xp, topicId, levelId } ]  (last 60)
```

Individual attempts are kept separately under `quantmaster:v1:attempts` (last 1,500), used for weekly and difficulty charts.

Older saves are migrated on load by merging onto the current empty shape, so new fields appear with defaults.

## Relational shape (for a future database)

```text
topics, categories, levels, concepts, formulas,
questions, question_options, question_hints, question_tags,
user_progress, question_attempts, concept_mastery, formula_reviews,
achievements, user_achievements, daily_sessions
```

## Spreadsheet format

A topic can be exported to a workbook, edited and imported back (`npm run content:export` / `content:import`; how to use it is in [ADDING_CONTENT.md](ADDING_CONTENT.md)). One workbook per topic:

| Sheet | Columns |
| --- | --- |
| Topic | key, value (one row: `topicId`) |
| Concepts | id, name, description |
| Formulas | id, concept, kind, title, prompt, formula, explanation, example, commonMistake, applicationPrompt, variables, tags, difficulty |
| Levels | id, order, title, description, type, difficulty, minutes, xp, prerequisites, concepts, formulas, questions, queryDifficulties, queryCount, queryConcepts, queryPreferUnseen, minAccuracy, minAttempted, minRecalled, timerSeconds |
| Lessons | level, type, title, body, caption, tone, question |
| Questions | id, concept, level, difficulty, stage, type, question, context, optionA–optionE, correct, tolerance, unit, explanation, step1–step5, hint1–hint3, mistake1–mistake2, method, formulas, tags, seconds, active |

Every sheet except Topic also has an `extra` column: a JSON object merged over the row after its columns are read. It carries whatever the columns cannot (`table`, `chart`, `figure`, `pairs`, `steps`, `assertion`, `reason`), which is what makes the conversion exact: `fromSheets(toSheets(content))` gives back the same content for every topic, and a test holds it to that.

The conversion is `scripts/lib/contentSheet.js` (no file access, so it is tested directly); `sheetFiles.js` reads and writes `.xlsx` and `.csv`, and `topicFiles.js` reads and writes the topic's JSON in whichever layout it uses. On save, existing objects keep the key order they have in the file, so a commit shows only real changes.
