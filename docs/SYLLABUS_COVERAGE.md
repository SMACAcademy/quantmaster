# Syllabus coverage and gap analysis

Date: 2026-11-26. Read-only review of the content in `src/data` and the simulation catalogue in `src/simulations`.

How a simulation is tied to a topic:

- Each simulation in `src/simulations/index.js` (mirrored in `meta.js`) has an `id` and an owning `topicId`. The topic page and the Explore gallery list it through `simulationsForTopic(topicId)`.
- A lesson shows it inline through a block `{ "type": "simulation", "simulationId": "..." }` in `src/data/content/<topicId>.json`. A lesson may embed a simulation owned by another topic ("borrowed").
- There were 47 simulations when this report was written (52 after batch 1, 57 after batch 3, 66 after batch 4). 46 topics own at least one (HCF and LCM owns two). Percentages owns `successive-change`, but its lesson files (`src/data/levels/percentages.json`) do not embed it.

Terms used below:

- Exam frequency words ("frequently", "occasionally") are judgement from syllabi and common practice. No weightages are claimed. Sources are listed at the end.
- "Exams" names exam families. "Bank" means IBPS/SBI PO and Clerk, RBI Grade B and Assistant, IBPS RRB, LIC AAO/ADO. "SSC" means CGL, CHSL, MTS, CPO, GD. "RRB" means NTPC, Group D, ALP. "MBA" means CAT, XAT, SNAP, NMAT, CMAT, MAT. "Placement" means TCS NQT, Infosys, Wipro, Accenture, Capgemini, AMCAT, eLitmus.

---

## 1. Current coverage

70 topics, all active. Questions and concepts are the hand-written ones. Generators is the number of question-generator templates tagged with the topic (approximate count of `topicId` entries in `src/generators`). Simulation: **own** = the topic owns one; **borrowed** = its lesson embeds another topic's; **none** = no simulation anywhere on the topic.

### Arithmetic (30)

| Topic id | Title | Questions | Concepts | Generators | Simulation |
|---|---|---|---|---|---|
| number-system | Number System | 32 | 11 | 18 | own: prime-sieve |
| divisibility | Divisibility | 13 | 4 | 9 | own: divisibility-checker |
| factors-multiples | Factors and Multiples | 13 | 4 | 6 | own: factor-pairs |
| hcf-lcm | HCF and LCM | 13 | 5 | 6 | own: hcf-tiles, lcm-bells |
| simplification | Simplification | 13 | 5 | 6 | **none** |
| approximation | Approximation | 20 | 7 | 8 | **none** |
| fractions | Fractions | 13 | 4 | 4 | own: fraction-bars |
| decimals | Decimals | 13 | 4 | 8 | own: decimal-zoom |
| surds-indices | Surds and Indices | 13 | 5 | 6 | own: index-laws |
| percentages | Percentages | 60 | 15 | 13 | own: successive-change (topic page only, not in lesson) |
| ratio-proportion | Ratio and Proportion | 15 | 6 | 9 | own: ratio-bar-model |
| direct-inverse-proportion | Direct and Inverse Proportion | 13 | 4 | 6 | own: proportion-curves |
| averages | Averages | 14 | 6 | 9 | borrowed: mean-median-mode |
| weighted-average | Weighted Average | 13 | 4 | 6 | borrowed: alligation-seesaw |
| mixtures-alligation | Mixtures and Alligation | 16 | 6 | 6 | own: alligation-seesaw |
| profit-loss-discount | Profit, Loss and Discount | 14 | 6 | 9 | own: markup-discount |
| simple-interest | Simple Interest | 21 | 8 | 12 | borrowed: ci-vs-si |
| compound-interest | Compound Interest | 22 | 8 | 12 | own: ci-vs-si |
| partnership | Partnership | 13 | 4 | 4 | own: partnership-shares |
| time-and-work | Time and Work | 17 | 7 | 11 | own: work-together |
| pipes-cisterns | Pipes and Cisterns | 13 | 4 | 6 | own: tank-filling |
| time-speed-distance | Time, Speed and Distance | 17 | 7 | 11 | own: tsd-meeting |
| trains | Trains | 13 | 5 | 8 | own: train-crossing |
| boats-streams | Boats and Streams | 13 | 4 | 5 | own: boats-streams |
| races | Races | 13 | 4 | 5 | borrowed: tsd-meeting |
| problems-on-ages | Problems on Ages | 13 | 4 | 8 | own: ages-timeline |
| work-and-wages | Work and Wages | 13 | 4 | 4 | borrowed: work-together |
| calendars | Calendars | 13 | 5 | 6 | own: calendar-odd-days |
| clocks | Clocks | 13 | 5 | 8 | own: clock-angle |
| unit-conversions | Unit Conversions | 13 | 5 | 6 | own: unit-ladder |

