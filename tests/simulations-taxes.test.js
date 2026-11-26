/**
 * The GST supply-chain simulation (src/simulations/taxes.js), checked stage by
 * stage against plain working at every setting of its sliders: each trader's
 * tax less the credit for what it paid, the total against GST on the final
 * price, and the CGST/SGST or IGST split on the buyer's bill.
 */

import { describe, it, expect } from 'vitest';

import { getSimulation } from '../src/simulations/index.js';
import { initialValues, run } from '../src/simulations/core.js';

const sim = getSimulation('gst-supply-chain');
const compute = (values) => run(sim, { ...initialValues(sim), ...values }).result;
const range = (from, to, step) => Array.from({ length: Math.round((to - from) / step) + 1 }, (_, i) => from + i * step);
const close = (a, b, where) => expect(Math.abs(a - b), where).toBeLessThan(1e-9);

describe('GST through a supply chain', () => {
  it('charges each trader only on the value it adds, and the chain exactly GST on the final price', () => {
    for (const rate of [1, 5, 12, 18, 28]) {
      for (const maker of range(1000, 5000, 1000)) {
        for (const wholesaler of range(5000, 10000, 2500)) {
          for (const retailer of range(10000, 20000, 2500)) {
            const where = `${rate}% ${maker} ${wholesaler} ${retailer}`;
            const n = compute({ rate, maker, wholesaler, retailer }).numbers;
            const prices = [maker, wholesaler, retailer];
            let paid = 0;
            prices.forEach((price, i) => {
              const collected = (price * rate) / 100;
              const credit = i ? (prices[i - 1] * rate) / 100 : 0;
              close(n.outputs[i], collected, where);
              close(n.credits[i], credit, where);
              close(n.nets[i], collected - credit, where);
              expect(n.nets[i], where).toBeGreaterThanOrEqual(0);
              paid += collected - credit;
            });
            close(n.total, paid, where);
            close(n.total, (retailer * rate) / 100, where);
            close(n.buyerPays, retailer * (1 + rate / 100), where);
            expect(n.withoutCredit, where).toBeGreaterThan(n.total);
          }
        }
      }
    }
  });

  it('shows CGST and SGST in halves within a state, and the whole as IGST between states', () => {
    const intra = compute({ mode: 'intra', rate: 18, retailer: 15000 });
    expect(intra.numbers.cgst).toBe(intra.numbers.sgst);
    close(intra.numbers.cgst + intra.numbers.sgst, 2700);
    expect(intra.numbers.igst).toBe(0);
    expect(intra.readouts.find((r) => r.label === 'On the buyer’s bill').value).toBe('CGST ₹1,350 + SGST ₹1,350');

    const inter = compute({ mode: 'inter', rate: 18, retailer: 15000 });
    expect(inter.numbers.igst).toBe(2700);
    expect(inter.numbers.cgst + inter.numbers.sgst).toBe(0);
    expect(inter.readouts.find((r) => r.label === 'On the buyer’s bill').value).toBe('IGST ₹2,700');
    // The amounts do not depend on the labels.
    expect(inter.numbers.nets).toEqual(intra.numbers.nets);
  });

  it('starts at 12% on ₹3,000, ₹7,000 and ₹12,000: ₹360 + ₹480 + ₹600 = ₹1,440', () => {
    const start = compute({});
    expect(start.numbers.nets).toEqual([360, 480, 600]);
    expect(start.numbers.total).toBe(1440);
    expect(start.readouts.find((r) => r.label === 'Total tax collected').value).toBe('₹1,440 = 12% of ₹12,000');
    expect(start.plot.kind).toBe('gstchain');
    expect(start.plot.stages.map((s) => s.name)).toEqual(['Manufacturer', 'Wholesaler', 'Retailer']);
    expect(start.plot.summary).toContain('₹1,440');
  });

  it('says so when a trader adds no value', () => {
    const idle = compute({ maker: 5000, wholesaler: 5000 });
    expect(idle.numbers.nets[1]).toBe(0);
    expect(idle.insight).toMatch(/wholesaler sells for what it paid/);
  });
});
