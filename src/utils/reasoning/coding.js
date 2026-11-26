/**
 * Coding-decoding: letter shifts, opposite letters (A ↔ Z), reversal, number
 * codes and word-to-code mappings from sentences.
 *
 * A rule is a plain object:
 *   { kind: 'shift', ks: [k] }            every letter moves k places (wrapping Z → A)
 *   { kind: 'shift', ks: [k1, k2] }       alternate letters move k1, k2, k1, ...
 *   { kind: 'shift', ks: [1, 2, 3, ...] } letter i moves ks[i] (a growing shift)
 *   { kind: 'opposite' }                  each letter becomes its opposite (A ↔ Z, B ↔ Y)
 *   { kind: 'reverse', k }                write the word backwards, then shift k
 *   { kind: 'opposite-reverse' }          opposite letters, written backwards
 *   { kind: 'pairs', k }                  swap letters in pairs (1↔2, 3↔4), then shift k
 *
 * findRules(example, family) tries every rule in a family against an example
 * ("ROAD is written as URDG") and keeps the ones that fit; a question is fair
 * only when every rule that fits gives the same code for the new word.
 */

const A = 'A'.charCodeAt(0);
export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const mod = (a, n) => ((a % n) + n) % n;

/** Position in the alphabet, A = 1 ... Z = 26. */
export const pos = (ch) => ch.charCodeAt(0) - A + 1;
/** The letter at a position, wrapping round (27 → A, 0 → Z). */
export const letterAt = (n) => String.fromCharCode(A + mod(n - 1, 26));
/** The opposite letter: positions add to 27. */
export const opposite = (ch) => letterAt(27 - pos(ch));

export const shiftLetter = (ch, k) => letterAt(pos(ch) + k);
export const reverseWord = (word) => [...word].reverse().join('');

function swapPairs(word) {
  const out = [...word];
  for (let i = 0; i + 1 < out.length; i += 2) [out[i], out[i + 1]] = [out[i + 1], out[i]];
  return out.join('');
}

export function applyRule(word, rule) {
  const letters = [...word];
  switch (rule.kind) {
    case 'shift':
      return letters.map((ch, i) => shiftLetter(ch, rule.ks[i % rule.ks.length] ?? 0)).join('');
    case 'growing':
      return letters.map((ch, i) => shiftLetter(ch, rule.start + rule.step * i)).join('');
    case 'opposite':
      return letters.map(opposite).join('');
    case 'reverse':
      return [...reverseWord(word)].map((ch) => shiftLetter(ch, rule.k)).join('');
    case 'opposite-reverse':
      return reverseWord(letters.map(opposite).join(''));
    case 'pairs':
      return [...swapPairs(word)].map((ch) => shiftLetter(ch, rule.k)).join('');
    default:
      throw new Error(`unknown rule ${rule.kind}`);
  }
}

/** The same rules, worked out from a lookup string instead of character codes. */
export function applyRuleByTable(word, rule) {
  const at = (i) => ALPHABET[mod(i, 26)];
  const idx = (ch) => ALPHABET.indexOf(ch);
  const back = ALPHABET.split('').reverse().join('');
  const opp = (ch) => back[idx(ch)];
  const chars = word.split('');
  if (rule.kind === 'shift') return chars.map((ch, i) => at(idx(ch) + rule.ks[i % rule.ks.length])).join('');
  if (rule.kind === 'growing') return chars.map((ch, i) => at(idx(ch) + rule.start + rule.step * i)).join('');
  if (rule.kind === 'opposite') return chars.map(opp).join('');
  if (rule.kind === 'opposite-reverse') return chars.map(opp).reverse().join('');
  if (rule.kind === 'reverse') return chars.reverse().map((ch) => at(idx(ch) + rule.k)).join('');
  if (rule.kind === 'pairs') {
    const out = [];
    for (let i = 0; i < chars.length; i += 2) out.push(...(i + 1 < chars.length ? [chars[i + 1], chars[i]] : [chars[i]]));
    return out.map((ch) => at(idx(ch) + rule.k)).join('');
  }
  throw new Error(`unknown rule ${rule.kind}`);
}