### Algebra (12)

| Topic id | Title | Questions | Concepts | Generators | Simulation |
|---|---|---|---|---|---|
| algebraic-expressions | Algebraic Expressions | 13 | 5 | 8 | own: algebra-tiles |
| linear-equations | Linear Equations | 13 | 5 | 9 | borrowed: two-lines |
| simultaneous-equations | Simultaneous Linear Equations | 13 | 5 | 10 | own: two-lines |
| quadratic-equations | Quadratic Equations | 13 | 5 | 7 | own: quadratic-roots |
| quadratic-comparison | Quadratic Comparison (x vs y) | 13 | 5 | 6 | borrowed: quadratic-roots |
| algebraic-identities | Algebraic Identities | 13 | 5 | 8 | own: identity-area |
| inequalities | Inequalities | 21 | 7 | 10 | own: inequality-line (+ quadratic-roots) |
| sequences | Sequences | 16 | 6 | 7 | own: sequence-differences |
| arithmetic-progression | Arithmetic Progression | 13 | 5 | 9 | own: ap-pairing |
| geometric-progression | Geometric Progression | 13 | 5 | 6 | own: ap-vs-gp |
| logarithms | Logarithms | 13 | 5 | 8 | own: log-curves |
| functions-graphs | Functions and Basic Graphs | 13 | 5 | 8 | own: function-shift |

### Geometry and mensuration (12)

| Topic id | Title | Questions | Concepts | Generators | Simulation |
|---|---|---|---|---|---|
| lines-angles | Lines and Angles | 13 | 5 | 6 | **none** |
| triangles | Triangles | 17 | 7 | 9 | own: triangle-angles |
| quadrilaterals | Quadrilaterals | 13 | 5 | 9 | **none** |
| polygons | Polygons | 13 | 5 | 6 | own: polygon-angles |
| circles | Circles | 21 | 7 | 9 | own: circle-angles |
| coordinate-geometry | Coordinate Geometry | 13 | 5 | 5 | own: line-explorer |
| perimeter-area | Perimeter and Area | 13 | 5 | 6 | **none** |
| mensuration-2d | 2D Mensuration | 13 | 5 | 7 | **none** |
| mensuration-3d | 3D Mensuration | 13 | 5 | 5 | own: solid-volumes |
| volume-surface-area | Volume and Surface Area | 13 | 5 | 8 | **none** |
| trigonometry | Trigonometry | 13 | 5 | 7 | own: trig-triangle |
| heights-distances | Heights and Distances | 13 | 4 | 5 | own: heights-observer |

### Counting and probability (6)

| Topic id | Title | Questions | Concepts | Generators | Simulation |
|---|---|---|---|---|---|
| counting-principle | Fundamental Principle of Counting | 13 | 5 | 6 | **none** |
| permutations | Permutations | 13 | 4 | 5 | own: counting-slots |
| combinations | Combinations | 16 | 6 | 7 | own: pascal-ncr |
| probability | Probability | 16 | 6 | 6 | own: probability-trials |
| set-theory | Set Theory | 13 | 5 | 6 | **none** |
| venn-diagrams | Venn Diagrams | 13 | 5 | 6 | own: venn-explorer |

### Data interpretation and statistics (10)

