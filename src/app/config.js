/**
 * Every tunable number in the learning product lives here.
 * Changing pedagogy or reward balance should never require touching engine code.
 */

export const STORAGE_KEYS = {
  progress: 'quantmaster:v1:progress',
  settings: 'quantmaster:v1:settings',
  attempts: 'quantmaster:v1:attempts'
};

export const DATA_VERSION = '1.0.0';
export const SCHEMA_VERSION = 1;

/** XP awarded for learning actions. Deliberately modest for passive actions. */
export const XP = {
  correctFirstTry: 10,
  correctWithHints: 6,
  correctAfterRetry: 4,
  correctPreviouslyMissed: 14,
  incorrect: 1, // a small amount: an honest attempt still moves you forward
  formulaRecallCorrect: 5,
  formulaReviewed: 2,
  conceptLessonComplete: 12,
  levelComplete: 40,
  sessionComplete: 25,
  dailyMissionComplete: 50,
  streakDay: 8,
  /** Hint use reduces the per-question award by this factor per hint, floored. */
  hintPenaltyPerHint: 0.2,
  hintPenaltyFloor: 0.4
};

/** Rank ladder. `minXp` is cumulative lifetime XP. */
export const RANKS = [
  { id: 'beginner', name: 'Beginner', minXp: 0 },
  { id: 'number-explorer', name: 'Number Explorer', minXp: 250 },
  { id: 'formula-apprentice', name: 'Formula Apprentice', minXp: 750 },
  { id: 'aptitude-builder', name: 'Aptitude Builder', minXp: 1800 },
  { id: 'problem-solver', name: 'Problem Solver', minXp: 3600 },
  { id: 'quant-master', name: 'Quant Master', minXp: 7000 }
];

/** Mastery model (0-100 bounded score per concept). */
export const MASTERY = {
  startScore: 0,
  correctGain: 14,
  correctNoHintBonus: 6,
  correctWithHintsGain: 7,
  incorrectPenalty: 12,
  /** Repeat correctness in later sessions is worth more than in-session streaks. */
  crossSessionBonus: 5,
  /** A wrong answer on something previously strong hurts, but recoverably. */
  regressionCap: 24,
  /** Decay per day once an item goes unreviewed beyond the grace period. */
  decayPerDay: 0.7,
  decayGraceDays: 7,
  decayFloor: 20,
  labels: [
    { id: 'new', label: 'New', min: 0 },
    { id: 'learning', label: 'Learning', min: 1 },
    { id: 'familiar', label: 'Familiar', min: 40 },
    { id: 'proficient', label: 'Proficient', min: 65 },
    { id: 'strong', label: 'Strong', min: 85 }
  ],
  /** A concept counts as "weak" below this and "mastered" at/above `strongAt`. */
  weakBelow: 55,
  strongAt: 85
};

/** Simple SM-2-flavoured scheduler. Intervals in days. */
export const SPACED_REPETITION = {
  ladder: [1, 3, 7, 14, 30, 60],
  initialEase: 2.3,
  minEase: 1.4,
  maxEase: 2.8,
  easeUp: 0.12,
  easeDown: 0.22,
  /** A lapse sends the item back this many steps on the ladder. */
  lapseStepBack: 2,
  /** Items within this window count as "due soon" for planning. */
  dueSoonDays: 2
};

/** Smart-practice question mix. Percentages are normalised at runtime. */
export const SESSION_MIX = {
  weakConcepts: 40,
  dueForReview: 25,
  unseen: 20,
  maintenance: 15
};

/** Session presets offered on the dashboard. */
export const SESSION_PRESETS = [
  {
    id: 'quick-revision',
    name: 'Quick Revision',
    minutes: 5,
    formulaCount: 5,
    questionCount: 4,
    description: 'Due formulas plus a few checks.'
  },
  {
    id: 'focused-practice',
    name: 'Focused Practice',
    minutes: 10,
    formulaCount: 3,
    questionCount: 8,
    description: 'Weak areas with a couple of new ideas.'
  },
  {
    id: 'daily-mission',
    name: 'Daily Mission',
    minutes: 15,
    formulaCount: 3,
    questionCount: 12,
    description: 'The balanced everyday session.'
  },
  {
    id: 'deep-practice',
    name: 'Deep Practice',
    minutes: 25,
    formulaCount: 4,
    questionCount: 20,
    description: 'Longer mixed practice with harder questions.'
  }
];

