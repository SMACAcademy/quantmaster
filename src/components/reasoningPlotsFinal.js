/**
 * Pictures for the last five reasoning simulations, one file per topic,
 * dispatched from reasoningPlots.js:
 *
 *   points        a round-robin crosstable: results entered, points and places update
 *                 (reasoningPlotsTournament.js)
 *   strip         letters as numbers on an alphabet strip, with the gaps between terms
 *                 (reasoningPlotsSeries.js)
 *   tiles         symbol tiles swapped into an expression (reasoningPlotsOperations.js),
 *                 stacked above the existing `steps` plot
 *   conveyor      words and numbers rearranged by a machine, step by step
 *                 (reasoningPlotsMachine.js)
 *   arrangements  every possible arrangement, struck out statement by statement
 *                 (reasoningPlotsSufficiency.js)
 *
 * Every picture has a text summary for screen readers; colours come from theme tokens.
 */

import { tournamentPlots } from './reasoningPlotsTournament.js';
import { seriesPlots } from './reasoningPlotsSeries.js';
import { operationsPlots } from './reasoningPlotsOperations.js';
import { machinePlots } from './reasoningPlotsMachine.js';
import { sufficiencyPlots } from './reasoningPlotsSufficiency.js';

const DRAWERS = { ...tournamentPlots, ...seriesPlots, ...operationsPlots, ...machinePlots, ...sufficiencyPlots };

export const FINAL_REASONING_PLOT_KINDS = ['points', 'strip', 'tiles', 'conveyor', 'arrangements'];

export function drawFinalReasoningPlot(plot) {
  const draw = DRAWERS[plot.kind];
  return draw ? draw(plot) : null;
}
