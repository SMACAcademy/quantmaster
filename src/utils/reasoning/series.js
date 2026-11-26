/**
 * Series, analogy and classification: letter positions, letter and
 * alphanumeric series, repeating patterns, positions in a mixed sequence,
 * number and letter analogies, and the odd one out.
 *
 * Letters are numbers: A = 1 ... Z = 26, and the reverse position (counting
 * from Z) is 27 − n. A series of letters is solved as a series of positions.
 *
 * Every question type has two methods, written separately, that the tests and
 * the generators hold to each other:
 *   series       seriesRules tries every rule in a family (constant step,
 *                growing steps, alternating steps, two interleaved series,
 *                steps that multiply) and keeps those that rebuild the terms;
 *                diffCascade reads the rule off the differences directly.
 *   patterns     fillPatternBrute tries every way of filling the blanks;
 *                fillPatternByClasses fills them from the letters already in
 *                the same place of the repeating block.
 *   positions    letterFrom / relativeLetter use 27 − k; the *Walk versions
 *                count along a written-out alphabet.
 *   analogy      every rule in a family that maps the given pair must give the
 *                same answer; analogyByResidue works from how far b is from a
 *                square, a cube or a product of neighbours.
 *   odd one out  oddOnesByRules: an item is odd when some rule in the family
 *                holds for all the others and fails for it; oddBySignature: the
 *                item whose signature differs from what every other item shares.
 */

export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
/** Position in the alphabet, A = 1 ... Z = 26. */
export const pos = (ch) => ch.charCodeAt(0) - 64;
/** The letter at a position 1..26, or null outside the alphabet. */
export const letter = (n) => (Number.isInteger(n) && n >= 1 && n <= 26 ? String.fromCharCode(64 + n) : null);
export const reversePos = (n) => 27 - n;
/** The opposite letter (A ↔ Z, B ↔ Y): positions add to 27. */
export const oppositeLetter = (ch) => letter(27 - pos(ch));

/* ------------------------------ letter positions ------------------------------ */

/** The k-th letter from the left (A end) or right (Z end) of the alphabet. */
export const letterFrom = (k, end) => letter(end === 'left' ? k : 27 - k);

/**
 * "The m-th letter to the <dir> of the k-th letter from the <end>": by
 * arithmetic. Returns null when the count runs off the alphabet.
 */
export function relativeLetter({ k, end, m, dir }) {
  const base = end === 'left' ? k : 27 - k;
  return letter(base + (dir === 'right' ? m : -m));
}

/** The same by counting along the written-out alphabet, one letter at a time. */
export function relativeLetterWalk({ k, end, m, dir }) {
  const line = ALPHABET.split('');
  const counted = end === 'left' ? line : [...line].reverse();
  const start = counted[k - 1];
  if (!start) return null;
  let i = line.indexOf(start);
  for (let step = 0; step < m; step++) {
    i += dir === 'right' ? 1 : -1;
    if (i < 0 || i >= line.length) return null;
  }
  return line[i];
}

/** Letter from a position counted from either end, walking the written alphabet. */
export const letterFromWalk = (k, end) => (end === 'left' ? ALPHABET : [...ALPHABET].reverse().join(''))[k - 1] || null;

/**
 * Pairs of letters in a word with as many letters between them in the word as
 * in the alphabet, in either direction: positions i < j with |p_i − p_j| = j − i.
 * Returns the pairs as two-letter strings, in the word's order.
 */
export function letterPairs(word) {
  const ps = [...word].map(pos);
  const out = [];
  for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) if (Math.abs(ps[i] - ps[j]) === j - i) out.push(word[i] + word[j]);
  return out;
}

/** The same count by listing the letters between, in the word and in the alphabet. */
export function letterPairsByCounting(word) {
  let count = 0;
  for (let i = 0; i < word.length; i++) {
    for (let j = i + 1; j < word.length; j++) {
      const inWord = word.slice(i + 1, j).length;
      const [lo, hi] = [ALPHABET.indexOf(word[i]), ALPHABET.indexOf(word[j])].sort((a, b) => a - b);
      const inAlphabet = ALPHABET.slice(lo + 1, hi).length;
      if (lo !== hi && inWord === inAlphabet) count += 1;
    }
  }
  return count;
}

