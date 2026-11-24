import { normalize, type Product } from "./catalog";
import type { ListColor } from "./listPreferences";

export type Item = Product & {
  id: string;
  quantity: number;
  checked: boolean;
  asleep?: boolean;
  note: string;
  estimated: number | null;
  paid: number | null;
  prices?: ShopPrice[];
  selectedPrice?: number | null;
  createdAt: number;
};

export type ShopPrice = { store: string; amount: number };
export type Totals = { estimated: number | null; paid: number | null };
export type Closure = Totals & { id: string; createdAt: number; note: string };

export type List = {
  id: string;
  name: string;
  items: Item[];
  shared?: true;
  owner?: true;
  invitation?: string;
  history?: Closure[];
  syncedName?: string;
  color?: ListColor;
  aisles?: Product["category"][];
};
export type Market = {
  lists: List[];
  activeId: string;
  favorites?: string[];
  profileName?: string;
  syncedProfileName?: string;
};

export type Member = {
  id: string;
  name?: string;
  owner: boolean;
  self: boolean;
};

export const starter: Market = {
  activeId: "mi-mercado",
  lists: [{ id: "mi-mercado", name: "Mi mercado", items: [] }],
};

const priceFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
export const money = (value: number) => "$ " + priceFormat.format(value);
const quantityFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 });
export const formatQuantity = (value: number) => quantityFormat.format(value);
export const maxPrice = 999999999.99;

export function readPrice(raw: string) {
  const value = raw.trim().replace(/^\$\s*/, "");
  if (/^\d+(?:[.,]\d{1,2})?$/.test(value)) return Number(value.replace(",", "."));
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(value)) {
    return Number(value.replace(/\./g, "").replace(",", "."));
  }
  if (/^\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?$/.test(value)) return Number(value.replace(/,/g, ""));
  return NaN;
}

function subtotalInCents(quantity: number, price: number) {
  const mills = Math.round(quantity * 1000);
  const cents = Math.round(price * 100);
  return Math.floor(mills / 1000) * cents + Math.round((mills % 1000) * cents / 1000);
}

export const subtotal = (quantity: number, price: number) => subtotalInCents(quantity, price) / 100;

export type StoreTotal = { store: string; covered: number; total: number };

export function compareStores(items: Item[]): { products: number; stores: StoreTotal[] } {
  const visible = items.filter((item) => !item.asleep);
  const byStore = new Map<string, StoreTotal>();
  for (const item of visible) {
    const prices = new Map<string, ShopPrice>();
    for (const quote of item.prices ?? []) {
      const store = quote.store.trim().replace(/\s+/g, " ");
      const key = normalize(store);
      const previous = prices.get(key);
      if (key && (!previous || quote.amount < previous.amount)) prices.set(key, { ...quote, store });
    }
    for (const [key, quote] of prices) {
      const current = byStore.get(key) ?? { store: quote.store, covered: 0, total: 0 };
      current.covered += 1;
      current.total += subtotalInCents(item.quantity, quote.amount);
      byStore.set(key, current);
    }
  }
  const stores = [...byStore.values()]
    .map((store) => ({ ...store, total: store.total / 100 }))
    .sort((first, second) => second.covered - first.covered || first.total - second.total || first.store.localeCompare(second.store));
  return { products: visible.length, stores };
}

export function selectedShopPrice(item: Item) {
  return item.selectedPrice == null ? undefined : item.prices?.[item.selectedPrice];
}

export function itemPrice(item: Item, kind: keyof Totals) {
  return selectedShopPrice(item)?.amount ?? item[kind];
}

export function marketTotals(items: Item[]): Totals {
  let estimated: number | null = null;
  let paid: number | null = null;
  for (const item of items) {
    if (item.asleep) continue;
    const estimate = itemPrice(item, "estimated");
    const actual = item.checked ? itemPrice(item, "paid") : null;
    if (estimate !== null) estimated = (estimated ?? 0) + subtotalInCents(item.quantity, estimate);
    if (actual !== null) paid = (paid ?? 0) + subtotalInCents(item.quantity, actual);
  }
  return { estimated: estimated === null ? null : estimated / 100, paid: paid === null ? null : paid / 100 };
}

export const nextMarket = { checked: false, asleep: false, paid: null } as const;
