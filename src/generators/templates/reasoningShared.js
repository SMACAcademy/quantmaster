/**
 * Shared pieces for the logical-reasoning templates: Indian names, and a greedy
 * clue picker that keeps adding true clues until brute force finds exactly one
 * arrangement, then drops every clue that turns out not to be needed.
 */

export const NAMES = [
  'Aarav', 'Bhavna', 'Chetan', 'Divya', 'Esha', 'Farhan', 'Gauri', 'Harish', 'Isha', 'Jatin', 'Kavya', 'Lokesh',
  'Meera', 'Nikhil', 'Ojas', 'Pooja', 'Rahul', 'Sneha', 'Tanvi', 'Uday', 'Varun', 'Yamini', 'Zoya'
];
export const MALE_NAMES = ['Arun', 'Bharat', 'Deepak', 'Gopal', 'Imran', 'Kiran', 'Mohan', 'Naveen', 'Prakash', 'Ravi', 'Suresh', 'Vikram'];
export const FEMALE_NAMES = ['Anita', 'Bindu', 'Deepa', 'Geeta', 'Kamala', 'Lata', 'Meena', 'Nisha', 'Priya', 'Radha', 'Sunita', 'Uma'];
export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W'];

/** n names with different first letters, in random order. */
export function pickNames(rng, n, pool = NAMES) {
  const byLetter = new Map();
  for (const name of rng.shuffle(pool)) if (!byLetter.has(name[0])) byLetter.set(name[0], name);
  return [...byLetter.values()].slice(0, n);
}

/**
 * Keep adding clues (in the order given) while each one narrows the candidates,
 * until exactly one is left; then remove clues the others already imply.
 * `filter(list, clue)` keeps the candidates a clue allows; `solve(clues)` solves
 * from scratch. Returns the clues, or null when they never pin one candidate down.
 */
export function pickClues(candidates, start, filter, solve, { maxClues = 9, target = 1 } = {}) {
  let left = start;
  const chosen = [];
  for (const clue of candidates) {
    const next = filter(left, clue);
    if (next.length === left.length) continue;
    chosen.push(clue);
    left = next;
    if (left.length <= target) break;
  }
  if (left.length !== target) return null;
  // Drop any clue the rest already imply, latest first, so the set stays small.
  for (let i = chosen.length - 1; i >= 0 && chosen.length > 1; i--) {
    const without = chosen.filter((_, j) => j !== i);
    if (solve(without).length === left.length) chosen.splice(i, 1);
  }
  return chosen.length <= maxClues ? chosen : null;
}

/** Distractors from a list of names, never the answer, without repeats. */
export function nameDistractors(answer, preferred, all) {
  const seen = new Set([answer]);
  const out = [];
  for (const value of [...preferred, ...all]) {
    if (value === null || value === undefined || seen.has(value)) continue;
    seen.add(value);
    out.push({ value, why: 'another person in the arrangement' });
  }
  return out;
}

export const numbered = (lines) => lines.map((line, i) => `${i + 1}. ${line}`).join('\n');