/* ------------------------------ series of numbers ------------------------------ */

/**
 * The rule family, each rule building a whole series from its first terms:
 *   add        { d }        every step is d
 *   grow       { s }        the steps grow by s (s ≠ 0)
 *   alt        { d1, d2 }   the steps alternate d1, d2 (d1 ≠ d2)
 *   interleave { p, q }     two series in turn: odd places step p, even places step q (p ≠ q)
 *   times      { r }        each step is r times the one before (r = 2 or 3)
 */
export function seriesFamily() {
  const rules = [];
  for (let d = -40; d <= 40; d++) rules.push({ kind: 'add', d });
  for (let s = -6; s <= 6; s++) if (s) rules.push({ kind: 'grow', s });
  for (let d1 = -20; d1 <= 20; d1++) for (let d2 = -20; d2 <= 20; d2++) if (d1 !== d2) rules.push({ kind: 'alt', d1, d2 });
  for (let p = -20; p <= 20; p++) for (let q = -20; q <= 20; q++) if (p !== q) rules.push({ kind: 'interleave', p, q });
  for (const r of [2, 3]) rules.push({ kind: 'times', r });
  return rules;
}
const FAMILY = seriesFamily();

/** The first n terms of a rule, started from the given terms (null if it cannot start). */
export function buildSeries(rule, start, n) {
  const t = [start[0]];
  if (rule.kind === 'add') for (let i = 1; i < n; i++) t.push(t[i - 1] + rule.d);
  else if (rule.kind === 'alt') for (let i = 1; i < n; i++) t.push(t[i - 1] + (i % 2 ? rule.d1 : rule.d2));
  else if (rule.kind === 'grow' || rule.kind === 'times') {
    if (start.length < 2) return null;
    let step = start[1] - start[0];
    if (rule.kind === 'times' && step === 0) return null;
    for (let i = 1; i < n; i++) {
      t.push(t[i - 1] + step);
      step = rule.kind === 'grow' ? step + rule.s : step * rule.r;
    }
  } else if (rule.kind === 'interleave') {
    if (start.length < 2) return null;
    t.push(start[1]);
    for (let i = 2; i < n; i++) t.push(t[i - 2] + (i % 2 ? rule.q : rule.p));
  }
  return t.slice(0, n);
}

/**
 * Terms a rule needs before it is confirmed: enough to fix its numbers, plus
 * one more that it must also get right. (Any four terms are two interleaved
 * pairs, so two interleaved series need five terms to be believed.)
 */
export const TERMS_NEEDED = { add: 3, grow: 4, alt: 4, interleave: 5, times: 4 };

/** Every rule in the family that rebuilds the given terms exactly and is confirmed by them. */
export function seriesRules(terms) {
  return FAMILY.filter((rule) => {
    if (terms.length < TERMS_NEEDED[rule.kind]) return false;
    const built = buildSeries(rule, terms, terms.length);
    return built && built.every((v, i) => v === terms[i]);
  });
}

/** The next term from every fitting rule (a fair question has exactly one). */
export function nextTerms(terms) {
  return [...new Set(seriesRules(terms).map((rule) => buildSeries(rule, terms, terms.length + 1).at(-1)))];
}

/**
 * The second method: read the rule off the differences. Returns
 * { kind, next } or null when no difference pattern settles.
 */
