/**
 * Cryptarithms (letter sums): each letter stands for a different digit, the
 * same letter for the same digit, and no number of two or more digits starts
 * with 0.
 *
 * A puzzle is { op, terms, result }:
 *   { op: '+', terms: ['TEA', 'TEA'], result: 'CHAI' }   TEA + TEA = CHAI
 *   { op: '−', terms: ['CHAI', 'TEA'], result: 'TEA' }   CHAI − TEA = TEA
 *   { op: '×', terms: ['AB', 'C'], result: 'DEB' }       AB × C = DEB
 *
 * Three solvers that share no code, so each can check the others:
 *   bruteForce       tries every assignment of distinct digits to the letters
 *   solveColumns     works column by column from the right, carrying (sums and differences)
 *   solveByNumbers   tries every value of the numbers on the left (products)
 * tests/cryptarithm.test.js holds them to each other.
 */

export const OPS = { '+': '+', '−': '−', '×': '×' };

/** The letters in order of first appearance. */
export function lettersOf(puzzle) {
  const seen = [];
  for (const word of [...puzzle.terms, puzzle.result]) for (const ch of word) if (!seen.includes(ch)) seen.push(ch);
  return seen;
}

/** Letters that start a word of two or more letters, so cannot be 0. */
export function leadingLetters(puzzle) {
  return [...new Set([...puzzle.terms, puzzle.result].filter((w) => w.length > 1).map((w) => w[0]))];
}

export function wordValue(word, assignment) {
  let v = 0;
  for (const ch of word) v = v * 10 + assignment[ch];
  return v;
}

/** "TEA + TEA = CHAI" */
export function puzzleText(puzzle) {
  return `${puzzle.terms.join(` ${puzzle.op} `)} = ${puzzle.result}`;
}

/** Does the assignment make the puzzle true (distinct digits, no leading zeros, equation holds)? */
export function satisfies(puzzle, assignment) {
  const letters = lettersOf(puzzle);
  const digits = letters.map((l) => assignment[l]);
  if (digits.some((d) => !Number.isInteger(d) || d < 0 || d > 9)) return false;
  if (new Set(digits).size !== digits.length) return false;
  if (leadingLetters(puzzle).some((l) => assignment[l] === 0)) return false;
  const values = puzzle.terms.map((w) => wordValue(w, assignment));
  const result = wordValue(puzzle.result, assignment);
  if (puzzle.op === '+') return values.reduce((a, b) => a + b, 0) === result;
  if (puzzle.op === '−') return values[0] - values.slice(1).reduce((a, b) => a + b, 0) === result;
  return values.reduce((a, b) => a * b, 1) === result;
}

/**
 * Every assignment of distinct digits to the letters that makes the puzzle
 * true, found by trying them all (up to 10!/(10 − k)! for k letters). Sums and
 * differences use place-value weights so each try is one addition; products
 * are multiplied out at the end of each try.
 */
export function bruteForce(puzzle, { limit = Infinity } = {}) {
  const letters = lettersOf(puzzle);
  if (letters.length > 10) return [];
  const leading = new Set(leadingLetters(puzzle));
  const found = [];
  const used = Array(10).fill(false);
  const assignment = {};
  const linear = puzzle.op !== '×';
  let weights = null;
  if (linear) {
    // Σ weight × digit = 0 exactly when the sum (or difference) holds.
    weights = Object.fromEntries(letters.map((l) => [l, 0]));
    const add = (word, sign) => {
      let place = 1;
      for (let i = word.length - 1; i >= 0; i--) {
        weights[word[i]] += sign * place;
        place *= 10;
      }
    };
    if (puzzle.op === '+') {
      puzzle.terms.forEach((w) => add(w, 1));
      add(puzzle.result, -1);
    } else {
      add(puzzle.terms[0], 1);
      puzzle.terms.slice(1).forEach((w) => add(w, -1));
      add(puzzle.result, -1);
    }
  }
  const visit = (i, total) => {
    if (found.length >= limit) return;
    if (i === letters.length) {
      const ok = linear ? total === 0 : satisfies(puzzle, assignment);
      if (ok) found.push({ ...assignment });
      return;
    }
    const letter = letters[i];
    for (let d = leading.has(letter) ? 1 : 0; d <= 9; d++) {
      if (used[d]) continue;
      used[d] = true;
      assignment[letter] = d;
      visit(i + 1, linear ? total + weights[letter] * d : 0);
      used[d] = false;
    }
    delete assignment[letter];
  };
  visit(0, 0);
  return found;
}

/** A difference A − B = C is the sum B + C = A. */
export function asAddition(puzzle) {
  if (puzzle.op === '+') return puzzle;
  if (puzzle.op === '−') return { op: '+', terms: [...puzzle.terms.slice(1), puzzle.result], result: puzzle.terms[0] };
  throw new Error('column solving covers sums and differences only');
}

/** The number of columns a sum is worked in (the longest word). */
export function columnCount(puzzle) {
  const sum = asAddition(puzzle);
  return Math.max(sum.result.length, ...sum.terms.map((w) => w.length));
}

/**
 * Work a sum (or difference) column by column from the units, choosing digits
 * for new letters and carrying into the next column. With `columns` set, stop
 * after that many columns and return the partial assignments (letters not yet
 * reached are left out); otherwise return the complete solutions.
 *
 * Returns [{ assignment, carries }] where carries[i] is the carry out of column i.
 */
