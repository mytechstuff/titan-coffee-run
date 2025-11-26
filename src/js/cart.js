// cart.js
// Lightweight cart logic for Titan Coffee Run demo.
// Holds cart state in sessionStorage and exposes simple API for add/remove/update.
//
// This file defines two small domain classes: `Product` and `OrderItem`.
// - `Product` encapsulates the canonical product data (id, name, basePrice, img).
//   Keeping a Product class simplifies serialization, pricing calculations,
//   and makes it easier to extend product metadata later (e.g., SKU, calories).
// - `OrderItem` represents a single line in the cart and records the product,
//   chosen size (S/M/L), quantity, and a timestamp/date for when the item was
//   added. Storing the date helps auditing and order history features.

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
  try{
    const raw = sessionStorage.getItem(CART_KEY);
    if (!raw) return { items: [] };
    const parsed = JSON.parse(raw);
    // deserialize items into plain objects (we keep storage format simple)
    parsed.items = (parsed.items || []).map(it => OrderItem.fromObject(it).toObject());
    return parsed;
  }catch(e){ return { items: [] }; }
}

function saveCart(cart){
  try{ sessionStorage.setItem(CART_KEY, JSON.stringify(cart)); }catch(e){}
}

function priceForSize(basePrice, size){
  // size: 'S'|'M'|'L' multipliers
  const mult = size === 'M' ? 1.25 : size === 'L' ? 1.5 : 1.0;
  return Math.round(basePrice * mult * 100) / 100;
}

export const Cart = {
  /**
   * Add an item to the cart. Accepts either a Product-like object or a Product
   * instance and returns the updated cart. We normalize data into OrderItem
   * objects for storage.
   * @param {{ id, name, basePrice }|Product} product
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
  removeItem(id, size){
    const cart = loadCart();
    cart.items = cart.items.filter(i=> !(i.product && i.product.id === id && i.size === size));
    saveCart(cart);
    return cart;
  },
  clear(){ saveCart({ items: [] }); return { items: [] }; },
  getCart(){ return loadCart(); },
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
  container.innerHTML = '';
  if (!cart.items.length){ container.textContent = 'Cart is empty.'; return; }
  const ul = document.createElement('ul');
  cart.items.forEach(it=>{
    const li = document.createElement('li');
    const name = (it.product && it.product.name) || 'Item';
    const linePrice = ((priceForSize((it.product && it.product.basePrice)||0, it.size) * it.qty) || 0);
    li.textContent = `${name} (${it.size}) × ${it.qty} — $${linePrice.toFixed(2)}`;
    ul.appendChild(li);
  });
  container.appendChild(ul);
  const totals = Cart.getTotals();
  const p = document.createElement('p');
  p.textContent = `Subtotal: $${totals.subtotal.toFixed(2)} • Tax: $${totals.tax.toFixed(2)} • Total: $${totals.total.toFixed(2)}`;
  container.appendChild(p);
}

// expose for debugging
window.TCR_Cart = Cart;