export function diffCascade(terms) {
  const n = terms.length;
  const d = [];
  for (let i = 1; i < n; i++) d.push(terms[i] - terms[i - 1]);
  const same = (list) => list.length > 0 && list.every((x) => x === list[0]);
  if (d.length >= 2 && same(d)) return { kind: 'add', next: terms[n - 1] + d[0] };
  const dd = [];
  for (let i = 1; i < d.length; i++) dd.push(d[i] - d[i - 1]);
  if (dd.length >= 2 && same(dd)) return { kind: 'grow', next: terms[n - 1] + d.at(-1) + dd[0] };
  if (d.length >= 3 && d.every((x, i) => i < 2 || x === d[i - 2])) return { kind: 'alt', next: terms[n - 1] + d[d.length - 2] };
  const odd = terms.filter((_, i) => i % 2 === 0);
  const even = terms.filter((_, i) => i % 2 === 1);
  const stepOf = (list) => {
    const steps = list.slice(1).map((x, i) => x - list[i]);
    return steps.length >= 1 && same(steps) ? steps[0] : null;
  };
  if (odd.length >= 3 && even.length >= 2 && stepOf(odd) !== null && stepOf(even) !== null) {
    const list = n % 2 === 0 ? odd : even;
    return { kind: 'interleave', next: list.at(-1) + stepOf(list) };
  }
  if (d.length >= 3 && d[0] !== 0) {
    const r = d[1] / d[0];
    if ((r === 2 || r === 3) && d.every((x, i) => i === 0 || x === d[i - 1] * r)) return { kind: 'times', next: terms[n - 1] + d.at(-1) * r };
  }
  return null;
}

/** A rule in words, for explanations. */
export function ruleText(rule) {
  const signed = (k) => (k >= 0 ? `+${k}` : `−${-k}`);
  if (rule.kind === 'add') return `every step is ${signed(rule.d)}`;
  if (rule.kind === 'grow') return `the steps grow by ${signed(rule.s)} each time`;
  if (rule.kind === 'alt') return `the steps alternate ${signed(rule.d1)}, ${signed(rule.d2)}`;
  if (rule.kind === 'interleave') return `two series take turns: one steps ${signed(rule.p)}, the other ${signed(rule.q)}`;
  return `each step is ${rule.r} times the one before`;
}

export const stepsOf = (terms) => terms.slice(1).map((t, i) => t - terms[i]);
export const signedStep = (k) => (k >= 0 ? `+${k}` : `−${-k}`);

/* ------------------------------ terms with several parts ------------------------------ */

/**
 * A term such as "B2", "AZ" or "3CF" is a list of parts: each letter is a part,
 * and each run of digits is a part. parseTerm("B12") → [{ type: 'L', value: 2 }, { type: 'N', value: 12 }].
 */
export function parseTerm(text) {
  const parts = [];
  for (const m of text.matchAll(/[A-Z]|\d+/g)) parts.push(/\d/.test(m[0]) ? { type: 'N', value: Number(m[0]) } : { type: 'L', value: pos(m[0]) });
  return parts;
}
export const formatTerm = (parts) => parts.map((p) => (p.type === 'L' ? letter(p.value) : String(p.value))).join('');

/**
 * The next term of a series of many-part terms: each part is its own series.
 * Returns every possible next term (a fair question has one), or [] if a part
 * has no rule or a letter runs off the alphabet.
 */
export function nextTermsOfParts(texts) {
  const terms = texts.map(parseTerm);
  const width = terms[0].length;
  if (terms.some((t) => t.length !== width || t.some((p, i) => p.type !== terms[0][i].type))) return [];
  let out = [[]];
  for (let k = 0; k < width; k++) {
    const type = terms[0][k].type;
    const nexts = nextTerms(terms.map((t) => t[k].value)).filter((v) => type === 'N' || letter(v));
    out = out.flatMap((prefix) => nexts.map((v) => [...prefix, { type, value: v }]));
  }
  return out.map(formatTerm);
}

/** The same, part by part with the difference reading. Returns one term or null. */
export function nextTermOfPartsByCascade(texts) {
  const split = texts.map((t) => t.match(/[A-Z]|\d+/g));
  let out = '';
  for (let k = 0; k < split[0].length; k++) {
    const isLetter = /[A-Z]/.test(split[0][k]);
    const column = split.map((parts) => (isLetter ? ALPHABET.indexOf(parts[k]) + 1 : Number(parts[k])));
    const found = diffCascade(column);
    if (!found) return null;
    if (isLetter) {
      if (found.next < 1 || found.next > 26) return null;
      out += ALPHABET[found.next - 1];
    } else out += String(found.next);
  }
  return out;
}