/** What counts as "practised today" for the streak. Any one of these. */
export const STREAK_RULES = {
  minQuestions: 5,
  minFormulaReviews: 5,
  minConceptLessons: 1,
  /**
   * Streak freezes cover missed days automatically, one freeze per day. Everyone
   * starts with one, and every 7th day of a streak earns another (holding at most 2).
   */
  startingFreezes: 1,
  maxFreezes: 2,
  freezeEveryDays: 7,
  /**
   * A broken streak of at least `repairMinLength` days can be repaired within
   * `repairWindowDays` of coming back, by answering `repairQuestions` in one day.
   */
  repairMinLength: 3,
  repairWindowDays: 3,
  repairQuestions: 15
};

/** Streak lengths that get a celebration; the `big` ones get the full-screen one. */
export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365];
export const BIG_STREAK_MILESTONES = [7, 30, 100, 365];

export const DEFAULT_SETTINGS = {
  theme: 'system',
  motion: 'full', // 'full' | 'reduced'
  sound: false,
  timerInLearnMode: false,
  examTimerSeconds: 60, // per question in exam mode
  dailyGoalQuestions: 20,
  showKeyboardHints: true,
  confirmBeforeExit: true,
  /** Optional daily practice reminder (device notifications; see services/reminders.js). */
  reminderEnabled: false,
  reminderTime: '19:00'
};

/** Level pass thresholds used when a level does not declare its own. */
export const DEFAULT_PASS_CRITERIA = {
  minimumAccuracy: 70,
  minimumQuestionsAttempted: 5
};

/** Practice modes and their behaviour flags. */
export const PRACTICE_MODES = {
  learn: { id: 'learn', name: 'Learn', hints: true, instantFeedback: true, timer: false },
  practice: { id: 'practice', name: 'Practice', hints: true, instantFeedback: true, timer: false },
  revision: { id: 'revision', name: 'Revision', hints: true, instantFeedback: true, timer: false },
  challenge: {
    id: 'challenge',
    name: 'Daily Challenge',
    hints: true,
    instantFeedback: true,
    timer: false
  },
  exam: { id: 'exam', name: 'Exam', hints: false, instantFeedback: false, timer: true },
  smart: { id: 'smart', name: 'Smart Practice', hints: true, instantFeedback: true, timer: false }
};

export const DIFFICULTY_ORDER = ['easy', 'medium', 'complex'];

export const LEVEL_TYPE_META = {
  concept: { label: 'Concept', icon: 'book', tone: 'info' },
  formula_revision: { label: 'Formula Revision', icon: 'cards', tone: 'accent' },
  formula_recognition: { label: 'Formula Recognition', icon: 'target', tone: 'accent' },
  method_recognition: { label: 'Method Recognition', icon: 'compass', tone: 'accent' },
  guided_practice: { label: 'Guided Practice', icon: 'lightbulb', tone: 'warning' },
  easy_practice: { label: 'Easy Practice', icon: 'play', tone: 'success' },
  medium_practice: { label: 'Medium Practice', icon: 'layers', tone: 'warning' },
  complex_practice: { label: 'Complex Practice', icon: 'brain', tone: 'danger' },
  mixed_practice: { label: 'Mixed Practice', icon: 'swap', tone: 'challenge' },
  challenge: { label: 'Challenge', icon: 'trophy', tone: 'challenge' }
};

export const MISTAKE_TYPES = [
  { id: 'concept', label: 'I misunderstood the concept' },
  { id: 'formula_forgotten', label: 'I forgot the formula' },
  { id: 'formula_choice', label: 'I picked the wrong formula' },
  { id: 'calculation', label: 'Calculation slip' },
  { id: 'units', label: 'Unit conversion error' },
  { id: 'misread', label: 'I misread the question' },
  { id: 'careless', label: 'Careless mistake' },
  { id: 'time', label: 'Rushed for time' }
];
