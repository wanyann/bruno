import { createSlice } from '@reduxjs/toolkit';

// Maximum number of navigation entries kept in the session history.
export const MAX_NAVIGATION_HISTORY = 50;

// Tab types that participate in navigation history. Everything else
// (mock servers, variables panel, openapi, workspace tabs, changelog, ...) is
// ignored so the history reflects meaningful page navigation.
export const NAVIGATION_TAB_TYPES = new Set([
  'request',
  'http-request',
  'grpc-request',
  'ws-request',
  'graphql-request',
  'response-example',
  'collection-settings',
  'folder-settings',
  'environment-settings',
  'global-environment-settings',
  'preferences',
  'collection-runner'
]);

const initialState = {
  entries: [], // oldest first, newest last
  index: -1, // index of the entry representing the current view
  suppress: false // when true, navigation is replayed and must not be recorded
};

// Build the canonical signature used to detect a "different view". Requests are
// identified by their stable pathname (the tab uid can temporarily be the
// pathname before the collection mounts), plus both sub-tab dimensions.
export const buildSignature = (entry) => {
  if (!entry) return null;
  const parts = [entry.kind, entry.collectionUid || '', entry.pathname || entry.uid || ''];
  if (entry.subTab) parts.push(`rq:${entry.subTab}`);
  if (entry.responseTab) parts.push(`rs:${entry.responseTab}`);
  return parts.join('|');
};

const navigationHistorySlice = createSlice({
  name: 'navigationHistory',
  initialState,
  reducers: {
    recordEntry: (state, action) => {
      if (state.suppress) return;
      const entry = action.payload;
      if (!entry || !entry.kind) return;

      const signature = buildSignature(entry);
      if (!signature) return;

      const current = state.entries[state.index];
      if (current && buildSignature(current) === signature) {
        return;
      }

      // When the user navigates back and then opens a different view, the entry
      // they were on becomes the newest one before the new entry is appended.
      if (state.index >= 0 && state.index < state.entries.length - 1) {
        const [currentEntry] = state.entries.splice(state.index, 1);
        state.entries.push(currentEntry);
      }

      // No duplicates: if the same view already exists, drop the old occurrence.
      const existingIndex = state.entries.findIndex((e) => buildSignature(e) === signature);
      if (existingIndex !== -1) {
        state.entries.splice(existingIndex, 1);
      }

      state.entries.push({ ...entry, signature });

      if (state.entries.length > MAX_NAVIGATION_HISTORY) {
        state.entries = state.entries.slice(state.entries.length - MAX_NAVIGATION_HISTORY);
      }

      state.index = state.entries.length - 1;
    },
    goBack: (state) => {
      if (state.index > 0) {
        state.index -= 1;
      }
    },
    goForward: (state) => {
      if (state.index < state.entries.length - 1) {
        state.index += 1;
      }
    },
    setSuppress: (state, action) => {
      state.suppress = Boolean(action.payload);
    },
    clearHistory: (state) => {
      state.entries = [];
      state.index = -1;
    }
  }
});

export const {
  recordEntry,
  goBack,
  goForward,
  setSuppress,
  clearHistory
} = navigationHistorySlice.actions;

export default navigationHistorySlice.reducer;