/* ------------------------------ repeating patterns ------------------------------ */

/**
 * A pattern like "ab_ca_bc_abc" with blanks ("_"). It is a block of letters
 * repeated: periodic with some period L from 2 up to half its length. Returns
 * every filling of the blanks (as the letters that go in, in order) that makes
 * it periodic, trying every way of filling them from the letters used.
 */
export function fillPatternBrute(pattern) {
  const letters = [...new Set(pattern.replace(/_/g, ''))].sort();
  const blanks = [...pattern].map((c, i) => (c === '_' ? i : -1)).filter((i) => i >= 0);
  const out = new Set();
  const fill = Array(blanks.length).fill('');
  const go = (k) => {
    if (k === blanks.length) {
      const s = [...pattern];
      blanks.forEach((at, j) => {
        s[at] = fill[j];
      });
      if (smallestPeriod(s.join('')) !== null) out.add(fill.join(''));
      return;
    }
    for (const ch of letters) {
      fill[k] = ch;
      go(k + 1);
    }
  };
  go(0);
  return [...out];
}

function smallestPeriod(s) {
  for (let L = 2; L <= s.length / 2; L++) if ([...s].every((c, i) => i < L || c === s[i - L])) return L;
  return null;
}

/**
 * The second method: for each period L, the letters in the same place of the
 * block (same i mod L) must agree; blanks take the letter of their class.
 */
export function fillPatternByClasses(pattern) {
  const out = new Set();
  for (let L = 2; L <= pattern.length / 2; L++) {
    const cls = Array(L).fill(null);
    let ok = true;
    [...pattern].forEach((c, i) => {
      if (c === '_') return;
      if (cls[i % L] === null) cls[i % L] = c;
      else if (cls[i % L] !== c) ok = false;
    });
    if (!ok) continue;
    const blanks = [...pattern].map((c, i) => (c === '_' ? cls[i % L] : null)).filter((c, i) => pattern[i] === '_');
    if (blanks.every((c) => c)) out.add(blanks.join(''));
  }
  return [...out];
}

/* ------------------------------ mixed sequences ------------------------------ */

export const kindOf = (ch) => (/[A-Z]/.test(ch) ? 'L' : /\d/.test(ch) ? 'N' : 'S');

/**
 * "The m-th element to the <dir> of the k-th element from the <end>" in a
 * sequence of single characters, by arithmetic on positions (null if off the end).
 */
export function elementAt(seq, { k, end, m = 0, dir = 'right' }) {
  const n = seq.length;
  const fromLeft = end === 'left' ? k : n - k + 1;
  const at = fromLeft + (dir === 'right' ? m : -m);
  return at >= 1 && at <= n ? seq[at - 1] : null;
}

/** The same by walking: find the k-th element counting from that end, then step m times. */
export function elementAtWalk(seq, { k, end, m = 0, dir = 'right' }) {
  const order = seq.map((ch, i) => i);
  const counted = end === 'left' ? order : [...order].reverse();
  let i = counted[k - 1];
  if (i === undefined) return null;
  for (let step = 0; step < m; step++) {
    i += dir === 'right' ? 1 : -1;
    if (i < 0 || i >= seq.length) return null;
  }
  return seq[i];
}

/**
 * How many elements of kind `mid` have an element of kind `before` just before
 * them and of kind `after` just after them (null means "anything", including
 * nothing at the end). Kinds: 'L' letter, 'N' digit, 'S' symbol.
 */
export function countPattern(seq, { before = null, mid, after = null }) {
  let count = 0;
  for (let i = 0; i < seq.length; i++) {
    if (kindOf(seq[i]) !== mid) continue;
    if (before && (i === 0 || kindOf(seq[i - 1]) !== before)) continue;
    if (after && (i === seq.length - 1 || kindOf(seq[i + 1]) !== after)) continue;
    count += 1;
  }
  return count;
}

