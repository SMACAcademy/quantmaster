/**
 * Taxes, GST and commission: the helpers in src/utils/taxes.js held to plain
 * independent working (walking an amount through the bands one rupee-block at
 * a time, working a bill backwards, charging taxes in the other order), and
 * every hand-written question's keyed answer worked out again from scratch.
 */

import { describe, it, expect } from 'vitest';

import {
  afterDiscountAndTax,
  baseFromInclusive,
  customs,
  incomeTax,
  netChange,
  percentOf,
  propertyTax,
  rupees,
  salesForCommission,
  slabRows,
  slabTax,
  splitGst,
  supplyChain,
  taxInInclusive,
  tieredCommission,
  withTax
} from '../src/utils/taxes.js';
import content from '../src/data/content/taxes-commission.json';

/** Tax by walking the amount ₹100 at a time: each block taxed at the rate of the band it falls in. */
function walk(amount, bands) {
  let tax = 0;
  for (let x = 0; x < amount; x += 100) {
    const block = Math.min(100, amount - x);
    const band = bands.find((b) => x + 1 <= b.upTo);
    tax += (block * band.rate) / 100;
  }
  return tax;
}

const close = (a, b) => expect(Math.abs(a - b)).toBeLessThan(1e-6);

const SLABS = [
  { upTo: 300000, rate: 0 },
  { upTo: 600000, rate: 5 },
  { upTo: 900000, rate: 10 },
  { upTo: Infinity, rate: 15 }
];

describe('GST on a price', () => {
  it('adds GST and takes it back out of the bill', () => {
    for (const rate of [0, 3, 5, 12, 18, 28]) {
      for (const base of [100, 2400, 17350, 99999]) {
        const bill = withTax(base, rate);
        close(bill, base * (100 + rate) / 100);
        close(baseFromInclusive(bill, rate), base);
        close(taxInInclusive(bill, rate), bill - base);
        close(taxInInclusive(bill, rate), percentOf(base, rate));
      }
    }
  });

  it('splits GST into equal CGST and SGST within a state, or whole IGST between states', () => {
    expect(splitGst(630, false)).toEqual({ cgst: 315, sgst: 315, igst: 0 });
    expect(splitGst(630, true)).toEqual({ cgst: 0, sgst: 0, igst: 630 });
    for (const tax of [1, 45.5, 1000]) {
      const s = splitGst(tax, false);
      expect(s.cgst + s.sgst).toBe(tax);
    }
  });

  it('gives the same final price for a discount and a tax in either order', () => {
    for (const d of [0, 5, 10, 25]) {
      for (const t of [5, 12, 18]) {
        const discountFirst = afterDiscountAndTax(30000, d, t);
        const taxed = 30000 + (30000 * t) / 100;
        close(discountFirst, taxed - (taxed * d) / 100);
        close(discountFirst, 30000 * (1 + netChange(d, t) / 100));
      }
    }
    close(afterDiscountAndTax(30000, 10, 12), 30240);
  });
});

describe('GST through a supply chain', () => {
  it('charges each trader on its value added, and the chain on the final price', () => {
    const chains = [
      [40000, 52000, 65000],
      [12000, 15000],
      [3000, 7000, 12000],
      [5000, 5000, 20000],
      [1, 2, 3, 4, 5]
    ];
    for (const prices of chains) {
      for (const rate of [5, 12, 18, 28]) {
        const chain = supplyChain(prices, rate);
        chain.stages.forEach((stage, i) => {
          const bought = i ? prices[i - 1] : 0;
          close(stage.net, ((prices[i] - bought) * rate) / 100);
          close(stage.output - stage.credit, stage.net);
        });
        close(chain.total, (prices[prices.length - 1] * rate) / 100);
        close(chain.finalTax, chain.total);
        close(chain.withoutCredit, prices.reduce((s, p) => s + (p * rate) / 100, 0));
      }
    }
  });
});

