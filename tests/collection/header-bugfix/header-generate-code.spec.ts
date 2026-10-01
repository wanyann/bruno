import { expect, test } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  createRequest,
  fillRequestUrl,
  openCodeEditorSearchBar,
  openCollection
} from '../../utils/page';

const collectionName = 'header-bugfix-collection';
const EDITOR_ID = 'pre-request-script-editor';

const setup = async (page, createTmpDir) => {
  await closeAllCollections(page);
  const path = await createTmpDir('header-bugfix-collection-path');
  await createCollection(page, collectionName, path);
  await createRequest(page, 'bug-req', collectionName);
};

// Helper: fire a left click on the generate-code button.
const clickGenerateCodeButton = async (page) => {
  await page.getByTestId('generate-code-button').click();
};

test.describe('Header + generate-code bug fixes', () => {
  test.beforeEach(async ({ pageWithUserData: page, createTmpDir }) => {
    await page.locator('[data-app-state="loaded"]').waitFor();
    await setup(page, createTmpDir);
  });

  test('workspace switcher label uses the same font size as the collection label', async ({ pageWithUserData: page }) => {
    const { sidebar } = buildCommonLocators(page);
    await openCollection(page, collectionName);
    await sidebar.itemRowIn(collectionName, 'bug-req').dblclick();

    const switcher = page.getByTestId('workspace-switcher-name');
    await expect(switcher).toBeVisible();

    // The label is either a collection name or (for scratch) a workspace name;
    // in both cases it must render at the shared base size, not a larger one.
    const fontSize = await switcher.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(fontSize).toBeLessThanOrEqual(13.5);
  });

  test('search bar does not paint above the Generate Code modal', async ({ pageWithUserData: page }) => {
    const { sidebar } = buildCommonLocators(page);
    await openCollection(page, collectionName);
    await sidebar.itemRowIn(collectionName, 'bug-req').dblclick();
    await fillRequestUrl(page, 'https://api.example.com/thing');

    // Open the request script search bar (Cmd/Ctrl+F over the script editor).
    await openCodeEditorSearchBar(page, EDITOR_ID);
    const searchBar = page.getByTestId('codemirror-search-bar').first();
    await searchBar.waitFor({ state: 'visible' });

    // Open the Generate Code modal via right click on the generate-code button.
    await page.getByTestId('generate-code-button').click({ button: 'right' });
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // The element at the centre of the search bar must not be the search bar
    // (the modal must be on top).
    const topElementIsSearchBar = await searchBar.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const top = document.elementFromPoint(cx, cy);
      return el.contains(top);
    });
    expect(topElementIsSearchBar).toBe(false);

    await page.getByTestId('modal-close-button').click();
  });

  test('left-click copy of an unsaved request produces a real curl', async ({ pageWithUserData: page }) => {
    const { sidebar } = buildCommonLocators(page);
    await openCollection(page, collectionName);
    await sidebar.itemRowIn(collectionName, 'bug-req').dblclick();

    // Type a URL but do NOT save, so that it lives only in the draft.
    await fillRequestUrl(page, 'https://api.example.com/unsaved-thing');

    await page.evaluate(() => navigator.clipboard.writeText(''));
    await clickGenerateCodeButton(page);

    await expect.poll(async () => await page.evaluate(() => navigator.clipboard.readText().catch(() => ''))).toContain('api.example.com/unsaved-thing');
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).not.toBe('Error generating code snippet');
    expect(clipboardText.trim().startsWith('curl')).toBe(true);
  });
});