| Topic id | Title | Questions | Concepts | Generators | Simulation |
|---|---|---|---|---|---|
| di-tables | Tables | 16 | 7 | 10 | **none** |
| di-bar-graphs | Bar Graphs | 13 | 5 | 7 | **none** |
| di-line-graphs | Line Graphs | 13 | 5 | 6 | **none** |
| di-pie-charts | Pie Charts | 13 | 5 | 6 | **none** |
| di-caselet | Caselet DI | 13 | 5 | 6 | **none** |
| di-mixed-radar | Mixed and Radar Charts | 13 | 4 | 5 | **none** |
| data-sufficiency | Data Sufficiency | 13 | 5 | 6 | **none** |
| mean-median-mode | Mean, Median and Mode | 13 | 5 | 6 | own: mean-median-mode |
| weighted-mean | Weighted Mean | 13 | 4 | 6 | borrowed: alligation-seesaw |
| dispersion | Measures of Dispersion | 13 | 5 | 5 | own: spread-transform |

### Summary

- 46 topics own a simulation. 8 only borrow one: averages, weighted-average, weighted-mean, simple-interest, races, work-and-wages, linear-equations, quadratic-comparison.
- 16 topics have **no simulation at all**: simplification, approximation, lines-angles, quadrilaterals, perimeter-area, mensuration-2d, volume-surface-area, counting-principle, set-theory, and all seven DI topics (di-tables, di-bar-graphs, di-line-graphs, di-pie-charts, di-caselet, di-mixed-radar, data-sufficiency).
- Already covered inside existing topics (so not listed as gaps): number bases, digit puzzles, stocks and shares, brokerage, true and banker's discount, equal instalments (EMI), circular tracks, AM ≥ GM and quadratic maxima, quantitative comparison (Advanced unit in approximation), wrong-term and missing-term number series, triangle centres and congruence, sectors and segments, circular arrangements and distribution, conditional probability, missing-value tables (di-mixed-radar). Must-know tables (squares, cubes, roots, factorials, triplets, trig values) exist as speed drills.

---

## 2. Missing quant topics

Ordered by priority. "Partial" means some material exists in another topic but no dedicated lessons or practice.

### 2.1 Remainders, unit digits and cyclicity — High (partial)

- **Exams:** MBA (frequently in CAT, XAT, SNAP), Placement (frequently in eLitmus, TCS NQT, AMCAT), SSC (unit digit and remainder questions occur often), Bank (occasionally).
- **Now:** number-system has a "Remainders" concept and some unit-digit generators. No Fermat, Euler, Wilson or Chinese remainder material.
- **Question types:**
  - Unit digit of a^n (cyclicity of 2, 3, 7, 8 in fours).
  - Remainder of a large power, e.g. 7^100 ÷ 5 (pattern or Fermat).
  - Remainder of a sum or product of many terms.
  - Number that leaves given remainders with two divisors.
  - Last two digits of a power.
- **Animation:** A remainder wheel. A dot walks around a clock face with n positions as the power rises. Sliders: base a, divisor n, power k. The learner sees the dot fall into a repeating loop and reads the cycle length. A second view shows only the units digit of a^k cycling 2, 4, 8, 6.

### 2.2 Factorials: trailing zeros and highest power of a prime — High (partial)

- **Exams:** MBA (frequently in CAT and SNAP), Placement (frequently), SSC (occasionally).
- **Now:** one trailing-zero mention in number-system; a "highest power" generator in number theory.
- **Question types:**
  - Number of trailing zeros in n!.
  - Highest power of 2, 3 or 7 dividing n!.
  - Highest power of a composite number (e.g. 12) in n!.
  - Smallest n with exactly k trailing zeros.
- **Animation:** Strips of numbers 1 to n. Slider for n and a chooser for the prime p. Multiples of p light up once, multiples of p² light up a second layer, p³ a third. A running tally adds the layers (n/5 + n/25 + ...). The learner sees why each higher power adds only a few extra counts.

### 2.3 Squares, cubes and roots (calculation methods) — High (partial)

- **Exams:** Bank (simplification and approximation, frequently), SSC (frequently), RRB (frequently), AFCAT, CSAT (occasionally).
- **Now:** speed drills for tables; approximation has "Estimating roots". No lessons on finding a square or cube root of a large perfect square or cube, or on squaring near a base.
- **Question types:**
  - Square root of a 5- or 6-digit perfect square by unit digit and bracketing.
  - Cube root of a perfect cube in seconds.
  - Squares of numbers near 50, 100 or 1000.
  - Square root of a decimal or fraction.
  - Simplify expressions with nested roots.
