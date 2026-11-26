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
import { dataSims } from './dataInterpretation.js';
import { geometrySims } from './geometry.js';
import { numberMethodSims } from './numberMethods.js';
import { moreTopicSims } from './moreTopics.js';
import { reasoningSims } from './reasoning.js';
import { reciprocalSims } from './reciprocals.js';
import { trigWaveSims } from './trigWaves.js';
import { frustumSims } from './frustums.js';
import { twoCircleSims } from './twoCircles.js';
import { groupedDataSims } from './groupedData.js';
import { catTopicSims } from './catTopics.js';

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
  // Data interpretation and data sufficiency (dataInterpretation.js). Their meta.js entries keep this order.
  ...dataSims,
  // Lines and angles, quadrilaterals, perimeter and area, 2D mensuration, recasting (geometry.js). Their meta.js entries keep this order.
  ...geometrySims,
  // Remainders, factorials, roots and speed maths (numberMethods.js). Their meta.js entries keep this order.
  ...numberMethodSims,
  // Simplification, approximation, counting, sets, caselets, radar charts, races, wages and quadratic comparison (moreTopics.js). Their meta.js entries keep this order.
  ...moreTopicSims,
  // Logical reasoning (reasoning.js). Their meta.js entries keep this order.
  ...reasoningSims,
  // Batch 4: x + 1/x, a sin θ + b cos θ, frustums, two circles, grouped data (one file each). Their meta.js entries keep this order.
  ...reciprocalSims,
  ...trigWaveSims,
  ...frustumSims,
  ...twoCircleSims,
  ...groupedDataSims,
  // Modulus, polynomials, integer solutions and cryptarithms (catTopics.js). Their meta.js entries keep this order.
  ...catTopicSims
];

const byId = new Map(SIMULATIONS.map((simulation) => [simulation.id, simulation]));

export const getSimulation = (id) => byId.get(id) || null;
export const simulationsForTopic = (topicId) => SIMULATIONS.filter((simulation) => simulation.topicId === topicId);
