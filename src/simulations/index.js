/**
 * The catalogue of interactive simulations ("Explore"), with their models.
 * Each one belongs to a topic and is shown on that topic's page, in the
 * Explore gallery, and inside lessons that include a `simulation` block.
 * See core.js for the shape.
 *
 * The app loads this file (and the drawing code) only when a simulation is
 * opened; pages that just list simulations use meta.js, which a test keeps in
 * step with this list.
 */

import { alligationSeesaw, ciVsSi, markupDiscount, successiveChange } from './money.js';
import { boatsStreams, proportionCurves, tankFilling, trainCrossing, workTogether } from './arithmetic.js';
import { clockHands, tsdMeeting } from './motion.js';
import { quadraticRoots } from './algebra.js';
import { apPairing, apVsGp, inequalityLine, logCurves, twoLines } from './graphs.js';
import { circleAngles, polygonAngles, solidVolumes, triangleAngles, trigTriangle, heightsObserver } from './shapes.js';
import { probabilityTrials } from './chance.js';
import { meanMedianMode, spreadTransform } from './statistics.js';
import { numberSims } from './numbers.js';
import { patternSims } from './patterns.js';
import { numberSenseSims } from './numberSense.js';
import { basicsSims } from './basics.js';
import { numberMethodSims } from './numberMethods.js';

export const SIMULATIONS = [
  // Arithmetic
  successiveChange,
  markupDiscount,
  ciVsSi,
  alligationSeesaw,
  proportionCurves,
  workTogether,
  tankFilling,
  tsdMeeting,
  trainCrossing,
  boatsStreams,
  clockHands,
  // Algebra
  quadraticRoots,
  twoLines,
  inequalityLine,
  apPairing,
  apVsGp,
  logCurves,
  // Geometry and mensuration
  triangleAngles,
  circleAngles,
  polygonAngles,
  solidVolumes,
  trigTriangle,
  heightsObserver,
  // Counting and probability
  probabilityTrials,
  // Data and statistics
  meanMedianMode,
  spreadTransform,
  // Phase F: numbers (numbers.js), then patterns (patterns.js). Their meta.js entries keep this order.
  ...numberSims,
  ...patternSims,
  // Phase G: numberSense.js, then basics.js. Their meta.js entries keep this order.
  ...numberSenseSims,
  ...basicsSims,
  // Remainders, factorials, roots and speed maths (numberMethods.js). Their meta.js entries keep this order.
  ...numberMethodSims
];

const byId = new Map(SIMULATIONS.map((simulation) => [simulation.id, simulation]));

export const getSimulation = (id) => byId.get(id) || null;
export const simulationsForTopic = (topicId) => SIMULATIONS.filter((simulation) => simulation.topicId === topicId);