- **Animation:** An area model. A square of side 100 − d shrinks from a 100 × 100 grid as the slider d moves. The removed strips (two of d × 100 and the overlap d²) are shaded. The learner sees (100 − d)² = 10000 − 200d + d².

### 2.4 Advanced identities and "x + 1/x" expressions — High (partial)

- **Exams:** SSC (frequently in CGL, CHSL, CPO), CDS, RRB (occasionally), MBA (occasionally).
- **Now:** algebraic-identities and inequalities touch x + 1/x. No dedicated set on the SSC style.
- **Question types:**
  - Given x + 1/x = k, find x² + 1/x², x³ + 1/x³, x⁴ + 1/x⁴.
  - If a + b + c = 0, find a³ + b³ + c³.
  - Conditional identities (a² + b² + c² = ab + bc + ca implies a = b = c).
  - Value of an expression at a surd (x = 2 + √3).
- **Animation:** A ladder. Slider sets k = x + 1/x. Each rung computes the next power sum from the one before (square and subtract 2, cube and subtract 3k). The learner sees every rung follows from k alone, without finding x.

### 2.5 Trigonometry extension: radians, identities and maximum values — Medium-High (partial)

- **Exams:** SSC (frequently in CGL; the official syllabus names degree and radian measure), CDS, NDA, AFCAT (occasionally).
- **Now:** trigonometry covers ratios, standard angles, complementary angles and Pythagorean identities. No radian measure, no max/min of a sin θ + b cos θ, no simple trig equations.
- **Question types:**
  - Convert between degrees and radians; arc length.
  - Maximum and minimum of a sin θ + b cos θ, and of sin²θ + cosec²θ types.
  - Evaluate identity-heavy expressions.
  - Solve sin θ + cos θ = √2 type equations for acute θ.
- **Animation:** A unit circle with a rotating point. Slider sets θ. The projections onto the axes trace sin and cos waves to the right. A second mode overlays a sin θ + b cos θ with sliders a and b. The learner sees its peak is always √(a² + b²).

### 2.6 Statistics: grouped data and graphs (histogram, frequency polygon, ogive) — Medium

- **Exams:** CDS (syllabus names histograms and frequency polygons), SSC CGL Tier 2 (statistics), NDA, CUET (occasionally), state PSCs.
- **Now:** mean-median-mode and dispersion use ungrouped data. No class intervals, histograms or ogives.
- **Question types:**
  - Mean of grouped data (assumed mean, step deviation).
  - Median and mode class from a frequency table.
  - Read a histogram or ogive.
  - Missing frequency given the mean or median.
- **Animation:** Raw data points drop into bins. Slider sets class width. The histogram rebuilds, the frequency polygon joins mid-points, and the cumulative ogive rises beside it. A horizontal line at n/2 meets the ogive and drops to the median. The learner sees the median does not depend on bin width but the mode class does.

### 2.7 Prisms, pyramids and frustums — Medium

- **Exams:** SSC CGL (official syllabus names right prism and regular right pyramid), CDS, RRB (occasionally), state PSCs.
- **Now:** mensuration-3d covers cube, cuboid, cylinder, cone, sphere. No prism, pyramid or frustum.
- **Question types:**
  - Volume and lateral area of a triangular or hexagonal prism.
  - Volume of a square-base pyramid; slant height from the apothem.
  - Frustum of a cone (bucket) volume and surface area.
  - Cone cut parallel to the base: volume ratio of parts.
- **Animation:** A cone with a horizontal cutting plane. Slider sets the cut height. The top cone lifts away; the frustum's volume is shown as big cone minus small cone. The learner sees the small cone's volume scales with the cube of the height ratio.

### 2.8 Two circles and common tangents — Medium

- **Exams:** SSC CGL (official syllabus names common tangents to two or more circles), CDS, CAT (occasionally).
- **Question types:**
  - Length of the direct and transverse common tangent.
  - Number of common tangents from the distance between centres.
  - Circles touching each other and a line.
  - Tangent-secant length relation.
