/**
 * Navigation History Middleware
 *
 * Records the sequence of pages/views the user visits during the current
 * session so they can navigate back and forward. Uses a signature-diffing
 * approach: after every action it computes a canonical signature of the
 * currently active view, and asks the navigationHistory slice to record it when
 * it differs from the current entry.
 *
 * History navigation itself (goBack/goForward replay) sets `suppress` on the
 * slice so replay actions never create new entries.
 */

import find from 'lodash/find';
import get from 'lodash/get';
import { recordEntry, NAVIGATION_TAB_TYPES, buildSignature } from '../../slices/navigationHistory';

const IGNORED_TAB_TYPES = new Set([
  'mock-server',
  'mock-response',
  'variables',
  'openapi-sync',
  'openapi-spec',
  'workspaceOverview',
  'workspaceEnvironments',
  'changelog',
  'collection-overview'
]);

const buildEntryFromState = (state) => {
  const tabsState = state.tabs || {};
  const activeTab = find(tabsState.tabs || [], (t) => t.uid === tabsState.activeTabUid);
  if (!activeTab || !activeTab.type) return null;
  if (IGNORED_TAB_TYPES.has(activeTab.type)) return null;
  if (!NAVIGATION_TAB_TYPES.has(activeTab.type)) return null;

  const collectionUid = activeTab.collectionUid || null;
  const collection = find(state.collections?.collections || [], (c) => c.uid === collectionUid);

  const base = {
    kind: activeTab.type,
    collectionUid,
    pathname: activeTab.pathname || null,
    uid: activeTab.uid,
    type: activeTab.type
  };

  switch (activeTab.type) {
    case 'request':
    case 'http-request':
    case 'grpc-request':
    case 'ws-request':
    case 'graphql-request':
      return {
        ...base,
        uid: activeTab.itemUid || activeTab.uid,
        subTab: activeTab.requestPaneTab || null,
        responseTab: activeTab.responsePaneTab || null
      };

    case 'response-example':
      return {
        ...base,
        itemUid: activeTab.itemUid || null,
        responseTab: activeTab.responsePaneTab || null
      };

    case 'collection-settings':
      return {
        ...base,
        subTab: get(collection, 'settingsSelectedTab', null)
      };

    case 'folder-settings':
      return {
        ...base,
        subTab: get(collection, ['folderLevelSettingsSelectedTab', activeTab.folderUid || activeTab.uid], null)
      };

    case 'preferences':
      return {
        ...base,
        subTab: get(state.app, 'activePreferencesTab', null)
      };

    case 'environment-settings':
    case 'global-environment-settings':
    case 'collection-runner':
    default:
      return base;
  }
};

export const navigationHistoryMiddleware = ({ getState, dispatch }) => (next) => (action) => {
  const result = next(action);

  if (action?.type === 'navigationHistory/recordEntry') {
    return result;
  }

  const state = getState();
  if (!state.app?.snapshotReady) return result;
  if (state.navigationHistory?.suppress) return result;

  const entry = buildEntryFromState(state);
  if (entry) {
    const current = state.navigationHistory?.entries?.[state.navigationHistory?.index];
    if (!current || current.signature !== buildSignature(entry)) {
      dispatch(recordEntry(entry));
    }
  }

  return result;
};

export default navigationHistoryMiddleware;
