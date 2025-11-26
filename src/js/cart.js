// cart.js
// Lightweight cart logic for Titan Coffee Run demo.
// Holds cart state in sessionStorage and exposes simple API for add/remove/update.

const CART_KEY = 'tcr_demo_cart_v1';

function loadCart(){
  try{
    const raw = sessionStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : { items: [] };
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
  addItem(product){
    // product: { id, name, basePrice, size, qty }
    const cart = loadCart();
    const idx = cart.items.findIndex(i=> i.id===product.id && i.size===product.size);
    if (idx >= 0) cart.items[idx].qty += product.qty || 1;
    else cart.items.push({ id: product.id, name: product.name, basePrice: product.basePrice, size: product.size || 'S', qty: product.qty || 1 });
    saveCart(cart);
    return cart;
  },
  updateQty(id, size, qty){
    const cart = loadCart();
    const idx = cart.items.findIndex(i=> i.id===id && i.size===size);
    if (idx >= 0){
      if (qty <= 0) cart.items.splice(idx,1);
      else cart.items[idx].qty = qty;
      saveCart(cart);
    }
    return cart;
  },
  removeItem(id, size){
    const cart = loadCart();
    cart.items = cart.items.filter(i=> !(i.id===id && i.size===size));
    saveCart(cart);
    return cart;
  },
  clear(){ saveCart({ items: [] }); return { items: [] }; },
  getCart(){ return loadCart(); },
  getTotals(){
    const cart = loadCart();
    let subtotal = 0;
    cart.items.forEach(it=>{ subtotal += priceForSize(it.basePrice, it.size) * it.qty; });
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
    li.textContent = `${it.name} (${it.size}) × ${it.qty} — $${(priceForSize(it.basePrice, it.size)*it.qty).toFixed(2)}`;
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
