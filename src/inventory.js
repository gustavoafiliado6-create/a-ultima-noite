// Session inventory: metadata is separate from world meshes and future item actions.
export class Inventory {
  #catalog;
  #collected = new Set();
  constructor(catalog) { this.#catalog = new Map(catalog.map(item => [item.id, Object.freeze({ ...item })])); }
  get total() { return this.#catalog.size; }
  get count() { return this.#collected.size; }
  has(id) { return this.#collected.has(id); }
  add(id) {
    if (!this.#catalog.has(id) || this.has(id)) return false;
    this.#collected.add(id); return true;
  }
  get(id) { return this.has(id) ? { ...this.#catalog.get(id) } : null; }
  list() { return [...this.#collected].map(id => this.get(id)); }
}
