// Keep values from the API as strings; don't perform money arithmetic in JS floats.
export function displayMoney(amount: string, currency: string): string {
  return `${amount} ${currency}`;
}

export function displayDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-GB");
}

export function displayFindingName(name: string): string {
  return name.replaceAll("_", " ");
}