- **Animation:** Two circles with sliders for both radii and the distance between centres. Common tangents appear and vanish as they move. The count reads 4, 3, 2, 1, 0. The right triangle that gives each tangent length is shaded. The learner sees direct uses (r₁ − r₂) and transverse uses (r₁ + r₂).

### 2.9 Speed maths techniques — Medium

- **Exams:** Bank (frequently, because simplification and approximation are timed), SSC, RRB, AFCAT.
- **Question types:**
  - Multiply numbers near a base (97 × 96).
  - Multiply by 5, 25, 125, 11 quickly.
  - Percentage-fraction swaps inside a calculation.
  - Digit-sum check of an answer.
- **Animation:** Two bars of length 100 − a and 100 − b inside a 100 × 100 square. Sliders a and b. The overlap a × b is highlighted and added back. The learner sees the near-base shortcut as area, not a trick.

### 2.10 Modulus (absolute value) — Medium

- **Exams:** MBA (CAT frequently has modulus equations and inequalities), XAT, SNAP, Placement (occasionally).
- **Question types:**
  - Solve |x − a| = b and |x − a| < b.
  - Number of solutions of |x| + |y| = k or |x − 1| + |x − 3| = c.
  - Minimum of |x − a| + |x − b| + |x − c|.
  - Graph of y = |f(x)|.
- **Animation:** A V-shaped graph y = |x − a|. Slider for a moves the vertex; slider for c moves a horizontal line. Intersections are counted live (0, 1 or 2). A second mode sums several V graphs and shows the flat bottom between the middle points. The learner sees the minimum sits at the median.

### 2.11 Polynomials: remainder and factor theorem — Medium

- **Exams:** CDS (remainder theorem listed by some sources), NDA, MBA (CAT occasionally), SSC (occasionally).
- **Now:** one generator in moreAlgebra mentions polynomials.
- **Question types:**
  - Remainder when p(x) is divided by x − a.
  - Find k so that x − a is a factor.
  - Sum and product of roots of a cubic.
  - HCF and LCM of simple polynomials.
- **Animation:** Graph of a cubic with coefficient sliders. A vertical line at x = a marks p(a), the remainder. When the curve crosses zero at a, the line turns green and labels "x − a is a factor". The learner sees remainder = height of the curve at a.

### 2.12 Integer solutions of linear equations — Medium

- **Exams:** MBA (CAT and XAT occasionally), Placement (eLitmus occasionally).
- **Question types:**
  - Number of positive integer solutions of 3x + 5y = 100.
  - Coins and stamps combinations.
  - Smallest non-negative solution.
  - Number of non-negative solutions of x + y + z = n (links to distribution).
- **Animation:** A line on a lattice grid. Sliders for a, b and c in ax + by = c. Lattice points on the line in the first quadrant light up. The learner sees consecutive solutions step by (b, −a) and the count follows.

### 2.13 Cryptarithmetic — Medium for placement, Low elsewhere

- **Exams:** Placement (eLitmus frequently; some sources place it in Problem Solving), occasionally in TCS and Infosys tests.
- **Question types:**
  - SEND + MORE = MONEY style addition.
  - Multiplication alphametics.
  - Find the value of one letter.
  - Count the possible solutions.
- **Animation:** Column addition with letter tiles. The learner drags digits onto letters. Carries flow left as glowing marks; a column turns red when it breaks. The learner sees that the leftmost carry fixes M = 1 first.

### 2.14 Taxes and commission (GST, income tax, commission) — Low

- **Exams:** SSC (occasionally), state PSCs, RRB (occasionally).
- **Question types:** price after GST; input tax credit; slab-based tax; commission on sales.
- **Animation:** A price bar with stacked layers for base price, discount and GST. Sliders for each rate. The learner sees that discount-then-tax equals tax-then-discount.

### 2.15 Out of scope for an aptitude app — Low

- NDA Paper I mathematics (matrices, determinants, complex numbers, binomial theorem, calculus, vectors, 3D geometry). This is class 11-12 maths, not aptitude. List it only if NDA becomes a target.
- Linear programming and feasible regions. Occasional in XAT; can sit as an Advanced unit in inequalities later.

---

## 3. Existing topics without their own animation