/** The same with a regular expression over the string of kinds (overlaps counted by lookahead). */
export function countPatternByRegex(seq, { before = null, mid, after = null }) {
  const kinds = seq.map(kindOf).join('');
  const re = new RegExp(`${before ? `(?<=${before})` : ''}${mid}${after ? `(?=${after})` : ''}`, 'g');
  return (kinds.match(re) || []).length;
}

/* ------------------------------ number analogy ------------------------------ */

/** Natural rules for number analogies (a : b means b = f(a)). */
export const ANALOGY_RULES = [
  { id: 'sq', text: 'n²', f: (n) => n * n },
  { id: 'sq+1', text: 'n² + 1', f: (n) => n * n + 1 },
  { id: 'sq-1', text: 'n² − 1', f: (n) => n * n - 1 },
  { id: 'sq+2', text: 'n² + 2', f: (n) => n * n + 2 },
  { id: 'sq-2', text: 'n² − 2', f: (n) => n * n - 2 },
  { id: 'cube', text: 'n³', f: (n) => n ** 3 },
  { id: 'cube+1', text: 'n³ + 1', f: (n) => n ** 3 + 1 },
  { id: 'cube-1', text: 'n³ − 1', f: (n) => n ** 3 - 1 },
  { id: 'cube+2', text: 'n³ + 2', f: (n) => n ** 3 + 2 },
  { id: 'cube-2', text: 'n³ − 2', f: (n) => n ** 3 - 2 },
  { id: 'n(n+1)', text: 'n × (n + 1)', f: (n) => n * (n + 1) },
  { id: 'n(n-1)', text: 'n × (n − 1)', f: (n) => n * (n - 1) },
  { id: '(n+1)sq', text: '(n + 1)²', f: (n) => (n + 1) ** 2 },
  { id: '(n-1)sq', text: '(n − 1)²', f: (n) => (n - 1) ** 2 },
  { id: 'sq+n', text: 'n² + n', f: (n) => n * n + n },
  { id: 'cube+n', text: 'n³ + n', f: (n) => n ** 3 + n },
  { id: 'cube-n', text: 'n³ − n', f: (n) => n ** 3 - n },
  { id: '2sq', text: '2n²', f: (n) => 2 * n * n }
];
export const analogyRule = (id) => ANALOGY_RULES.find((r) => r.id === id);

/** Answers for a : b :: c : ? from every rule that maps a to b (a fair question has one). */
export function analogyAnswers(a, b, c) {
  return [...new Set(ANALOGY_RULES.filter((r) => r.f(a) === b).map((r) => r.f(c)))];
}

/**
 * The second method: how far b is from a², a³, a(a ± 1), (a ± 1)² and 2a²,
 * and the same offset applied to c. Returns every answer found.
 */
export function analogyByResidue(a, b, c) {
  const bases = [
    [(x) => x * x, [-2, -1, 0, 1, 2, (x) => x]],
    [(x) => x * x * x, [-2, -1, 0, 1, 2, (x) => x, (x) => -x]],
    [(x) => x * x + x, [0]],
    [(x) => x * x - x, [0]],
    [(x) => x * x + 2 * x + 1, [0]],
    [(x) => x * x - 2 * x + 1, [0]],
    [(x) => 2 * x * x, [0]]
  ];
  const out = new Set();
  for (const [base, offsets] of bases) {
    for (const off of offsets) {
      const k = (x) => (typeof off === 'function' ? off(x) : off);
      if (base(a) + k(a) === b) out.add(base(c) + k(c));
    }
  }
  return [...out];
}

/* ------------------------------ odd one out ------------------------------ */

const isSquare = (n) => n >= 0 && Number.isInteger(Math.sqrt(n));
const isCube = (n) => Number.isInteger(Math.round(Math.cbrt(n))) && Math.round(Math.cbrt(n)) ** 3 === n;
function isPrime(n) {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}
const digitSum = (n) => String(n).split('').reduce((s, d) => s + Number(d), 0);

