/**
 * Taxes, GST and commission: the arithmetic behind the topic, with no DOM.
 * The generators, the supply-chain simulation and the tests all use it.
 *
 * Rates are percentages (18 means 18%). Slab and tier tables are lists of
 * bands in increasing order, each `{ upTo, rate }`, where `upTo` is the top of
 * the band (Infinity, or any number above every amount, for the last one) and `rate` applies only to the part of
 * the amount inside that band. Income tax slabs and tiered commission work the
 * same way, so one function serves both.
 *
 * Every slab table used in questions is an example stated in the question,
 * never a claim about the current law.
 */

/** Rupees rounded to paise, without floating-point dust. */
export const paise = (value) => Math.round(value * 100) / 100;

/** r% of an amount. */
export const percentOf = (amount, rate) => (amount * rate) / 100;

/** The price a buyer pays when tax at `rate`% is added to `base`. */
export const withTax = (base, rate) => base + percentOf(base, rate);

/** The price before tax, from a tax-inclusive price: inclusive × 100 / (100 + r). */
export const baseFromInclusive = (inclusive, rate) => (inclusive * 100) / (100 + rate);

/** The tax hidden inside a tax-inclusive price: inclusive × r / (100 + r). */
export const taxInInclusive = (inclusive, rate) => (inclusive * rate) / (100 + rate);

/**
 * How GST on a sale is shown on the bill. Within one state it is split equally
 * into central GST (CGST) and state GST (SGST); between states it is charged
 * whole as integrated GST (IGST).
 */
export function splitGst(tax, interState) {
  return interState ? { cgst: 0, sgst: 0, igst: tax } : { cgst: tax / 2, sgst: tax / 2, igst: 0 };
}

/** The final price after a discount of d% and a tax of t%, in either order. */
export const afterDiscountAndTax = (price, discount, tax) => price * (1 - discount / 100) * (1 + tax / 100);

/** Successive changes as one percentage: +t then −d is t − d − td/100. */
export const netChange = (discount, tax) => tax - discount - (tax * discount) / 100;

/**
 * GST through a supply chain. `prices` are the pre-tax selling prices at each
 * sale in order (manufacturer to wholesaler, wholesaler to retailer, …). Each
 * seller charges GST on its sale (output tax), claims back the GST it paid on
 * its purchase (input tax credit) and pays the government the difference,
 * which is GST on the value it added.
 */
export function supplyChain(prices, rate) {
  const stages = prices.map((price, i) => {
    const bought = i === 0 ? 0 : prices[i - 1];
    const output = percentOf(price, rate);
    const credit = percentOf(bought, rate);
    return { price, bought, valueAdded: price - bought, output, credit, net: output - credit };
  });
  const total = stages.reduce((sum, stage) => sum + stage.net, 0);
  const withoutCredit = stages.reduce((sum, stage) => sum + stage.output, 0);
  return { stages, total, withoutCredit, finalTax: percentOf(prices[prices.length - 1], rate) };
}

/**
 * Tax (or commission) on `amount` under a banded table: each band's rate
 * applies only to the part of the amount inside that band.
 */
export function slabTax(amount, bands) {
  let from = 0;
  let total = 0;
  const parts = [];
  for (const band of bands) {
    if (amount <= from) break;
    const to = Math.min(amount, band.upTo);
    const inside = to - from;
    const tax = percentOf(inside, band.rate);
    parts.push({ from, to, amount: inside, rate: band.rate, tax });
    total += tax;
    from = band.upTo;
  }
  return { total, parts };
}

/** Commission on sales under a tiered table: the same banded rule as income tax slabs. */
export const tieredCommission = (sales, tiers) => slabTax(sales, tiers).total;

/**
 * The least sales that earn `target` in commission under a tiered table
 * (Infinity if the table can never reach it).
 */
export function salesForCommission(target, tiers) {
  let from = 0;
  let earned = 0;
  for (const tier of tiers) {
    const room = percentOf(tier.upTo - from, tier.rate);
    if (earned + room >= target) return tier.rate === 0 ? from : from + ((target - earned) * 100) / tier.rate;
    earned += room;
    from = tier.upTo;
  }
  return Infinity;
}

/**
 * Income tax under example rules: taxable income = gross − deduction, slab
 * tax on that, a rebate that cancels tax up to `rebate.upTo` when taxable
 * income is at most `rebate.limit`, then cess at `cess`% on what is left.
 */
export function incomeTax(gross, { slabs, deduction = 0, rebate = null, cess = 0 }) {
  const taxable = Math.max(0, gross - deduction);
  const slab = slabTax(taxable, slabs).total;
  const rebated = rebate && taxable <= rebate.limit ? Math.min(slab, rebate.upTo) : 0;
  const afterRebate = slab - rebated;
  const cessAmount = percentOf(afterRebate, cess);
  return { taxable, slab, rebated, afterRebate, cess: cessAmount, total: afterRebate + cessAmount };
}

/**
 * Customs on an import under example rates: basic duty on the assessable
 * value, then IGST on the value plus that duty.
 */
export function customs(value, dutyRate, igstRate) {
  const duty = percentOf(value, dutyRate);
  const igst = percentOf(value + duty, igstRate);
  return { duty, igst, total: duty + igst, landed: value + duty + igst };
}

/** Property tax: a rate on the annual value, less a rebate (as a % of the tax) for paying early. */
export function propertyTax(annualValue, rate, rebate = 0) {
  const tax = percentOf(annualValue, rate);
  return { tax, rebate: percentOf(tax, rebate), payable: tax - percentOf(tax, rebate) };
}

/** "₹12,34,567" or "₹1,234.50": Indian grouping, paise only when there are any. */
export function rupees(value) {
  const p = Math.round(value * 100);
  const options = p % 100 === 0 ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  const text = new Intl.NumberFormat('en-IN', options).format(Math.abs(p) / 100);
  return `${p < 0 ? '−' : ''}₹${text}`;
}

/** A slab table as text rows (the last band is open-ended, whatever its `upTo`): ["Up to ₹3,00,000", "Nil"], ["₹3,00,001 to ₹6,00,000", "5%"], ["Above ₹9,00,000", "15%"]. */
export function slabRows(bands) {
  let from = 0;
  return bands.map((band, i) => {
    const label =
      from === 0 ? `Up to ${rupees(band.upTo)}` : i === bands.length - 1 ? `Above ${rupees(from)}` : `${rupees(from + 1)} to ${rupees(band.upTo)}`;
    from = band.upTo;
    return [label, band.rate === 0 ? 'Nil' : `${band.rate}%`];
  });
}
