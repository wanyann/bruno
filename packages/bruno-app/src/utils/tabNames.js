const REQUEST_TAB_TYPES = new Set(['request', 'http-request', 'grpc-request', 'ws-request', 'graphql-request']);

const FIXED_TAB_NAMES = {
  'collection-settings': 'Collection',
  'collection-overview': 'Overview',
  'preferences': 'Preferences',
  'environment-settings': 'Environments',
  'global-environment-settings': 'Global Environments',
  'workspaceOverview': 'Overview',
  'workspaceEnvironments': 'Global Environments',
  'collection-runner': 'Runner',
  'variables': 'Variables',
  'openapi-sync': 'OpenAPI',
  'openapi-spec': 'API Spec',
  'changelog': 'What\'s New'
};

/**
 * Resolves the human-readable name of a tab, matching the labels used in the
 * tab bar. Used by the collection header breadcrumb.
 *
 * @param {Object} params
 * @param {Object} params.tab - The tab object
 * @param {Object} [params.item] - Resolved request item (for request tabs)
 * @param {Object} [params.folder] - Resolved folder (for folder-settings tabs)
 * @param {Object} [params.example] - Resolved example (for response-example tabs)
 * @returns {string}
 */
export const getTabDisplayName = ({ tab, item, folder, example } = {}) => {
  if (!tab) return '';

  if (tab.type === 'response-example') {
    return example?.name || tab.exampleName || tab.name || 'Example';
  }

  if (tab.type === 'folder-settings') {
    return folder?.name || tab.name || 'Folder';
  }

  if (tab.type === 'mock-server') {
    return tab.tabName || tab.name || 'Mock Server';
  }

  if (tab.type === 'mock-response') {
    return tab.responseName || tab.tabName || tab.name || 'Mock Response';
  }

  if (FIXED_TAB_NAMES[tab.type]) {
    return FIXED_TAB_NAMES[tab.type];
  }

  if (REQUEST_TAB_TYPES.has(tab.type)) {
    return item?.name || tab.name || 'Request';
  }

  return tab.name || tab.tabName || 'Tab';
};

export default getTabDisplayName;