describe('slabs and tiers', () => {
  it('taxes each slice of an amount at its band’s rate, as a walk through the bands does', () => {
    for (let amount = 0; amount <= 1500000; amount += 37500) {
      close(slabTax(amount, SLABS).total, walk(amount, SLABS));
    }
    close(slabTax(840000, SLABS).total, 39000);
    expect(slabTax(840000, SLABS).parts.map((p) => p.amount)).toEqual([300000, 300000, 240000]);
  });

  it('finds the least sales for a commission target, and the tiered commission on them', () => {
    const tiers = [
      { upTo: 200000, rate: 4 },
      { upTo: 500000, rate: 6 },
      { upTo: Infinity, rate: 10 }
    ];
    for (const target of [0, 1000, 8000, 8001, 17000, 26000, 40000]) {
      const sales = salesForCommission(target, tiers);
      close(tieredCommission(sales, tiers), target);
      if (sales > 0) expect(tieredCommission(sales - 100, tiers)).toBeLessThan(target);
    }
    close(tieredCommission(350000, tiers), 17000);
    expect(salesForCommission(100, [{ upTo: 1000, rate: 1 }])).toBe(Infinity);
  });

  it('applies the deduction, the rebate within its limit only, and cess on the tax left', () => {
    const rules = { slabs: SLABS, deduction: 75000, rebate: { limit: 700000, upTo: 25000 }, cess: 4 };
    const priya = incomeTax(850000, rules);
    expect(priya.taxable).toBe(775000);
    expect(priya.rebated).toBe(0);
    close(priya.total, 33800);
    // Within the limit the rebate wipes out the tax.
    const within = incomeTax(775000, rules);
    expect(within.taxable).toBe(700000);
    close(within.slab, 25000);
    close(within.total, 0);
    // A rebate never makes tax negative.
    expect(incomeTax(500000, rules).total).toBe(0);
  });

  it('writes the slab table with an open top band', () => {
    expect(slabRows(SLABS)).toEqual([
      ['Up to ₹3,00,000', 'Nil'],
      ['₹3,00,001 to ₹6,00,000', '5%'],
      ['₹6,00,001 to ₹9,00,000', '10%'],
      ['Above ₹9,00,000', '15%']
    ]);
    expect(slabRows([{ upTo: 100000, rate: 2 }, { upTo: 1e12, rate: 4 }])[1]).toEqual(['Above ₹1,00,000', '4%']);
  });
});

describe('duties and money', () => {
  it('charges IGST on the value plus the customs duty', () => {
    const c = customs(400000, 10, 18);
    expect(c).toEqual({ duty: 40000, igst: 79200, total: 119200, landed: 519200 });
    close(customs(250000, 7.5, 12).landed, 250000 * 1.075 * 1.12);
  });

  it('takes the early-payment rebate off the property tax, not the annual value', () => {
    expect(propertyTax(180000, 9, 5)).toEqual({ tax: 16200, rebate: 810, payable: 15390 });
  });

  it('writes rupees in the Indian style', () => {
    expect(rupees(4500000)).toBe('₹45,00,000');
    expect(rupees(157.5)).toBe('₹157.50');
    expect(rupees(-20)).toBe('−₹20');
  });
});

/* ------------------------- hand-written questions ------------------------- */

const byId = Object.fromEntries(content.questions.map((q) => [q.id, q]));
const keyed = (q) => q.options.find((o) => o.id === q.correctAnswer[0]).text;
const keyedAll = (q) => q.options.filter((o) => q.correctAnswer.includes(o.id)).map((o) => o.text).sort();
const inr = (value) => `₹${Math.round(value * 100) % 100 ? value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : Math.round(value).toLocaleString('en-IN')}`;
const id = (n) => `taxes-commission-q-${String(n).padStart(3, '0')}`;

/** The example slab table the questions print, read back from the question itself. */
function slabsOf(q) {
  const rows = q.table.rows;
  const tops = rows.map(([label]) => Number((label.match(/₹[\d,]+/g) || []).pop().replace(/[₹,]/g, '')));
  return rows.map(([, rate], i) => ({ upTo: i === rows.length - 1 ? Infinity : tops[i], rate: rate === 'Nil' ? 0 : Number(rate.replace('%', '')) }));
}

