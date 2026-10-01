const { shell } = require('electron');

/**
 * Whether external (browser) opening must be suppressed.
 *
 * Enabled during automated Playwright runs so tests that exercise
 * "open link externally" behaviour (Cmd/Ctrl+Click in editors, OAuth flows, docs)
 * don't actually launch the user's default browser with the target URL.
 */
const isExternalOpenSuppressed = () => process.env.PLAYWRIGHT === 'true';

/**
 * Opens a URL in the user's default browser, unless suppressed for tests.
 *
 * @param {string} url - The URL to open externally.
 * @returns {Promise<void>} Resolves once the external open is triggered (or skipped).
 */
const openExternal = (url) => {
  if (isExternalOpenSuppressed()) {
    return Promise.resolve();
  }

  return shell.openExternal(url);
};

module.exports = { openExternal, isExternalOpenSuppressed };
