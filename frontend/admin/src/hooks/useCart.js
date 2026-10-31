import { useSyncExternalStore } from 'react';

// Tiny client-side cart kept in localStorage (no cart/order API exists in the backend yet).
// It stores only what is needed to show the cart; prices are a snapshot taken when the item was added.
const KEY = 'catalog.cart.v1';
const listeners = new Set();
let cache = null;

function read() {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
    cache = Array.isArray(parsed) ? parsed : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(items) {
  cache = items;
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* storage unavailable: cart lasts for this tab only */ }
  listeners.forEach((l) => l());
}

const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const cartActions = {
  /** Adds `qty` of a product (capped at the API's max_quantity). Returns the quantity now in the cart. */
  add(product, qty = 1) {
    const apiMax = product.actions?.add_to_cart?.max_quantity; // null = no stock limit
    const max = apiMax === null || apiMax === undefined ? 100000 : Math.max(0, Number(apiMax));
    const items = read();
    const existing = items.find((i) => i.id === product.id);
    const nextQty = Math.min(max, (existing?.qty || 0) + qty);
    const snapshot = {
      id: product.id,
      name: product.product_name,
      sku: product.sku || '',
      image: product.image_url || null,
      price: Number(product.effective_price ?? product.selling_price), // sale price while a sale is on
      mrp: Number(product.mrp),
      gst: Number(product.gst_percent) || 0,
      max,
      qty: nextQty,
    };
    write(existing ? items.map((i) => (i.id === product.id ? snapshot : i)) : [...items, snapshot]);
    return nextQty;
  },
  setQty(id, qty) {
    write(read().map((i) => (i.id === id ? { ...i, qty: Math.max(1, Math.min(i.max, qty)) } : i)));
  },
  remove(id) {
    write(read().filter((i) => i.id !== id));
  },
  clear() {
    write([]);
  },
};

export default function useCart() {
  const items = useSyncExternalStore(subscribe, read);
  const count = items.reduce((n, i) => n + i.qty, 0);
  return { items, count, ...cartActions };
}