const CHECKS = {
  [id(1)]: (q) => expect(keyed(q)).toBe(inr(2400 + 2400 * 0.12)),
  [id(2)]: (q) => {
    // Try every whole-rupee base until 5% GST brings it to the bill.
    let base = 0;
    while (base + base * 0.05 < 1050) base += 1;
    expect(q.answer.value).toBe(base);
  },
  [id(3)]: (q) => {
    const tax = 3500 * 0.18;
    expect(keyed(q)).toBe(`CGST ${inr(tax / 2)} + SGST ${inr(tax / 2)}`);
  },
  [id(4)]: (q) => expect(keyed(q)).toBe('False'),
  [id(5)]: (q) => expect(keyed(q)).toBe(inr(4500000 * 0.02)),
  [id(6)]: (q) => {
    const P = 1000;
    expect(keyed(q)).toBe('P × 0.90 × 1.18');
    close((P - P * 0.1) * 1.18, P * 0.9 * 1.18);
    expect(Math.abs(P * (1 + 0.18 - 0.1) - P * 0.9 * 1.18)).toBeGreaterThan(1);
  },
  [id(7)]: (q) => expect(keyed(q)).toBe(inr(walk(500000, slabsOf(q)))),
  [id(8)]: (q) => {
    let base = 0;
    while (base * 1.18 < 17700 - 1e-9) base += 100;
    expect(q.answer.value).toBe(17700 - base);
  },
  [id(9)]: (q) => expect(keyed(q)).toBe(inr(65000 * 0.05 - 52000 * 0.05)),
  [id(10)]: (q) => {
    const maker = 12000 * 0.18;
    const dealer = 15000 * 0.18 - maker;
    expect(q.answer.value).toBe(Math.round(maker + dealer));
  },
  [id(11)]: (q) => expect(keyed(q)).toBe(inr(Math.round((30000 - 3000) * 1.12))),
  [id(12)]: (q) => {
    const a = (8000 - 8000 * 0.15) * 1.18;
    const b = 8000 * 1.18 * 0.85;
    expect(keyed(q)).toBe(Math.abs(a - b) < 1e-9 ? 'True' : 'False');
  },
  [id(13)]: (q) => {
    const base = 35400 / 1.18;
    const sale = (base - base * 0.1) * 1.18;
    expect(q.answer.value).toBe(Math.round(35400 - sale));
  },
  [id(14)]: (q) => expect(q.answer.value).toBe(walk(840000, slabsOf(q))),
  [id(15)]: (q) => expect(keyed(q)).toBe(inr(walk(950000 - 150000, slabsOf(q)))),
  [id(16)]: (q) => {
    let commission = 0;
    for (let s = 0; s < 350000; s += 1000) commission += s < 200000 ? 40 : 60;
    expect(q.answer.value).toBe(commission);
  },
  [id(17)]: (q) => {
    let sales = 0;
    while (12000 + sales * 0.05 < 30000) sales += 1000;
    expect(keyed(q)).toBe(inr(sales));
  },
  [id(18)]: (q) => expect(q.answer.value).toBe(Math.round(180000 * 0.09 * 0.95)),
  [id(19)]: (q) => expect(keyed(q)).toBe(inr(Math.round(62000 * 0.12 - 50000 * 0.12))),
  [id(20)]: (q) => {
    let marked = 0;
    while (marked * 0.8 * 1.18 < 23600 - 1e-9) marked += 500;
    expect(q.answer.value).toBe(marked);
  },
  [id(21)]: (q) => {
    const taxable = 850000 - 75000;
    let tax = walk(taxable, slabsOf(q));
    if (taxable <= 700000) tax = Math.max(0, tax - 25000);
    expect(keyed(q)).toBe(inr(Math.round(tax * 1.04)));
  },
  [id(22)]: (q) => expect(q.answer.value).toBe((6000000 * 0.015 + 6000000 * 0.01) * 0.75),
  [id(23)]: (q) => expect(keyed(q)).toBe(inr(400000 * 0.1 + (400000 * 1.1) * 0.18)),
  [id(24)]: (q) => {
    const expected = {};
    for (const rate of [12, 18]) {
      const tax = (2000 * rate) / 100;
      expected[`To a Kolkata customer, at ${rate}% GST`] = `CGST ${inr(tax / 2)} + SGST ${inr(tax / 2)}`;
      expected[`To a Patna firm, at ${rate}% GST`] = `IGST ${inr(tax)}`;
    }
    for (const pair of q.pairs) expect(pair.right, pair.left).toBe(expected[pair.left]);
    expect(q.pairs).toHaveLength(4);
  },
  [id(25)]: (q) => {
    // Try many earlier prices: the total never moves; the retailer's share always falls short of it.
    const totals = new Set();
    let retailerPaysAll = false;
    let moreWithoutCredit = true;
    for (let m = 1000; m <= 9000; m += 1000) {
      for (let w = m; w <= 10000; w += 1000) {
        const prices = [m, w, 10000];
        let total = 0;
        prices.forEach((p, i) => (total += 0.18 * (p - (i ? prices[i - 1] : 0))));
        totals.add(Math.round(total));
        if (Math.round(0.18 * (10000 - w)) === 1800) retailerPaysAll = true;
        if (!(0.18 * (m + w + 10000) > 1800)) moreWithoutCredit = false;
      }
    }
    const truth = {
      'The government collects ₹1,800 in all, whatever the earlier prices were.': totals.size === 1 && totals.has(1800),
      'Each trader pays 18% of the value it adds.': true,
      'The retailer pays ₹1,800 to the government.': retailerPaysAll,
      'Without input credit, the total tax collected would be more than ₹1,800.': moreWithoutCredit,
      'If the wholesaler raises its price, the total tax collected rises.': totals.size > 1
    };
    expect(keyedAll(q)).toEqual(Object.keys(truth).filter((k) => truth[k]).sort());
  }
};

describe('hand-written taxes questions', () => {
  it('are all checked here', () => {
    expect(Object.keys(CHECKS).sort()).toEqual(content.questions.map((q) => q.id).sort());
    expect(content.questions.length).toBeGreaterThanOrEqual(20);
  });

  for (const [qid, check] of Object.entries(CHECKS)) {
    it(`${qid} has the right keyed answer`, () => check(byId[qid]));
  }

  it('state every slab table as an example, never as the law', () => {
    for (const q of content.questions.filter((x) => x.table)) {
      expect(q.question, q.id).toMatch(/example/i);
      expect(q.table.caption, q.id).toMatch(/not the current law/);
    }
  });

  it('cover every concept, and every concept has a generator', async () => {
    const { templatesForConcept } = await import('../src/generators/index.js');
    for (const concept of content.concepts) {
      expect(content.questions.some((q) => q.conceptId === concept.id), concept.id).toBe(true);
      expect(templatesForConcept(concept.id).length, concept.id).toBeGreaterThan(0);
    }
  });
});