### 3.1 No simulation at all (16)

| Topic | Animation idea |
|---|---|
| di-bar-graphs | A bar chart whose bars the learner drags. A ratio readout and % change arrow between two chosen bars update live. Notice: a bar twice as tall is +100%, not +200%. |
| di-line-graphs | A line graph with a slider that moves a time window. The steepest segment glows and its % growth shows. Notice: the largest absolute rise is not always the largest % rise. |
| di-pie-charts | A pie whose sector edges can be dragged. The angle, the % and the amount (for a total set by a slider) update together. Notice: 3.6° = 1%. |
| di-tables | A table with a highlighted row and column. Slider picks a base year; every cell recolours by % change from the base. Notice: percentage points versus percentage change. |
| di-caselet | A paragraph whose phrases, when tapped, fly into an empty table cell. Derived cells fill as soon as their inputs arrive. Notice: which facts are given and which are derived. |
| di-mixed-radar | A radar chart that morphs into a grouped bar chart and back with a toggle. Notice: same data, different shape; read values, not areas. |
| data-sufficiency | Two statement cards that can each be switched on. A number line shows the set of possible answers shrinking. When it shrinks to one value, the "sufficient" badge appears. Notice: A, B, C, D, E as states of that set. |
| simplification | A BODMAS stack: the expression collapses one operation at a time, with the next operation highlighted. A "wrong order" toggle shows the different answer. Notice: why order matters. |
| approximation | A number line with the exact answer hidden. Sliders round each operand; the estimate's marker moves and an error band shows. Notice: rounding up and down together keeps error small. |
| lines-angles | Two parallel lines and a transversal. Slider rotates the transversal. Equal angles share a colour (corresponding, alternate). Notice: only two angle sizes, summing to 180°. |
| quadrilaterals | A draggable quadrilateral with toggles for "opposite sides parallel", "all sides equal", "right angle". The shape snaps into parallelogram, rhombus, rectangle, square, and the name and properties update. Notice: the family tree of quadrilaterals. |
| perimeter-area | A rectangle with a fixed perimeter. Slider changes the length; width adjusts. A plot of area against length traces a parabola. Notice: the square gives the largest area. |
| mensuration-2d | A square with an inscribed circle and a path border. Sliders for side and path width. Shaded regions update with their areas. Notice: shaded = outer minus inner. |
| volume-surface-area | A sphere melting into cylinders or cones. Slider sets how many smaller solids are made. Total surface area grows while volume stays the same. Notice: recasting keeps volume, not area. |
| counting-principle | A tree diagram that grows a branch layer per choice. Sliders for the number of options at each stage. Notice: multiply for "and", add for "or". |
| set-theory | Elements (dots) that the learner drags between set circles; the roster notation and the cardinality formula update. A toggle shows the power set as a growing list. Notice: n(A ∪ B) = n(A) + n(B) − n(A ∩ B), and subsets double with each element. |

Note: two of the requested examples already exist. Pipes and cisterns has `tank-filling`. Time-speed-distance has `tsd-meeting`.

### 3.2 Only a borrowed simulation (8)

The borrowed one is reasonable for most. A dedicated one would help in these:

| Topic | Animation idea |
|---|---|
| races | A straight track with runners A and B. Sliders for head start and speed ratio. A "dead heat" marker shows when they finish together. Notice: "A beats B by x m" means B is x m short when A finishes. |
| work-and-wages | Workers fill a shared progress bar in their own colours. At the end, a wage pile splits in the same colour proportions. Notice: wages follow work done, not days worked. |
| quadratic-comparison | Two number lines, one for the roots of x and one for y. Coefficient sliders move the roots. The answer badge (x > y, x < y, x ≥ y, x ≤ y, cannot be determined) updates. Notice: one overlap means "cannot be determined". |
| averages | A row of stacked blocks (one stack per value) and a water line at the mean. Adding or removing a person shifts the line. Notice: the new person's value minus the old mean, divided by the new count, is the shift. |
| simple-interest | `ci-vs-si` covers it. Optional: a staircase where each year adds an equal step. |
| weighted-average, weighted-mean | `alligation-seesaw` covers both well. No new work needed. |
| linear-equations | `two-lines` covers it. Optional: a balance scale where both sides change together. |

