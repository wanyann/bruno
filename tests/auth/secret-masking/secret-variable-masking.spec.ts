import { expect, test } from '../../../playwright';
import {
  closeAllCollections,
  createCollection,
  createRequest,
  openRequest,
  selectAuthMode,
  selectRequestPaneTab,
  typeIntoField
} from '../../utils/page';

const collectionName = 'secret-variable-masking';

// The Token field is a secret field rendered by SingleLineEditor. Its visible text
// lives in the CodeMirror line; a masked value shows only `*`.
const tokenLine = (page: any) =>
  page
    .locator('label')
    .filter({ hasText: /^Token$/ })
    .locator('..')
    .locator('.single-line-editor-wrapper .CodeMirror .CodeMirror-line')
    .first();

test.describe('Secret fields leave {{variable}} values unmasked', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Bearer token: {{variable}} stays visible while typing and after blur; literal value is masked', async ({
    page,
    createTmpDir
  }) => {
    await createCollection(page, collectionName, await createTmpDir());
    await createRequest(page, 'req-1', collectionName, { url: 'https://example.com/api' });
    await openRequest(page, collectionName, 'req-1');
    await selectRequestPaneTab(page, 'Auth');
    await selectAuthMode(page, 'Bearer Token');

    await test.step('variable value is shown while typing', async () => {
      await typeIntoField(page, 'Token', '{{token}}');
      await expect.poll(() => tokenLine(page).innerText()).toBe('{{token}}');
    });

    await test.step('variable value stays visible after blur', async () => {
      await page.locator('body').click({ position: { x: 5, y: 5 } });
      await expect.poll(() => tokenLine(page).innerText()).toBe('{{token}}');
    });

    await test.step('literal value is still masked', async () => {
      const editor = page
        .locator('label')
        .filter({ hasText: /^Token$/ })
        .locator('..')
        .locator('.single-line-editor-wrapper .CodeMirror');
      await editor.click();
      await page.keyboard.press('Meta+A');
      await page.keyboard.press('Control+A');
      await page.keyboard.type('secret123');

      await expect.poll(async () => {
        const text = await tokenLine(page).innerText();
        return /^\*+$/.test(text);
      }).toBe(true);
    });
  });
});
