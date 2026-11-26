# Roadmap

How QuantMaster was built, and where it could go next. The app is a static,
server-free PWA: no accounts, nothing leaves the learner's browser.

## What has been built

### Content: every topic, every concept

- **Logical reasoning** (fifteen topics): seating arrangement, puzzles, syllogism, reasoning inequalities, blood relations, direction sense, coding-decoding, order and ranking, cubes and dice, mirror images and paper folding, CAT-style logical sets (tournaments, routes, schedules), series, analogy and classification, mathematical operations, input-output and reasoning data sufficiency. Every hand-written answer is re-solved from a structured copy of the question by brute force or exact computation, and every generated one is checked by a second, independent method (`tests/reasoning-content.test.js`, `tests/reasoning-more-content.test.js`, `tests/reasoning-final-content.test.js`, `src/utils/reasoning/`). Input-output sets are re-run on a simulated machine, and data sufficiency answers come from the set of arrangements left by each statement and by both.
- **CAT and placement topics:** modulus, polynomials (remainder and factor theorems, roots and coefficients), integer solutions of linear equations, and cryptarithms. Every hand-written answer is recomputed in a test, and every generated cryptarithm is proved to have exactly one solution by trying every assignment of digits (`tests/cryptarithm.test.js`, `src/utils/cryptarithm.js`).
- **94 topics** across arithmetic, algebra, geometry, combinatorics, data and logical reasoning, each with concept lessons, a formula revision level, easy/medium/complex practice and mixed practice. **30 Advanced units** (a lesson and a timed challenge each) cover the harder material inside its parent topic: x + 1/x and three-variable identities, radians and maximum values in trigonometry, prisms, pyramids and frustums, two circles and common tangents, nested moduli, remainders on division by a quadratic, three-variable sums, three-word letter sums, Fermat, Euler and Wilson, numbers from their remainders, circular tracks, conditional probability, quantitative comparison, centres of a triangle and congruence, equal instalments (EMI), AM ≥ GM and maxima, number bases, true and banker's discount, stocks and shares, sectors and segments, and more.
- **Every concept has question generators** (about 778 templates, roughly 190,000 distinct questions in a validation run). Each template checks its own answer a second, independent way and is rejected if it disagrees (`src/generators/`, `docs/ADDING_CONTENT.md`).
- **Over 1,600 hand-written questions**, every topic with at least 13. All of the older ones were re-solved independently in an audit; 20 were fixed (two wrong answers, the rest ambiguities, duplicate-form options and figures that contradicted their text). `tests/content.test.js` now rejects a choice question that offers the same ratio or number twice.
- **Revision:** formula and shortcut cards for every topic, printable quick sheets (formulas, shortcuts, common traps and exam strategy), and must-know tables (squares, cubes, fraction–percentage equivalents, primes, powers, triplets, trigonometric values) with 60-second speed drills.
- **Mock tests** in seven exam patterns: quantitative aptitude (IBPS/SBI prelims, SSC CGL tier 1, CAT quant, campus placement) and logical reasoning (IBPS/SBI prelims, SSC CGL tier 1, campus), each with the exam's clock and marking, a question palette with mark-for-review, and an analysis of score, time per question, sections, topics and what to skip next time.

### Pictures and simulations

- **94 interactive simulations** with sliders, live pictures and "Try this" challenges, each placed in its topic's first lesson and listed on the Explore page: percentage changes, interest, alligation, work, pipes, trains, boats, clocks, parabolas, lines, inequalities, progressions, logarithms, triangles, circles, polygons, solids, trigonometry, heights, probability, statistics, ratio bar models, partnership areas, HCF tiles, LCM bells, ages, calendars, fractions, identities as areas, a line explorer, function shifts, Venn diagrams, counting slots, Pascal's triangle, sequence differences, the prime sieve, divisibility tests, factor pairs, decimals, index laws, the unit ladder, algebra tiles, bar graphs, line graphs, pie charts, DI tables, data sufficiency, parallel lines and a transversal, the quadrilateral family, fixed perimeter against area, shaded regions (outer minus inner), recasting solids, the remainder wheel, primes inside n!, square roots from their two ends, the base method as an area, the BODMAS stack, an estimate's error band, a tree of choices, elements in sets and the power set, a caselet filling a table, radar against grouped bars, races, wages by work done, quadratic roots compared on two number lines, the x + 1/x ladder, a sin θ + b cos θ as a rotating vector, slicing the top off a cone, two circles and their common tangents, a histogram that becomes a polygon and an ogive, modulus as a distance (and the flat bottom of a V), the remainder as the height of a cubic, whole-number points on a line, a letter sum solved column by column, and fifteen for reasoning: seating clues, a puzzle grid, syllogism circles, an inequality chain, a family tree, a walker following directions, two alphabet wheels, a row counted from both ends, a painted cube cut into small cubes (with a die’s net), paper folded, punched and opened out (with a mirror clock), a round-robin points table, letters as numbers on an alphabet strip, symbol tiles swapped into an expression, a rearranging machine, and arrangements struck out statement by statement.
- **Figures in questions:** charts (bar, line, pie, combo, radar), tables, coordinate planes, 2D diagrams with angle and right-angle marks, sectors, arcs and shaded regions, Venn diagrams, 3D solids (cubes, cuboids, cylinders, cones, spheres, hemispheres, frustums and stacks of them, prisms, pyramids and pyramid frustums), clock faces, number lines, views and nets of dice, and folded, punched paper. Every figure is drawn to scale from the question's own numbers and checked by `npm run validate-data`.

### Learning engine and motivation

- Bounded concept mastery with decay, spaced-repetition review of formula cards, a mistakes list that clears only when the mistake is corrected, and rule-based recommendations that always state their reason.
- XP and ranks, daily streaks with earned freezes and streak repair, milestone celebrations, achievements, a per-topic mastery map, a daily challenge (the same questions for everyone on a date, shareable as a spoiler-free emoji grid), and an optional on-device daily reminder.
- Installable and fully offline after one visit; progress can be exported to a file and imported on another device, where it merges with what is already there (XP, streaks, mistakes, achievements and answers from both are kept).

### History in brief

An earlier, private edition also had optional accounts with cloud sync, friend leagues and push reminders, backed by a hosted database and a small server. They were removed when the project became public, so that it runs entirely as static files on GitHub Pages and anyone can fork and host it.

## Ideas for what is next

Contributions are welcome; see `CONTRIBUTING.md`.

- **A subject-expert review** of the hand-written content.
- **More questions** in the topics with the fewest, and more exam-style sets (previous-year *patterns*, written fresh).
- **Translations:** the content files are plain JSON and can be exported to spreadsheets (`npm run content:export`), which suits translators.
- **Accessibility:** a full screen-reader pass over simulations and figures.
- **Smaller first download:** the question generators load as one lazy chunk (about 270 kB compressed, cached for offline use); splitting it by topic would help slow connections.

## How changes are checked

- `npm run validate-data`: content structure, figures, charts and every generator over 400 seeds.
- `npm test`: the learning rules, generators, simulations' maths and figures' geometry (4,600+ tests).
- `npm run test:e2e`: the built app driven through real screens, including offline.
- `npm run check:full` runs all of them; CI runs them on every pull request and before every deploy.