/** Properties a number can share with the others in a list. */
export const NUMBER_PROPERTIES = [
  { id: 'square', text: 'a perfect square', test: (n) => isSquare(n) },
  { id: 'cube', text: 'a perfect cube', test: (n) => isCube(n) },
  { id: 'prime', text: 'a prime number', test: (n) => isPrime(n) },
  { id: 'even', text: 'even', test: (n) => n % 2 === 0 },
  { id: 'odd', text: 'odd', test: (n) => n % 2 === 1 },
  ...[3, 4, 5, 6, 7, 8, 9, 11, 12, 13].map((k) => ({ id: `mult-${k}`, text: `a multiple of ${k}`, test: (n) => n % k === 0 })),
  { id: 'square+1', text: 'one more than a perfect square', test: (n) => isSquare(n - 1) },
  { id: 'square-1', text: 'one less than a perfect square', test: (n) => isSquare(n + 1) },
  { id: 'cube+1', text: 'one more than a perfect cube', test: (n) => n >= 1 && isCube(n - 1) },
  { id: 'cube-1', text: 'one less than a perfect cube', test: (n) => isCube(n + 1) },
  { id: 'n(n+1)', text: 'a product of two consecutive numbers', test: (n) => isSquare(4 * n + 1) && n > 0 },
  ...Array.from({ length: 27 }, (_, s) => ({ id: `digits-${s + 1}`, text: `a number whose digits add to ${s + 1}`, test: (n) => digitSum(n) === s + 1 }))
];

/** Properties a letter group can share: gaps, opposite ends, vowels. */
export function groupProperties(groups) {
  const props = [];
  const gapsOf = (g) => [...g].slice(1).map((ch, i) => pos(ch) - pos(g[i]));
  const seen = new Set();
  for (const g of groups) {
    const key = gapsOf(g).join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    props.push({ id: `gaps ${key}`, text: `the gaps are ${gapsOf(g).map(signedStep).join(', ')}`, test: (x) => gapsOf(x).join(',') === key });
  }
  props.push({ id: 'ends opposite', text: 'its first and last letters are opposites (positions add to 27)', test: (x) => pos(x[0]) + pos(x.at(-1)) === 27 });
  props.push({ id: 'has vowel', text: 'it contains a vowel', test: (x) => /[AEIOU]/.test(x) });
  props.push({ id: 'no vowel', text: 'it has no vowel', test: (x) => !/[AEIOU]/.test(x) });
  props.push({ id: 'starts vowel', text: 'it starts with a vowel', test: (x) => /^[AEIOU]/.test(x) });
  props.push({ id: 'in order', text: 'its letters are in alphabetical order', test: (x) => gapsOf(x).every((d) => d > 0) });
  props.push({ id: 'in reverse', text: 'its letters are in reverse alphabetical order', test: (x) => gapsOf(x).every((d) => d < 0) });
  return props;
}

/** Number pairs a : b; a pair has a rule when b = f(a) for a rule in ANALOGY_RULES. */
export function pairProperties() {
  return ANALOGY_RULES.map((r) => ({ id: r.id, text: `the second is ${r.text} of the first`, test: ([a, b]) => r.f(a) === b }));
}

/**
 * Items that are odd one out: some property holds for every other item and
 * fails for this one. A fair question has exactly one.
 */
export function oddOnesByRules(items, properties) {
  const odd = new Set();
  items.forEach((x, i) => {
    const others = items.filter((_, j) => j !== i);
    if (properties.some((p) => !p.test(x) && others.every((o) => p.test(o)))) odd.add(i);
  });
  return [...odd];
}

/**
 * The second method: compute a signature for each item (gap list for letter
 * groups; for numbers, its root and kind; for pairs, the offset of b from a² and a³);
 * the odd item is the only one whose signature the others do not all share.
 * Returns its index, or null.
 */
export function oddBySignature(items, signature) {
  const sigs = items.map(signature);
  for (let i = 0; i < items.length; i++) {
    const rest = sigs.filter((_, j) => j !== i);
    if (rest.every((s) => s === rest[0]) && sigs[i] !== rest[0]) return i;
  }
  return null;
}

export const gapSignature = (g) => [...g].slice(1).map((ch, i) => pos(ch) - pos(g[i])).join(',');
