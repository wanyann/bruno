const { buildRequestIndex } = require('./index-builder');

/**
 * In-memory cache of per-collection request indexes, kept fresh by the
 * workspace watcher. Building is cheap for small collections and happens once
 * per collection per session; file changes mark a collection stale and schedule
 * a debounced background rebuild so opening Cmd+K stays fast.
 */
class SearchIndex {
  constructor() {
    this.indexes = new Map(); // collectionPath -> { items, stale, building, timer }
  }

  _entry(collectionPath) {
    if (!this.indexes.has(collectionPath)) {
      this.indexes.set(collectionPath, { items: null, stale: false, building: false, timer: null });
    }
    return this.indexes.get(collectionPath);
  }

  _clearTimer(entry) {
    if (entry.timer) {
      clearTimeout(entry.timer);
      entry.timer = null;
    }
  }

  // schedule a debounced background rebuild after a file change
  markStale(collectionPath) {
    const entry = this._entry(collectionPath);
    entry.stale = true;
    this._clearTimer(entry);
    entry.timer = setTimeout(() => {
      if (entry.building) return;
      entry.building = true;
      buildRequestIndex(collectionPath)
        .then((items) => {
          entry.items = items;
          entry.stale = false;
        })
        .catch((err) => {
          console.error(`[search-index] rebuild failed for ${collectionPath}`, err?.message || err);
        })
        .finally(() => {
          entry.building = false;
          entry.timer = null;
        });
    }, 200);
  }

  // return current cached items; trigger a build if we don't have them yet
  async getIndex(collectionPath) {
    const entry = this._entry(collectionPath);

    if (entry.items !== null) {
      if (entry.stale && !entry.building) {
        // kick off a background refresh but still return the cached, slightly stale copy now
        this.markStale(collectionPath);
      }
      return entry.items;
    }

    if (entry.building) {
      // wait for in-flight build to finish, then return
      return new Promise((resolve) => {
        const check = () => {
          if (entry.items !== null) resolve(entry.items);
          else setTimeout(check, 50);
        };
        check();
      });
    }

    entry.building = true;
    try {
      const items = await buildRequestIndex(collectionPath);
      entry.items = items;
      entry.stale = false;
      return items;
    } finally {
      entry.building = false;
    }
  }

  async refresh(collectionPath) {
    const items = await buildRequestIndex(collectionPath);
    const entry = this._entry(collectionPath);
    this._clearTimer(entry);
    entry.items = items;
    entry.stale = false;
    return items;
  }

  invalidate(collectionPath) {
    this.indexes.delete(collectionPath);
  }
}

// Shared singleton used by the IPC layer and the workspace watcher.
let _shared = null;
const getSearchIndex = () => {
  if (!_shared) _shared = new SearchIndex();
  return _shared;
};

module.exports = { SearchIndex, getSearchIndex };
