import { find } from 'lodash';
import { addTab, focusTab, updateRequestPaneTab, updateResponsePaneTab } from './tabs';
import { updateSettingsSelectedTab, updatedFolderSettingsSelectedTab } from './collections';
import { updateActivePreferencesTab } from './app';
import { findCollectionByUid, findItemInCollection, findItemInCollectionByPathname, getDefaultRequestPaneTab } from 'utils/collections';
import { goBack as goBackAction, goForward as goForwardAction, setSuppress } from './navigationHistory';

const REQUEST_TYPES = new Set(['request', 'http-request', 'grpc-request', 'ws-request', 'graphql-request']);

// Resolve the collection an entry belongs to from the current state.
const resolveCollection = (state, entry) => {
  if (!entry.collectionUid) return null;
  return findCollectionByUid(state.collections.collections, entry.collectionUid) || null;
};

// Replay a single navigation-history entry: open/focus the target tab and apply
// its sub-tab selections. Runs with `suppress` set so it never records a new
// history entry.
const replayEntry = (dispatch, getState, entry) => {
  if (!entry) return;

  const state = getState();
  const collection = resolveCollection(state, entry);

  if (REQUEST_TYPES.has(entry.type)) {
    // Prefer the currently loaded item; fall back to a pathname lookup, then to
    // whatever identity was stored. This reopens requested tabs that were closed.
    let item = null;
    if (collection) {
      item = (entry.uid && findItemInCollection(collection, entry.uid))
        || (entry.pathname && findItemInCollectionByPathname(collection, entry.pathname))
        || null;
    }

    const uid = item?.uid || entry.uid || entry.pathname;
    const type = item?.type || entry.type;
    const pathname = item?.pathname || entry.pathname || undefined;

    const existing = find(state.tabs.tabs, (t) => t.uid === uid)
      || (pathname && find(state.tabs.tabs, (t) => t.collectionUid === entry.collectionUid && t.pathname === pathname));

    if (existing) {
      dispatch(focusTab({ uid: existing.uid }));
      if (entry.subTab) {
        dispatch(updateRequestPaneTab({ uid: existing.uid, requestPaneTab: entry.subTab }));
      }
      if (entry.responseTab) {
        dispatch(updateResponsePaneTab({ uid: existing.uid, responsePaneTab: entry.responseTab }));
      }
    } else {
      dispatch(addTab({
        uid,
        collectionUid: entry.collectionUid,
        type,
        pathname,
        requestPaneTab: entry.subTab || (item ? getDefaultRequestPaneTab(item) : undefined)
      }));
      if (entry.responseTab) {
        dispatch(updateResponsePaneTab({ uid, responsePaneTab: entry.responseTab }));
      }
    }
    return;
  }

  if (entry.type === 'collection-settings') {
    dispatch(addTab({ uid: entry.uid, collectionUid: entry.collectionUid, type: 'collection-settings' }));
    if (entry.subTab && collection) {
      dispatch(updateSettingsSelectedTab({ collectionUid: entry.collectionUid, tab: entry.subTab }));
    }
    return;
  }

  if (entry.type === 'folder-settings') {
    dispatch(addTab({ uid: entry.uid, collectionUid: entry.collectionUid, type: 'folder-settings', pathname: entry.pathname || undefined }));
    if (entry.subTab && collection) {
      dispatch(updatedFolderSettingsSelectedTab({ collectionUid: entry.collectionUid, folderUid: entry.uid, tab: entry.subTab }));
    }
    return;
  }

  if (entry.type === 'preferences') {
    dispatch(addTab({ uid: entry.uid, collectionUid: entry.collectionUid, type: 'preferences' }));
    if (entry.subTab) {
      dispatch(updateActivePreferencesTab({ tab: entry.subTab }));
    }
    return;
  }

  if (entry.type === 'response-example') {
    dispatch(addTab({
      uid: entry.uid,
      collectionUid: entry.collectionUid,
      type: 'response-example',
      itemUid: entry.itemUid || undefined,
      pathname: entry.pathname || undefined
    }));
    if (entry.responseTab) {
      dispatch(updateResponsePaneTab({ uid: entry.uid, responsePaneTab: entry.responseTab }));
    }
    return;
  }

  // environment-settings, global-environment-settings, collection-runner
  dispatch(addTab({ uid: entry.uid, collectionUid: entry.collectionUid, type: entry.type }));
};

export const navigateBack = () => (dispatch, getState) => {
  const { entries, index } = getState().navigationHistory;
  if (index <= 0) return;
  const target = entries[index - 1];
  dispatch(setSuppress(true));
  try {
    dispatch(goBackAction());
    replayEntry(dispatch, getState, target);
  } finally {
    dispatch(setSuppress(false));
  }
};

export const navigateForward = () => (dispatch, getState) => {
  const { entries, index } = getState().navigationHistory;
  if (index >= entries.length - 1) return;
  const target = entries[index + 1];
  dispatch(setSuppress(true));
  try {
    dispatch(goForwardAction());
    replayEntry(dispatch, getState, target);
  } finally {
    dispatch(setSuppress(false));
  }
};