### 3.3 Small fix

- Percentages owns `successive-change` but its lesson does not embed it. Add a simulation block to its first lesson in `src/data/levels/percentages.json`.

---

## 4. Reasoning (optional scope)

These are grouped with quant in many exams. Bank prelims and mains have a full Reasoning section (puzzles and seating arrangements are the main named topics). SSC, RRB and placement tests have a reasoning section. CAT and XAT have DILR. GATE GA lists spatial aptitude. Calendars and clocks are already in the app as quant topics.

| Topic | Exams | Typical questions | Priority | Animation idea |
|---|---|---|---|---|
| Seating arrangement (linear, circular, facing in/out) | Bank (frequently), Placement, SSC (occasionally) | who sits opposite; neighbours of X; count between two people; facing direction | High | People slide into seats one clue at a time. A clue that breaks the layout flashes red. Notice: fix the most constrained person first. |
| Puzzles (floor, box, scheduling, multi-attribute) | Bank (frequently), MBA DILR, Placement | which floor; which day; pair attributes | High | A grid with rows for people and columns for attributes. Each clue adds a tick or cross; forced cells fill automatically. Notice: elimination propagates. |
| Logical DI sets (tournaments, routes, grids) | MBA (CAT, XAT, SNAP frequently) | win-loss tables; network flows; rankings | High for MBA | A tournament bracket where results are dragged in; points tables update. Notice: totals constrain the unknowns. |
| Syllogism | Bank (frequently), SSC, RRB, Placement | all/some/no statements; conclusions; possibility cases | High | Venn circles that can be dragged into every allowed arrangement. A conclusion stays green only if it holds in all of them. Notice: "possible" versus "definite". |
| Inequalities (coded, reasoning) | Bank (frequently) | A ≥ B < C; conclusions true or false | High | A chain of letters on a number line. Symbols between them are toggled. A conclusion lights up only if the path has no opposite sign. Notice: a single "<" against ">" breaks the chain. |
| Blood relations | Bank, SSC, RRB, Placement (frequently) | relation from a statement; coded relations; family trees | Medium | A family tree that grows node by node as each statement is read. Gender is shown by shape. Notice: draw the tree before naming the relation. |
| Direction sense | SSC, RRB, Bank, Placement (frequently) | final direction; distance from start; shadow-based direction | Medium | A walker on a grid follows turn instructions. A dashed line from start to the current point shows displacement. Notice: the shortest distance uses Pythagoras. |
| Coding-decoding | SSC, Bank, RRB, Placement (frequently) | letter shift; reverse coding; word-based code | Medium | Two alphabet wheels, one rotating. Slider sets the shift. Notice: one shift explains every letter. |
| Order and ranking | SSC, Bank, RRB (frequently) | position from left and right; total count; interchange | Medium | A row of people with one marked. Counts from both ends shown. Notice: total = left + right − 1. |
| Number and letter series, analogy, classification | SSC, RRB (frequently), Placement | next term; odd one out; analogous pair | Medium | Reuse `sequence-differences` with letter positions (A = 1). Notice: letters are numbers. |
| Cubes and dice; cube cutting and painting | SSC, RRB, Placement, CSAT (occasionally) | opposite face; painted small cubes with 0, 1, 2, 3 faces | Medium | A 3D cube that rotates by drag. Slider sets the cut count n; small cubes recolour by painted faces. Notice: corners always 8, edges 12(n − 2). |
| Mirror and water images, paper folding and cutting | SSC, RRB, GATE GA (spatial aptitude) | mirror of a figure; unfolded punched paper; rotation | Medium | A sheet that folds and unfolds with a hole punched. Notice: each fold doubles the holes symmetrically. |
| Mathematical operations (symbol substitution) | SSC, RRB (frequently) | replace symbols and evaluate; find the correct swap | Low | Reuse the BODMAS stack from simplification with symbol tiles. |
| Input-output (machine) | Bank mains (occasionally) | step n of a rearrangement | Low | Words sort themselves step by step on a conveyor. Notice: find the one rule per step. |
| Data sufficiency (reasoning) | Bank, Placement | as quant DS, applied to puzzles | Low | Reuse the quant DS animation with an arrangement as the answer set. |

