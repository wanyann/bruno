import { expect, test } from '../../playwright';
import { createRequest, buildCommonLocators } from '../utils/page';
import {
  collectionName,
  modifier,
  pressShortcut,
  setupBoundActionsData
} from './helpers';

// History back/forward defaults: mac uses Cmd+, Windows uses Ctrl+.
const historyBackKeys = [modifier, 'BracketLeft'];
const historyForwardKeys = [modifier, 'BracketRight'];

const activeTabName = (page) => page.locator('li.request-tab.active .tab-name');

// Open a request in a collection without clicking the collection header (which
// would itself open the Collection settings tab and pollute the history).
const openRequestTab = async (page, name) => {
  const { sidebar } = buildCommonLocators(page);
  const row = sidebar.itemRowIn(collectionName, name);
  await row.dblclick();
  await expect(activeTabName(page)).toHaveText(name, { timeout: 5000 });
};

test.describe('Shortcut Keys - Navigation History', () => {
  test.beforeEach(async ({ pageWithUserData: page, createTmpDir }) => {
    await page.locator('[data-app-state="loaded"]').waitFor();
    await setupBoundActionsData(page, createTmpDir);
    await createRequest(page, 'req-7', collectionName);
    await createRequest(page, 'req-8', collectionName);
    await createRequest(page, 'req-9', collectionName);
  });

  test('history back and forward move between recently visited requests', async ({ pageWithUserData: page }) => {
    await openRequestTab(page, 'req-7');
    await openRequestTab(page, 'req-8');
    await openRequestTab(page, 'req-9');

    // Back → req-8, then req-7
    await pressShortcut(page, ...historyBackKeys);
    await expect(activeTabName(page)).toHaveText('req-8', { timeout: 3000 });
    await pressShortcut(page, ...historyBackKeys);
    await expect(activeTabName(page)).toHaveText('req-7', { timeout: 3000 });

    // Forward → req-8, then req-9
    await pressShortcut(page, ...historyForwardKeys);
    await expect(activeTabName(page)).toHaveText('req-8', { timeout: 3000 });
    await pressShortcut(page, ...historyForwardKeys);
    await expect(activeTabName(page)).toHaveText('req-9', { timeout: 3000 });
  });

  test('history back then navigating to a new request reorders history', async ({ pageWithUserData: page }) => {
    await openRequestTab(page, 'req-7');
    await openRequestTab(page, 'req-8');
    await openRequestTab(page, 'req-9');

    // Back to req-8
    await pressShortcut(page, ...historyBackKeys);
    await expect(activeTabName(page)).toHaveText('req-8', { timeout: 3000 });

    // Open a different request (req-5). History should become [req-7, req-9, req-8, req-5].
    await createRequest(page, 'req-5', collectionName);
    await openRequestTab(page, 'req-5');

    // Back: req-8 (the entry we left when opening req-5)
    await pressShortcut(page, ...historyBackKeys);
    await expect(activeTabName(page)).toHaveText('req-8', { timeout: 3000 });
    // Back: req-9
    await pressShortcut(page, ...historyBackKeys);
    await expect(activeTabName(page)).toHaveText('req-9', { timeout: 3000 });
    // Back: req-7
    await pressShortcut(page, ...historyBackKeys);
    await expect(activeTabName(page)).toHaveText('req-7', { timeout: 3000 });
  });

  test('history navigation itself does not create new entries', async ({ pageWithUserData: page }) => {
    await openRequestTab(page, 'req-8');
    await openRequestTab(page, 'req-9');

    await pressShortcut(page, ...historyBackKeys);
    await expect(activeTabName(page)).toHaveText('req-8', { timeout: 3000 });
    await pressShortcut(page, ...historyForwardKeys);
    await expect(activeTabName(page)).toHaveText('req-9', { timeout: 3000 });
    await pressShortcut(page, ...historyBackKeys);
    await expect(activeTabName(page)).toHaveText('req-8', { timeout: 3000 });
    await pressShortcut(page, ...historyForwardKeys);
    await expect(activeTabName(page)).toHaveText('req-9', { timeout: 3000 });
  });
});