/** Decode: the word a rule turns into `code` (every rule here is one-to-one). */
export function decodeWord(code, rule, length = code.length) {
  // Brute force over letters, one position at a time, works for every rule above
  // because each code letter depends on exactly one word letter.
  const word = Array(length).fill('A');
  for (let i = 0; i < length; i++) {
    for (const ch of ALPHABET) {
      word[i] = ch;
      const out = applyRule(word.join(''), rule);
      const j = outputIndexOf(rule, i, length);
      if (out[j] === code[j]) break;
    }
  }
  return word.join('');
}

function outputIndexOf(rule, i, length) {
  if (rule.kind === 'reverse' || rule.kind === 'opposite-reverse') return length - 1 - i;
  if (rule.kind === 'pairs') return i % 2 === 0 ? (i + 1 < length ? i + 1 : i) : i - 1;
  return i;
}

/** Every rule worth trying on an example: all single and alternating shifts, opposites, reversals. */
export function ruleFamily() {
  const rules = [];
  for (let k = 1; k <= 25; k++) rules.push({ kind: 'shift', ks: [k] }); // −k is the same as 26 − k
  for (let a = -6; a <= 6; a++) for (let b = -6; b <= 6; b++) if (a !== b) rules.push({ kind: 'shift', ks: [a, b] });
  for (let start = -3; start <= 3; start++) for (const step of [-2, -1, 1, 2]) rules.push({ kind: 'growing', start, step });
  rules.push({ kind: 'opposite' }, { kind: 'opposite-reverse' });
  for (let k = -6; k <= 6; k++) rules.push({ kind: 'reverse', k }, { kind: 'pairs', k });
  return rules;
}

/** The rules from the family that turn example.word into example.code. */
export function findRules(examples, family = ruleFamily()) {
  const list = Array.isArray(examples) ? examples : [examples];
  return family.filter((rule) => list.every((ex) => ex.word.length === ex.code.length && applyRuleByTable(ex.word, rule) === ex.code));
}

/** Codes for `word` from every rule that fits the examples (a fair question gives exactly one). */
export function codesFor(examples, word, family) {
  return [...new Set(findRules(examples, family).map((rule) => applyRule(word, rule)))];
}

/** Words that every fitting rule decodes `code` into. */
export function wordsFor(examples, code, family) {
  return [...new Set(findRules(examples, family).map((rule) => decodeWord(code, rule)))];
}

/** A rule in words, for explanations. */
export function ruleText(rule) {
  const signed = (k) => (k >= 0 ? `+${k}` : `−${-k}`);
  switch (rule.kind) {
    case 'shift':
      return rule.ks.length === 1 ? `each letter moves ${Math.abs(rule.ks[0])} place${Math.abs(rule.ks[0]) === 1 ? '' : 's'} ${rule.ks[0] > 0 ? 'forward' : 'back'} (${signed(rule.ks[0])})` : `the letters move ${rule.ks.map(signed).join(', ')} in turn`;
    case 'growing':
      return `the shifts grow: ${[0, 1, 2, 3].map((i) => signed(rule.start + rule.step * i)).join(', ')}, ...`;
    case 'opposite':
      return 'each letter is replaced by its opposite (A ↔ Z, B ↔ Y, ...)';
    case 'opposite-reverse':
      return 'each letter is replaced by its opposite and the word is written backwards';
    case 'reverse':
      return rule.k ? `the word is written backwards and then each letter moves ${signed(rule.k)}` : 'the word is written backwards';
    case 'pairs':
      return rule.k ? `the letters are swapped in pairs (1st ↔ 2nd, 3rd ↔ 4th, ...) and then each moves ${signed(rule.k)}` : 'the letters are swapped in pairs (1st ↔ 2nd, 3rd ↔ 4th, ...)';
    default:
      return rule.kind;
  }
}

/* ------------------------------ number codes ------------------------------ */

/**
 * Number codes:
 *   positions  letter positions joined: CAT → 3-1-20
 *   sum        sum of positions: CAT → 24
 *   opposite   sum of opposite positions (27 − p): CAT → 24 + 26 + 7 = 57
 *   double     twice the sum of positions: CAT → 48
 *   length     sum of positions times the number of letters: CAT → 72
 */