---

## 5. Recommended build order

Each batch is 4 to 6 items. Highest value first: topics tested in the most exams, then gaps that block whole exam families.

**Batch 1 — Animations for DI (every exam has DI; seven topics have none)**
- di-bar-graphs, di-line-graphs, di-pie-charts, di-tables, data-sufficiency.
- Reuses the existing chart and table figure code. No new content needed.

**Batch 2 — New number topics (MBA, placement, SSC)**
- Remainders, unit digits and cyclicity (2.1).
- Factorials: trailing zeros and prime powers (2.2).
- Squares, cubes and roots (2.3).
- Speed maths techniques (2.9).
- Each with concepts, at least 13 questions, generators and one simulation.

**Batch 3 — Animations for geometry and mensuration**
- lines-angles, quadrilaterals, perimeter-area, mensuration-2d, volume-surface-area.

**Batch 4 — New SSC and defence topics**
- Advanced identities and x + 1/x (2.4).
- Trigonometry extension: radians and maximum values (2.5).
- Prisms, pyramids and frustums (2.7).
- Two circles and common tangents (2.8).
- Statistics: grouped data and graphs (2.6).
- Some of these could be Advanced units inside trigonometry, circles, mensuration-3d and algebraic-identities instead of new topics.

**Batch 5 — Remaining animations**
- simplification, approximation, counting-principle, set-theory, di-caselet, di-mixed-radar.
- Plus the percentages lesson embed fix (3.3).

**Batch 6 — New CAT and placement topics, and dedicated sims for borrowed topics**
- Modulus (2.10), polynomials (2.11), integer solutions (2.12), cryptarithmetic (2.13).
- Dedicated sims for races, work-and-wages and quadratic-comparison.

**Batch 7 onward — Reasoning (only if the scope widens)**
- 7a: seating arrangement, puzzles, syllogism, inequalities (reasoning), blood relations.
- 7b: direction sense, coding-decoding, order and ranking, cubes and dice, mirror and paper folding.
- 7c: logical DI sets for CAT, series and analogy, mathematical operations, input-output.
- Low: taxes and commission (2.14).

---

## Sources

- GATE 2026 General Aptitude syllabus (IIT Guwahati): https://gate2026.iitg.ac.in/doc/GATE2026_Syllabus/GA_2026_Syllabus.pdf
- GATE 2024 General Aptitude syllabus (IISc): https://gate2024.iisc.ac.in/wp-content/uploads/2023/08/GA2024Syllabus.pdf
- SSC CGL syllabus summaries: https://www.pw.live/ssc/exams/ssc-cgl-tier-2-syllabus , https://satheessc.iitk.ac.in/sathee-ssc/ssc-exams/ssc-cgl/ssc-details/syllabus-of-exam , https://www.careerpower.in/blog/ssc-cgl-maths-syllabus
- UPSC CSAT syllabus: https://www.clearias.com/upsc-csat-syllabus/ , https://testbook.com/amp/ias-preparation/upsc-csat-syllabus
- CDS Elementary Mathematics syllabus: https://static.collegedekho.com/media/uploads/2023/04/12/upsc-cds-i-syllabus-2023-for-elementary-mathematics.pdf , https://www.shiksha.com/sarkari-exams/defence/articles/cds-maths-syllabus-blogId-91959
- IBPS PO syllabus: https://testbook.com/ibps-po/syllabus , https://byjus.com/bank-exam/ibps-po-prelims-quantitative-syllabus , https://byjus.com/bank-exam/ibps-po-prelims-reasoning-ability-syllabus
- CAT quant topic lists (no official syllabus exists): https://bschool.careers360.com/articles/cat-quantitative-aptitude-syllabus , https://www.collegedekho.com/exam/cat-quantitative-aptitude-syllabus-esp
- eLitmus syllabus summaries (no fixed official syllabus): https://faceprep.in/article/elitmus-syllabus-and-test-pattern-for-ph-test-face-prep/ , https://testbook.com/elitmus/syllabus-exam-pattern

Topic lists from coaching sites vary. Check official notifications before using any list as final.
