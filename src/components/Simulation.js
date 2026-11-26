/**
 * An interactive simulation: sliders and choices on one side, a live picture
 * and the key numbers on the other, a sentence on what the current settings
 * show, and a few "Try this" challenges.
 *
 * Moving a slider redraws only the picture, numbers and challenges, so the
 * slider keeps focus while it is dragged. Nothing here is scored; finished
 * challenges are remembered on this device only.
 */

import { el, render } from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { button, segmented } from './ui.js';
import { drawPlot } from './simPlots.js';
import { initialValues, normaliseValues, show, solvedTasks } from '../simulations/core.js';
import { rememberSolved } from '../simulations/progress.js';

const valueText = (control, value) => {
  const shown = show(value, 2);
  if (!control.unit) return shown;
  return control.unit === '₹' ? `₹${shown}` : `${shown}${control.unit === '%' ? '%' : ` ${control.unit}`}`;
};

export function simulationPanel(simulation, { heading = 'h2', showTitle = true } = {}) {
  let values = initialValues(simulation);
  let solved = rememberSolved(simulation.id, []);
  const controlsBox = el('div.sim__controls');
  const stage = el('div.sim__stage');
  const readouts = el('dl.sim__readouts', { 'aria-live': 'polite' });
  const insight = el('p.sim__insight', { 'aria-live': 'polite' });
  const tasksBox = el('div.sim__tasks');

  function setValues(next) {
    values = normaliseValues(simulation, { ...values, ...next });
  }

  // A control with `showWhen: { mode: 'speed' }` (or a list of options) shows only
  // while that choice is set; changing a choice redraws the controls.
  const visible = (control) =>
    !control.showWhen ||
    Object.entries(control.showWhen).every(([id, want]) => (Array.isArray(want) ? want : [want]).includes(values[id]));

  function drawControls() {
    render(
      controlsBox,
      simulation.controls.filter(visible).map((control) => {
        if (control.type === 'choice') {
          return el('div.sim-control', {}, [
            el('div.sim-control__label', { text: control.label }),
            segmented(control.options, values[control.id], (id) => {
              setValues({ [control.id]: id });
              drawControls();
              update();
            })
          ]);
        }
        if (control.type === 'reroll') {
          return button(control.label, {
            variant: 'soft',
            size: 'sm',
            iconName: 'refresh',
            onClick: () => {
              setValues({ [control.id]: values[control.id] + 1 });
              update();
            }
          });
        }
        const output = el('output.sim-control__value', { text: valueText(control, values[control.id]) });
        const input = el('input.sim-range', {
          type: 'range',
          min: control.min,
          max: control.max,
          step: control.step,
          value: values[control.id],
          'aria-label': control.label,
          'aria-valuetext': valueText(control, values[control.id]),
          on: {
            input: (event) => {
              setValues({ [control.id]: Number(event.target.value) });
              output.textContent = valueText(control, values[control.id]);
              event.target.setAttribute('aria-valuetext', output.textContent);
              update();
            }
          }
        });
        return el('label.sim-control', {}, [
          el('div.sim-control__head', {}, [el('span.sim-control__label', { text: control.label }), output]),
          input
        ]);
      })
    );
  }

  function update() {
    const result = simulation.compute(values);
    render(stage, [drawPlot(result.plot)]);
    render(
      readouts,
      result.readouts.map((readout) => el('div.sim-readout', {}, [el('dt', { text: readout.label }), el('dd', { text: readout.value })]))
    );
    insight.textContent = result.insight;
    solved = rememberSolved(simulation.id, solvedTasks(simulation, values, result.numbers));
    const now = new Set(solvedTasks(simulation, values, result.numbers));
    render(tasksBox, [
      el('h4.sim__tasks-title', {}, [icon('target', { size: 16 }), `Try this (${solved.size} of ${simulation.tasks.length} done)`]),
      el(
        'ul.sim__task-list',
        {},
        simulation.tasks.map((task) =>
          el('li', { class: `sim-task${now.has(task.id) ? ' is-now' : ''}${solved.has(task.id) ? ' is-done' : ''}` }, [
            el('span.sim-task__mark', { 'aria-hidden': 'true' }, [icon(solved.has(task.id) ? 'check' : 'target', { size: 14 })]),
            el('span.sim-task__prompt', { text: task.prompt }),
            now.has(task.id)
              ? el('span.sim-task__now', { text: 'Solved' })
              : button('Show me', {
                  variant: 'ghost',
                  size: 'sm',
                  onClick: () => {
                    setValues(task.solution);
                    drawControls();
                    update();
                  }
                }),
            el('span.sr-only', { text: solved.has(task.id) ? ' (done)' : '' })
          ])
        )
      )
    ]);
  }

  const element = el('section.sim', { attrs: { 'data-simulation': simulation.id } }, [
    showTitle
      ? el('header.sim__head', {}, [
          el(`${heading}.sim__title`, { text: simulation.title }),
          el('p.sim__summary', { text: simulation.summary })
        ])
      : null,
    el('div.sim__layout', {}, [controlsBox, el('div.sim__view', {}, [stage, readouts])]),
    insight,
    tasksBox,
    el('div.sim__footer', {}, [
      button('Reset', {
        variant: 'ghost',
        size: 'sm',
        iconName: 'refresh',
        onClick: () => {
          values = initialValues(simulation);
          drawControls();
          update();
        }
      })
    ])
  ]);

  drawControls();
  update();
  return element;
}