export function solveColumns(puzzle, { columns = Infinity, limit = Infinity } = {}) {
  const sum = asAddition(puzzle);
  const total = columnCount(puzzle);
  const stopAt = Math.min(columns, total);
  const leading = new Set(leadingLetters(puzzle));
  const at = (word, i) => (i < word.length ? word[word.length - 1 - i] : null);
  const found = [];
  const assignment = {};
  const used = Array(10).fill(false);
  const carries = [];

  const column = (i, carryIn) => {
    if (found.length >= limit) return;
    if (i === stopAt) {
      if (stopAt === total && carryIn !== 0) return;
      found.push({ assignment: { ...assignment }, carries: [...carries] });
      return;
    }
    const termLetters = sum.terms.map((w) => at(w, i)).filter(Boolean);
    const resultLetter = at(sum.result, i);
    const fresh = [...new Set([...termLetters, ...(resultLetter ? [resultLetter] : [])])].filter((l) => !(l in assignment));

    const place = (k) => {
      if (k < fresh.length) {
        const letter = fresh[k];
        for (let d = leading.has(letter) ? 1 : 0; d <= 9; d++) {
          if (used[d]) continue;
          used[d] = true;
          assignment[letter] = d;
          place(k + 1);
          used[d] = false;
          delete assignment[letter];
          if (found.length >= limit) return;
        }
        return;
      }
      const s = termLetters.reduce((acc, l) => acc + assignment[l], carryIn);
      const digit = resultLetter ? assignment[resultLetter] : 0;
      if (s % 10 !== digit) return;
      carries.push(Math.floor(s / 10));
      column(i + 1, Math.floor(s / 10));
      carries.pop();
    };
    place(0);
  };
  column(0, 0);
  return found;
}

/**
 * What the first k columns allow: for each letter, the digits it can still
 * take, and for each worked column the carries out it can still produce.
 * Letters not yet reached can take any digit no partial solution has used up
 * (and not 0 if they lead a word). k = columnCount(puzzle) gives the solutions.
 */
export function candidatesAfter(puzzle, k) {
  const letters = lettersOf(puzzle);
  const leading = new Set(leadingLetters(puzzle));
  const partials = solveColumns(puzzle, { columns: k });
  const options = Object.fromEntries(letters.map((l) => [l, new Set()]));
  const carryOptions = Array.from({ length: Math.min(k, columnCount(puzzle)) }, () => new Set());
  for (const { assignment, carries } of partials) {
    const taken = new Set(Object.values(assignment));
    for (const l of letters) {
      if (l in assignment) options[l].add(assignment[l]);
      else for (let d = leading.has(l) ? 1 : 0; d <= 9; d++) if (!taken.has(d)) options[l].add(d);
    }
    carries.forEach((c, i) => carryOptions[i].add(c));
  }
  return {
    partialCount: partials.length,
    candidates: Object.fromEntries(letters.map((l) => [l, [...options[l]].sort((a, b) => a - b)])),
    carries: carryOptions.map((s) => [...s].sort((a, b) => a - b))
  };
}

/** Does this string of digits fit the word's pattern under (a copy of) the map? Updates the map. */
function fit(word, digits, map, usedBy) {
  if (word.length !== digits.length) return false;
  for (let i = 0; i < word.length; i++) {
    const l = word[i];
    const d = Number(digits[i]);
    if (l in map) {
      if (map[l] !== d) return false;
    } else {
      if (usedBy[d] !== undefined) return false;
      map[l] = d;
      usedBy[d] = l;
    }
  }
  return true;
}

/**
 * Products (and sums of short words): try every value of the numbers on the
 * left, work out the right-hand side, and keep the ones whose digits fit the
 * letter pattern. Returns assignments.
 */
export function solveByNumbers(puzzle, { limit = Infinity } = {}) {
  const ranges = puzzle.terms.map((w) => (w.length === 1 ? [0, 9] : [10 ** (w.length - 1), 10 ** w.length - 1]));
  const found = [];
  const values = [];
  const visit = (i) => {
    if (found.length >= limit) return;
    if (i === ranges.length) {
      const result =
        puzzle.op === '×' ? values.reduce((a, b) => a * b, 1) : puzzle.op === '+' ? values.reduce((a, b) => a + b, 0) : values[0] - values.slice(1).reduce((a, b) => a + b, 0);
      if (result < 0) return;
      const map = {};
      const usedBy = {};
      const ok = puzzle.terms.every((w, j) => fit(w, String(values[j]), map, usedBy)) && fit(puzzle.result, String(result), map, usedBy);
      if (ok && !leadingLetters(puzzle).some((l) => map[l] === 0)) found.push(map);
      return;
    }
    for (let v = ranges[i][0]; v <= ranges[i][1]; v++) {
      values[i] = v;
      visit(i + 1);
    }
  };
  visit(0);
  return found;
}

/**
 * Write numbers as letters: each distinct digit gets the next letter from
 * `pool` (in the order the digits first appear). Returns the puzzle and the
 * digit of each letter.
 */
export function encode(op, termNumbers, resultNumber, pool) {
  const letterOf = {};
  const toWord = (n) =>
    String(n)
      .split('')
      .map((d) => {
        if (!(d in letterOf)) letterOf[d] = pool[Object.keys(letterOf).length];
        return letterOf[d];
      })
      .join('');
  const terms = termNumbers.map(toWord);
  const result = toWord(resultNumber);
  const digitOf = Object.fromEntries(Object.entries(letterOf).map(([d, l]) => [l, Number(d)]));
  return { puzzle: { op, terms, result }, digitOf };
}
