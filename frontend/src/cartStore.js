/* Cart state: items live in localStorage so a refresh / new tab keeps the cart.
   item = { id, name, img, price, mrp?, opt?, url? } + qty */
import { useCallback, useEffect, useState } from 'react'

const KEY = 'aakash-cart-v1'
const read = () => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY))
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

export function useCart() {
  const [items, setItems] = useState(read)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items))
    } catch {
      /* private mode – cart still works for this visit */
    }
  }, [items])

  const add = useCallback((raw, qty = 1) => {
    if (!raw || !raw.price) return
    const it = { ...raw, id: String(raw.id).replace(/\|+$/, '') } /* "slug|" and "slug" are the same plain product */
    setItems((list) =>
      list.some((x) => x.id === it.id)
        ? list.map((x) => (x.id === it.id ? { ...x, price: it.price, ...(it.mrp ? { mrp: it.mrp } : {}), qty: x.qty + qty } : x))
        : [...list, { ...it, qty }],
    )
  }, [])
  const setQty = useCallback(
    (id, qty) => setItems((l) => l.map((x) => (x.id === id ? { ...x, qty: Math.min(99, Math.max(1, qty)) } : x))),
    [],
  )
  const remove = useCallback((id) => setItems((l) => l.filter((x) => x.id !== id)), [])
  const clear = useCallback(() => setItems([]), [])

  return {
    items,
    add,
    setQty,
    remove,
    clear,
    count: items.reduce((n, x) => n + x.qty, 0),
    total: items.reduce((n, x) => n + x.qty * x.price, 0),
  }
}