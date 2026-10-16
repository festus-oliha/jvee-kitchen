const formatter = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 });

/** 4500 -> "₦4,500" */
export function naira(amount: number): string {
  return "₦" + formatter.format(amount);
}
