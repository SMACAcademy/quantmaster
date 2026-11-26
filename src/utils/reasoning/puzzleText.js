/**
 * Puzzle clues as sentences: the wording for floors, stacked boxes, days and
 * months, and for attributes (colour, city, fruit). Shared by the question
 * generators, the hand-written content checks and the grid simulation.
 */

export const WORDS = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'];
export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const ATTRS = {
  colour: { name: 'colour', each: 'likes a different colour', values: ['red', 'blue', 'green', 'yellow', 'white', 'black'], who: (v) => `the person who likes ${v}`, is: (v) => `likes ${v}`, isNot: (v) => `does not like ${v}` },
  city: { name: 'city', each: 'is from a different city', values: ['Chennai', 'Delhi', 'Kolkata', 'Mumbai', 'Pune', 'Jaipur'], who: (v) => `the person from ${v}`, is: (v) => `is from ${v}`, isNot: (v) => `is not from ${v}` },
  fruit: { name: 'fruit', each: 'likes a different fruit', values: ['apple', 'banana', 'mango', 'guava', 'papaya', 'grapes'], who: (v) => `the person who likes ${v}`, is: (v) => `likes ${v}`, isNot: (v) => `does not like ${v}` },
  boxColour: { name: 'colour', each: 'is a different colour', values: ['red', 'blue', 'green', 'yellow', 'white', 'black'], who: (v) => `the ${v} box`, is: (v) => `is ${v}`, isNot: (v) => `is not ${v}` }
};

/** How each theme says things about order. */
export const THEMES = {
  floors: {
    slot: (k) => `floor ${k + 1}`,
    intro: (p) => `${cap(WORDS[p.people.length])} people, ${list(p.people)}, live on the ${WORDS[p.people.length]} floors of a building, one on each floor. The lowest floor is floor 1 and the top floor is floor ${p.people.length}.`,
    at: (x, k) => `${x} lives on floor ${k + 1}.`,
    notAt: (x, k) => `${x} does not live on floor ${k + 1}.`,
    above: (x, y) => `${x} lives on a floor somewhere above ${y}.`,
    justAbove: (x, y) => `${x} lives immediately above ${y}.`,
    gap: (x, y, k) => (k === 1 ? `Only one person lives between ${x} and ${y}.` : `Exactly ${WORDS[k]} people live between ${x} and ${y}.`),
    adjacent: (x, y) => `${x} and ${y} live on adjacent floors.`,
    notAdjacent: (x, y) => `${x} and ${y} do not live on adjacent floors.`,
    parity: (x, even) => `${x} lives on an ${even ? 'even' : 'odd'}-numbered floor.`,
    extreme: (x) => `${x} lives either on the top floor or on floor 1.`
  },
  boxes: {
    slot: (k) => `position ${k + 1}`,
    intro: (p) => `${cap(WORDS[p.people.length])} boxes, ${list(p.people.map((b) => `box ${b}`))}, are stacked one above another. The bottom box is at position 1 and the top box at position ${p.people.length}.`,
    at: (x, k) => `${x} is at position ${k + 1}.`,
    notAt: (x, k) => `${x} is not at position ${k + 1}.`,
    above: (x, y) => `${x} is kept somewhere above ${y}.`,
    justAbove: (x, y) => `${x} is kept immediately above ${y}.`,
    gap: (x, y, k) => (k === 1 ? `Only one box is kept between ${x} and ${y}.` : `Exactly ${WORDS[k]} boxes are kept between ${x} and ${y}.`),
    adjacent: (x, y) => `${x} and ${y} are kept one on top of the other.`,
    notAdjacent: (x, y) => `${x} and ${y} are not kept one on top of the other.`,
    parity: (x, even) => `${x} is at an ${even ? 'even' : 'odd'}-numbered position.`,
    extreme: (x) => `${x} is either at the top or at the bottom.`
  },
  days: {
    slot: (k) => DAYS[k],
    intro: (p) => `${cap(WORDS[p.people.length])} people, ${list(p.people)}, visit a library on ${WORDS[p.people.length]} consecutive days of one week, from Monday to ${DAYS[p.people.length - 1]}, one person a day.`,
    at: (x, k) => `${x} visits on ${DAYS[k]}.`,
    notAt: (x, k) => `${x} does not visit on ${DAYS[k]}.`,
    above: (x, y) => `${x} visits on some day after ${y}.`,
    justAbove: (x, y) => `${x} visits on the day immediately after ${y}.`,
    gap: (x, y, k) => (k === 1 ? `Only one person visits between ${x} and ${y}.` : `Exactly ${WORDS[k]} people visit between ${x} and ${y}.`),
    adjacent: (x, y) => `${x} and ${y} visit on consecutive days.`,
    notAdjacent: (x, y) => `${x} and ${y} do not visit on consecutive days.`,
    parity: null,
    extreme: (x) => `${x} visits either on the first day or on the last day.`
  },
  // Months come from the puzzle (puzzle.slotNames), in calendar order.
  months: {
    slot: (k, p) => p.slotNames[k],
    intro: (p) => `${cap(WORDS[p.people.length])} friends, ${list(p.people)}, were born in ${list(p.slotNames)} of the same year, one in each month.`,
    at: (x, k, p) => `${x} was born in ${p.slotNames[k]}.`,
    notAt: (x, k, p) => `${x} was not born in ${p.slotNames[k]}.`,
    above: (x, y) => `${x} was born in a later month than ${y}.`,
    justAbove: (x, y) => `${x} was born in the month that comes next after ${y}’s in the list.`,
    gap: (x, y, k) => (k === 1 ? `Only one person was born between ${x} and ${y}.` : `Exactly ${WORDS[k]} people were born between ${x} and ${y}.`),
    adjacent: (x, y) => `${x} and ${y} were born in neighbouring months of the list.`,
    notAdjacent: (x, y) => `${x} and ${y} were not born in neighbouring months of the list.`,
    parity: null,
    extreme: (x) => `${x} was born either in the first or in the last of these months.`
  }
};

export function list(items) {
  return items.join(', ').replace(/, ([^,]*)$/, ' and $1');
}

export function subjectText(puzzle, s, start) {
  if (s.p !== undefined) return puzzle.kind === 'boxes' ? `${start ? 'Box' : 'box'} ${puzzle.people[s.p]}` : puzzle.people[s.p];
  const attr = puzzle.attrSpecs[s.a];
  const text = attr.who(attr.values[s.v]);
  return start ? cap(text) : text;
}

export function puzzleClueText(puzzle, clue) {
  const X = subjectText(puzzle, clue.x, clue.t !== 'gap');
  const Y = clue.y ? subjectText(puzzle, clue.y, false) : '';
  if (clue.t === 'same' || clue.t === 'diff') {
    const attr = puzzle.attrSpecs[clue.y.a];
    return `${X} ${clue.t === 'same' ? attr.is(attr.values[clue.y.v]) : attr.isNot(attr.values[clue.y.v])}.`;
  }
  const theme = THEMES[puzzle.kind || 'floors'];
  if (clue.t === 'gap') return theme.gap(X, Y, clue.k);
  if (clue.t === 'parity') return theme.parity(X, clue.even);
  if (clue.t === 'at' || clue.t === 'notAt') return theme[clue.t](X, clue.k, puzzle);
  return theme[clue.t](X, Y);
}
