// cart.js
// Lightweight cart logic for Titan Coffee Run demo.
// Holds cart state in sessionStorage and exposes simple API for add/remove/update.
//
// Domain classes:
// - Product: canonical product data (id, name, basePrice, img). Centralizing
//   product information makes pricing and serialization consistent.
// - OrderItem: a cart line (product + size + qty + date). The `date` field
//   provides a timestamp for order history and auditing.
//
// Constants / variables:
// - `CART_KEY`: storage key in `sessionStorage`. Using a single key centralizes
//   cart persistence and makes it easier to update the format when needed.
//
// Rationale: sessionStorage is used so the cart survives page reloads during
// a session but is cleared when the browser/tab is closed. For multi-device
// persistence, move storage to the server.

const CART_KEY = 'tcr_demo_cart_v1';

export class Product {
  /**
   * @param {{id:string,name:string,basePrice:number,img?:string}} opts
   */
  constructor({ id, name = '', basePrice = 0, img = '' } = {}){
    this.id = String(id || '');
    this.name = String(name || '');
    this.basePrice = Number(basePrice || 0);
    this.img = img || '';
  }
  toObject(){ return { id: this.id, name: this.name, basePrice: this.basePrice, img: this.img }; }
  static fromObject(o){ return new Product(o || {}); }
}

export class OrderItem {
  /**
   * @param {{product:Product|object, size:string, qty:number, date:string}} opts
   */
  constructor({ product = {}, size = 'M', qty = 1, date = new Date().toISOString() } = {}){
    this.product = (product instanceof Product) ? product : Product.fromObject(product);
    this.size = size; // 'S'|'M'|'L'
    this.qty = Number(qty || 0);
    this.date = date; // ISO string representing when this order item was created
  }
  toObject(){ return { product: this.product.toObject(), size: this.size, qty: this.qty, date: this.date }; }
  static fromObject(o){ return new OrderItem({ product: Product.fromObject(o.product || {}), size: o.size, qty: o.qty, date: o.date }); }
}

function loadCart(){
  /**
   * Loads the cart from sessionStorage and returns it as an object.
   * If the cart is empty or invalid, returns an empty items array.
   */
  try{
    const raw = sessionStorage.getItem(CART_KEY);
    if (!raw) return { items: [] };
    const parsed = JSON.parse(raw);
    // deserialize items into plain objects (we keep storage format simple)
    parsed.items = (parsed.items || []).map(it => OrderItem.fromObject(it).toObject());
    return parsed;
  }catch(e){ return { items: [] }; }
}

/**
 * saveCart
 * Persist the given cart object into sessionStorage as JSON.
 */
function saveCart(cart){
  try{ sessionStorage.setItem(CART_KEY, JSON.stringify(cart)); }catch(e){}
}

/**
 * priceForSize
 * Compute the price for a given size using simple multipliers so prices are
 * predictable and easy to explain to students (S=1.0, M=1.25, L=1.5).
 */
function priceForSize(basePrice, size){
  // size: 'S'|'M'|'L' multipliers
  const mult = size === 'M' ? 1.25 : size === 'L' ? 1.5 : 1.0;
  return Math.round(basePrice * mult * 100) / 100;
}

/**
 * Cart API
 * Methods operate on the stored cart and return the updated cart object.
 */
