/**
 * Simulation for taxes, GST and commission: GST through a supply chain
 * (manufacturer → wholesaler → retailer → buyer). Each trader charges GST on
 * its sale, claims back the GST it paid on its purchase (input tax credit) and
 * pays the government only the difference, which is GST on the value it
 * added. The three payments add up to GST on the final price. The maths is in
 * utils/taxes.js; tests/simulations-taxes.test.js checks it stage by stage.
 */

import { near } from './core.js';
import { percentOf, rupees, splitGst, supplyChain } from '../utils/taxes.js';

const STAGES = [
  { id: 'maker', name: 'Manufacturer', to: 'wholesaler', tone: 'arithmetic' },
  { id: 'wholesaler', name: 'Wholesaler', to: 'retailer', tone: 'algebra' },
  { id: 'retailer', name: 'Retailer', to: 'buyer', tone: 'geometry' }
];

const billText = (tax, interState) => {
  const split = splitGst(tax, interState);
  return interState ? `IGST ${rupees(split.igst)}` : `CGST ${rupees(split.cgst)} + SGST ${rupees(split.sgst)}`;
};

export const gstSupplyChain = {
  id: 'gst-supply-chain',
  topicId: 'taxes-commission',
  alsoTopicIds: ['profit-loss-discount'],
  title: 'GST through a supply chain',
  summary: 'Set the price at each sale from manufacturer to buyer. Each trader pays GST only on the value it adds, because it claims back the GST it paid when buying; together they pay exactly GST on the final price.',
  controls: [
    {
      id: 'mode',
      label: 'Every sale is',
      type: 'choice',
      options: [
        { id: 'intra', label: 'Within a state (CGST + SGST)' },
        { id: 'inter', label: 'Between states (IGST)' }
      ],
      default: 'intra'
    },
    { id: 'rate', label: 'GST rate', type: 'range', min: 1, max: 28, step: 1, default: 12, unit: '%' },
    { id: 'maker', label: 'Manufacturer sells for', type: 'range', min: 1000, max: 5000, step: 500, default: 3000, unit: '₹' },
    { id: 'wholesaler', label: 'Wholesaler sells for', type: 'range', min: 5000, max: 10000, step: 500, default: 7000, unit: '₹' },
    { id: 'retailer', label: 'Retailer sells for', type: 'range', min: 10000, max: 20000, step: 500, default: 12000, unit: '₹' }
  ],
  compute({ mode, rate, maker, wholesaler, retailer }) {
    const interState = mode === 'inter';
    const prices = [maker, wholesaler, retailer];
    const chain = supplyChain(prices, rate);
    const outputs = chain.stages.map((s) => s.output);
    const credits = chain.stages.map((s) => s.credit);
    const nets = chain.stages.map((s) => s.net);
    const valueAdded = chain.stages.map((s) => s.valueAdded);
    const split = splitGst(chain.total, interState);
    const buyerPays = retailer + chain.finalTax;
    const kind = interState ? 'IGST' : 'GST';

    let insight;
    const idle = chain.stages.findIndex((s) => s.valueAdded === 0);
    if (idle >= 0) {
      insight = `The ${STAGES[idle].name.toLowerCase()} sells for what it paid, so it adds no value: its input credit cancels its output tax and it pays nothing.`;
    } else if (near(nets[0], nets[1]) && near(nets[1], nets[2])) {
      insight = `Each trader adds the same value, ${rupees(valueAdded[0])}, so each pays the same ${kind}, ${rupees(nets[0])}: a third of ${rupees(chain.total)}.`;
    } else if (interState) {
      insight = `Between states the whole tax is IGST, collected by the Centre; IGST paid on a purchase is credited against IGST on the sale. The amounts are the same as within a state: ${rate}% of the final price, ${rupees(chain.total)}.`;
    } else {
      insight = `Each trader pays GST only on the value it adds, so the three payments, ${nets.map(rupees).join(' + ')}, make ${rupees(chain.total)}: ${rate}% of the final price, whatever the earlier prices. Without input credit the tax would be ${rupees(chain.withoutCredit)}, tax on tax.`;
    }

    return {
      numbers: { interState, prices, valueAdded, outputs, credits, nets, total: chain.total, finalTax: chain.finalTax, withoutCredit: chain.withoutCredit, buyerPays, ...split },
      readouts: [
        { label: `${kind} charged on each sale`, value: outputs.map(rupees).join(' · ') },
        { label: 'Input tax credit claimed', value: `wholesaler ${rupees(credits[1])}, retailer ${rupees(credits[2])}` },
        { label: `${kind} paid by each trader`, value: nets.map(rupees).join(' + ') },
        { label: 'Total tax collected', value: `${rupees(chain.total)} = ${rate}% of ${rupees(retailer)}` },
        { label: 'On the buyer’s bill', value: billText(chain.finalTax, interState) },
        { label: 'Buyer pays', value: rupees(buyerPays) },
        { label: 'Without input credit', value: rupees(chain.withoutCredit) }
      ],
      plot: {
        kind: 'gstchain',
        interState,
        rate,
        stages: STAGES.map((stage, i) => ({
          name: stage.name,
          to: stage.to,
          tone: stage.tone,
          price: prices[i],
          output: outputs[i],
          credit: credits[i],
          net: nets[i],
          creditTone: i ? STAGES[i - 1].tone : null
        })),
        total: chain.total,
        finalTax: chain.finalTax,
        cgst: percentOf(retailer, rate) / 2,
        summary: `GST at ${rate}%, ${interState ? 'every sale between states (IGST)' : 'every sale within one state (CGST + SGST)'}. ${STAGES.map((s, i) => `The ${s.name.toLowerCase()} sells for ${rupees(prices[i])}, charges ${rupees(outputs[i])}${i ? `, claims ${rupees(credits[i])} of input credit` : ''} and pays ${rupees(nets[i])}.`).join(' ')} Together they pay ${rupees(chain.total)}, the same as ${rate}% of the final price ${rupees(retailer)}.`
      },
      insight
    };
  },
  tasks: [
    {
      id: 'equal',
      prompt: 'Make all three traders pay the same amount of GST.',
      check: (values, n) => near(n.nets[0], n.nets[1]) && near(n.nets[1], n.nets[2]),
      solution: { maker: 4000, wholesaler: 8000, retailer: 12000 }
    },
    {
      id: 'zero',
      prompt: 'Make the wholesaler pay no GST at all.',
      check: (values, n) => near(n.nets[1], 0),
      solution: { maker: 5000, wholesaler: 5000 }
    },
    {
      id: 'total',
      prompt: 'Make the government collect exactly ₹1,800 of tax from the whole chain.',
      check: (values, n) => near(n.total, 1800),
      solution: { rate: 18, retailer: 10000 }
    },
    {
      id: 'igst',
      prompt: 'With every sale between states, make the retailer pay ₹900 of IGST.',
      check: (values, n) => n.interState && near(n.nets[2], 900),
      solution: { mode: 'inter', rate: 18, wholesaler: 7000, retailer: 12000 }
    }
  ]
};

export const taxSims = [gstSupplyChain];