export function numberCode(word, kind) {
  const ps = [...word].map(pos);
  const sum = ps.reduce((a, b) => a + b, 0);
  if (kind === 'positions') return ps.join('-');
  if (kind === 'sum') return sum;
  if (kind === 'opposite') return ps.reduce((a, p) => a + (27 - p), 0);
  if (kind === 'double') return 2 * sum;
  if (kind === 'length') return sum * ps.length;
  throw new Error(`unknown number code ${kind}`);
}

/** The same by counting on a lookup string. */
export function numberCodeByTable(word, kind) {
  const ps = word.split('').map((ch) => ALPHABET.indexOf(ch) + 1);
  if (kind === 'positions') return ps.join('-');
  let total = 0;
  for (const p of ps) total += kind === 'opposite' ? ALPHABET.length + 1 - p : p;
  if (kind === 'double') return total * 2;
  if (kind === 'length') return total * word.length;
  return total;
}

export const NUMBER_KINDS = ['sum', 'opposite', 'double', 'length'];

/* --------------------------- codes from sentences --------------------------- */

/**
 * Sentences in a code language: [{ words: ['sun', 'is', 'hot'], codes: ['ka', 'lo', 'mi'] }].
 * Codes are given in a jumbled order. Every word has one code and no two words
 * share a code. Returns every word → code mapping that fits all the sentences,
 * found by trying every way of giving the words codes.
 */
export function solveSentences(sentences) {
  const words = [...new Set(sentences.flatMap((s) => s.words))];
  const codes = [...new Set(sentences.flatMap((s) => s.codes))];
  if (codes.length !== words.length) return [];
  const out = [];
  const assign = new Map();
  const used = new Set();
  const fits = () =>
    sentences.every((s) => {
      const got = s.words.map((w) => assign.get(w)).sort();
      return JSON.stringify(got) === JSON.stringify([...s.codes].sort());
    });
  const go = (i) => {
    if (i === words.length) {
      if (fits()) out.push(new Map(assign));
      return;
    }
    for (const c of codes) {
      if (used.has(c)) continue;
      // Prune: a word's code must appear in every sentence that has the word.
      if (!sentences.every((s) => !s.words.includes(words[i]) || s.codes.includes(c))) continue;
      used.add(c);
      assign.set(words[i], c);
      go(i + 1);
      used.delete(c);
      assign.delete(words[i]);
    }
  };
  go(0);
  return out;
}

/**
 * The textbook method: a word's code is the code common to every sentence with
 * the word and missing from every sentence without it. Returns the candidates
 * left for that word (one when the sentences settle it).
 */
export function codeByIntersection(sentences, word) {
  let candidates = null;
  for (const s of sentences) {
    const set = new Set(s.codes);
    if (s.words.includes(word)) candidates = candidates ? new Set([...candidates].filter((c) => set.has(c))) : set;
  }
  if (!candidates) return [];
  // Remove codes pinned to other words.
  let changed = true;
  const settled = new Map();
  const others = [...new Set(sentences.flatMap((s) => s.words))].filter((w) => w !== word);
  const pools = new Map(
    others.map((w) => {
      let c = null;
      for (const s of sentences) if (s.words.includes(w)) c = c ? new Set([...c].filter((x) => s.codes.includes(x))) : new Set(s.codes);
      return [w, c];
    })
  );
  pools.set(word, candidates);
  // Codes that appear in a sentence without the word cannot be the word's code.
  for (const [w, pool] of pools) for (const s of sentences) if (!s.words.includes(w)) for (const c of s.codes) pool.delete(c);
  while (changed) {
    changed = false;
    for (const [w, pool] of pools) {
      if (pool.size === 1 && !settled.has(w)) {
        const [c] = pool;
        settled.set(w, c);
        for (const [v, other] of pools) if (v !== w && other.delete(c)) changed = true;
        changed = true;
      }
    }
  }
  return [...pools.get(word)];
}