export const Cart = {
  /**
   * Add an item to the cart. Accepts either a Product-like object or a Product
   * instance and returns the updated cart. We normalize data into OrderItem
   * objects for storage.
   * @param {{ id, name, basePrice }|Product} product
   */
  /**
   * addItem
   * Add or merge a product into the cart. Accepts a Product or product-like
   * object and normalizes it into an OrderItem for storage. Returns the
   * updated cart.
   */
  addItem(product){
    const cart = loadCart();
    const prod = (product instanceof Product) ? product : new Product(product || {});
    const size = product.size || product.selectedSize || 'M';
    const qty = Number(product.qty || 1);
    // try to merge with existing same product+size
    const idx = cart.items.findIndex(i=> i.product && i.product.id === prod.id && i.size === size);
    if (idx >= 0) cart.items[idx].qty = Number((cart.items[idx].qty || 0) + qty);
    else cart.items.push(new OrderItem({ product: prod, size, qty }).toObject());
    saveCart(cart);
    return cart;
  },
  /**
   * updateQty
   * Update the quantity of a specific product+size in the cart; removes the
   * item when qty <= 0. Returns the updated cart object.
   */
  updateQty(id, size, qty){
    const cart = loadCart();
    const idx = cart.items.findIndex(i=> i.product && i.product.id === id && i.size === size);
    if (idx >= 0){
      if (qty <= 0) cart.items.splice(idx,1);
      else cart.items[idx].qty = Number(qty);
      saveCart(cart);
    }
    return cart;
  },
  /**
   * removeItem
   * Remove a product+size line from the cart entirely.
   */
  removeItem(id, size){
    const cart = loadCart();
    cart.items = cart.items.filter(i=> !(i.product && i.product.id === id && i.size === size));
    saveCart(cart);
    return cart;
  },
  clear(){ saveCart({ items: [] }); return { items: [] }; },
  getCart(){ return loadCart(); },
  /**
   * getTotals
   * Compute subtotal, tax, and total for the current cart. Tax is a simple
   * fixed rate (8%) for demo purposes; in production this should come from
   * server-side pricing/tax services.
   */
  getTotals(){
    const cart = loadCart();
    let subtotal = 0;
    cart.items.forEach(it=>{
      const base = (it.product && Number(it.product.basePrice)) || 0;
      subtotal += priceForSize(base, it.size) * (it.qty || 0);
    });
    subtotal = Math.round(subtotal * 100) / 100;
    const tax = Math.round(subtotal * 0.08 * 100) / 100; // 8% demo
    const total = Math.round((subtotal + tax) * 100) / 100;
    return { subtotal, tax, total };
  },
  priceForSize
};

// Optional: provide a small renderer helper for a container element
export function renderCartInto(container){
  if (!container) return;
  const cart = loadCart();
  // If caller provided a split layout with `cartItems` and `cartTotals` nodes,
  // render items and totals into those separately. This allows placing totals
  // to the right of the item list for clarity.
  const itemsEl = container.querySelector('#cartItems') || container;
  const totalsEl = container.querySelector('#cartTotals') || container;
  itemsEl.innerHTML = '';
  if (!cart.items.length){ itemsEl.textContent = 'Cart is empty.'; totalsEl.innerHTML = ''; return; }

  const ul = document.createElement('ul'); ul.className = 'cart-items-list';
  cart.items.forEach(it=>{
    const li = document.createElement('li'); li.className = 'cart-item-row';
    const name = (it.product && it.product.name) || 'Item';
    const linePrice = ((priceForSize((it.product && it.product.basePrice)||0, it.size) * it.qty) || 0);
    // structure: [qty] [name] [size] [linePrice]
    const qtySpan = document.createElement('span'); qtySpan.className = 'ci-qty'; qtySpan.textContent = String(it.qty);
    const nameSpan = document.createElement('span'); nameSpan.className = 'ci-name'; nameSpan.textContent = name;
    const sizeSpan = document.createElement('span'); sizeSpan.className = 'ci-size'; sizeSpan.textContent = it.size;
    const priceSpan = document.createElement('span'); priceSpan.className = 'ci-price'; priceSpan.textContent = '$' + linePrice.toFixed(2);
    li.appendChild(qtySpan); li.appendChild(nameSpan); li.appendChild(sizeSpan); li.appendChild(priceSpan);
    ul.appendChild(li);
  });
  itemsEl.appendChild(ul);

  // totals
  const totals = Cart.getTotals();
  totalsEl.innerHTML = '';
  const subt = document.createElement('div'); subt.textContent = 'Subtotal: $' + totals.subtotal.toFixed(2);
  const tax = document.createElement('div'); tax.textContent = 'Tax: $' + totals.tax.toFixed(2);
  const tot = document.createElement('div'); tot.style.fontWeight = '700'; tot.textContent = 'Total: $' + totals.total.toFixed(2);
  totalsEl.appendChild(subt); totalsEl.appendChild(tax); totalsEl.appendChild(tot);
}

// expose for debugging
window.TCR_Cart = Cart;
