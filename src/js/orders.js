/**
 * orders.js
 * ----------
 * Fetches order data from the backend API (http://localhost:3001/orders)
 * and provides methods to retrieve, filter, and display orders.
 *
 * Features:
 * - Async fetch from json-server backend
 * - Error handling with fallback to empty array
 * - Order parsing and caching
 * - Filter methods (by id, by customer name, recent orders)
 * - Display helper for rendering orders
 *
 * Usage:
 *   import { Orders } from './src/js/orders.js';
 *   const orders = await Orders.fetchAll();
 *   orders.forEach(o => console.log(o.name, o.total));
 */

const API_URL = 'http://localhost:3001/orders';

/**
 * Order model class
 * Represents a single order record from the backend.
 */
export class Order {
  constructor({ id, name, email, phone, cart, totals, createdAt } = {}) {
    this.id = id;
    this.name = name || '';
    this.email = email || '';
    this.phone = phone || '';
    this.cart = cart || { items: [] };
    this.totals = totals || { subtotal: 0, tax: 0, total: 0 };
    this.createdAt = createdAt || new Date().toISOString();
  }

  /**
   * Return a formatted date string for display
   */
  getFormattedDate() {
    return new Date(this.createdAt).toLocaleString();
  }

  /**
   * Return the item count in this order
   */
  getItemCount() {
    return (this.cart?.items || []).reduce((sum, it) => sum + (it.qty || 0), 0);
  }

  /**
   * Convert order to plain object
   */
  toObject() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      phone: this.phone,
      cart: this.cart,
      totals: this.totals,
      createdAt: this.createdAt
    };
  }

  static fromObject(obj) {
    return new Order(obj);
  }
}

/**
 * Orders API
 * Methods to fetch and manage orders from the backend
 */
export const Orders = {
  // Internal cache to avoid repeated API calls during a session
  _cache: null,
  _cacheTime: null,
  _cacheTTL: 5 * 60 * 1000, // 5 minute cache

  /**
   * fetchAll
   * Fetch all orders from the backend API.
   * Returns an array of Order instances.
   * Includes error handling and fallback to empty array.
   */
  async fetchAll() {
    try {
      const resp = await fetch(API_URL);
      if (!resp.ok) {
        console.warn(`Orders.fetchAll failed with status ${resp.status}`);
        return [];
      }
      const data = await resp.json();
      // Parse into Order instances
      const orders = Array.isArray(data) ? data.map(o => Order.fromObject(o)) : [];
      // Update cache
      this._cache = orders;
      this._cacheTime = Date.now();
      return orders;
    } catch (err) {
      console.error('Error fetching orders:', err);
      return [];
    }
  },

  /**
   * getFromCache
   * Return cached orders if available and not expired.
   * Otherwise returns null to indicate cache miss.
   */
  getFromCache() {
    if (
      this._cache &&
      this._cacheTime &&
      Date.now() - this._cacheTime < this._cacheTTL
    ) {
      return this._cache;
    }
    return null;
  },

  /**
   * clearCache
   * Manually clear the internal cache.
   */
  clearCache() {
    this._cache = null;
    this._cacheTime = null;
  },

  /**
   * fetchById
   * Fetch a single order by ID from the backend.
   */
  async fetchById(id) {
    try {
      const resp = await fetch(`${API_URL}/${id}`);
      if (!resp.ok) {
        console.warn(`Order ${id} not found`);
        return null;
      }
      const data = await resp.json();
      return Order.fromObject(data);
    } catch (err) {
      console.error(`Error fetching order ${id}:`, err);
      return null;
    }
  },

  /**
   * filterByName
   * Return all orders matching a customer name (case-insensitive substring match).
   */
  async filterByName(name) {
    let orders = this.getFromCache();
    if (!orders) {
      orders = await this.fetchAll();
    }
    const lowerName = String(name).toLowerCase();
    return orders.filter(o => o.name.toLowerCase().includes(lowerName));
  },

  /**
   * getRecent
   * Return the N most recent orders (default 5).
   */
  async getRecent(limit = 5) {
    let orders = this.getFromCache();
    if (!orders) {
      orders = await this.fetchAll();
    }
    return orders
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  },

  /**
   * post
   * Create a new order on the backend.
   * Accepts a plain order object and returns the server-assigned Order instance.
   */
  async post(orderObj) {
    try {
      const resp = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderObj)
      });
      if (!resp.ok) {
        console.warn(`POST to ${API_URL} failed with status ${resp.status}`);
        return null;
      }
      const data = await resp.json();
      // Invalidate cache since we added a new order
      this.clearCache();
      return Order.fromObject(data);
    } catch (err) {
      console.error('Error posting order:', err);
      return null;
    }
  }
};

/**
 * renderOrdersInto
 * Helper function to render a list of orders into a container as an HTML table.
 * @param {HTMLElement} container - DOM element to populate
 * @param {Array<Order>} orders - Array of Order instances
 */
export function renderOrdersInto(container, orders = []) {
  if (!container) return;

  container.innerHTML = '';
  if (!orders || orders.length === 0) {
    container.textContent = 'No orders found.';
    return;
  }

  // Create table
  const table = document.createElement('table');
  table.className = 'orders-table';
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';

  // Header
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr style="background:#f5f5f5">
      <th style="padding:8px;border-bottom:1px solid #ddd;text-align:left">Order ID</th>
      <th style="padding:8px;border-bottom:1px solid #ddd;text-align:left">Customer</th>
      <th style="padding:8px;border-bottom:1px solid #ddd;text-align:center">Items</th>
      <th style="padding:8px;border-bottom:1px solid #ddd;text-align:right">Total</th>
      <th style="padding:8px;border-bottom:1px solid #ddd;text-align:left">Date</th>
    </tr>
  `;
  table.appendChild(thead);

  // Body
  const tbody = document.createElement('tbody');
  orders.forEach((o, idx) => {
    const tr = document.createElement('tr');
    if (idx % 2 === 1) tr.style.background = '#fafafa';

    const tdId = document.createElement('td');
    tdId.style.padding = '8px';
    tdId.style.borderBottom = '1px solid #ddd';
    tdId.textContent = String(o.id).substring(0, 8); // Show first 8 chars

    const tdName = document.createElement('td');
    tdName.style.padding = '8px';
    tdName.style.borderBottom = '1px solid #ddd';
    tdName.textContent = o.name;

    const tdItems = document.createElement('td');
    tdItems.style.padding = '8px';
    tdItems.style.borderBottom = '1px solid #ddd';
    tdItems.style.textAlign = 'center';
    tdItems.textContent = String(o.getItemCount());

    const tdTotal = document.createElement('td');
    tdTotal.style.padding = '8px';
    tdTotal.style.borderBottom = '1px solid #ddd';
    tdTotal.style.textAlign = 'right';
    tdTotal.style.fontFamily = 'monospace';
    tdTotal.textContent = '$' + (o.totals?.total || 0).toFixed(2);

    const tdDate = document.createElement('td');
    tdDate.style.padding = '8px';
    tdDate.style.borderBottom = '1px solid #ddd';
    tdDate.textContent = o.getFormattedDate();

    tr.appendChild(tdId);
    tr.appendChild(tdName);
    tr.appendChild(tdItems);
    tr.appendChild(tdTotal);
    tr.appendChild(tdDate);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  container.appendChild(table);
}

// Expose for debugging
window.TCR_Orders = Orders;
