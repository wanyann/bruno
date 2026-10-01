import { Page, test } from '../../playwright';
import { buildCommonLocators, closeAllCollections, LINK_AWARE_COLLECTION_NAME as COLLECTION_NAME, expectNoLinkMark, expectRichTextLinkOpensExternally, expectRichTextLinkOpensRequest, LINK_CLICK_MODIFIER, openCollectionFromDialog, openfolder, selectfolderPaneTab } from '../utils/page';

const FOLDER_NAME = 'folder-fixture';
const settings = (page: Page) => buildCommonLocators(page).paneTabs.folderSettingsContent();
const url = (path: string) => `http://link-aware.test/${path}`;

test.describe('CodeMirror link-aware - Folder settings', () => {
  test.beforeEach(async ({ page, electronApp, collectionFixturePath }) => {
    await openCollectionFromDialog(page, electronApp, collectionFixturePath!);
    await openfolder(page, COLLECTION_NAME, FOLDER_NAME, { persist: true });
  });

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Vars: URL is plain text (not a link)', async ({ page }) => {
    await selectfolderPaneTab(page, 'vars');
    const cm = buildCommonLocators(page).codeMirror.valueCellAt(settings(page));
    await expectNoLinkMark(cm);
  });

  test('Pre-Request-Script: URL is plain text (not a link)', async ({ page }) => {
    await selectfolderPaneTab(page, 'script');
    const locators = buildCommonLocators(page);
    await locators.paneTabs.tabTrigger('pre-request').click();
    const cm = locators.codeMirror.byTestId('folder-pre-request-script-editor');
    await expectNoLinkMark(cm);
  });

  test('Post-Response-Script: URL is plain text (not a link)', async ({ page }) => {
    await selectfolderPaneTab(page, 'script');
    const locators = buildCommonLocators(page);
    await locators.paneTabs.tabTrigger('post-response').click();
    const cm = locators.codeMirror.byTestId('folder-post-response-script-editor');
    await expectNoLinkMark(cm);
  });

  test('Tests: URL is plain text (not a link)', async ({ page }) => {
    await selectfolderPaneTab(page, 'test');
    const cm = buildCommonLocators(page).codeMirror.within(settings(page));
    await expectNoLinkMark(cm);
  });

  test('Docs (Markdown mode): URL is plain text (not a link)', async ({ page }) => {
    await selectfolderPaneTab(page, 'docs');
    const locators = buildCommonLocators(page);
    await locators.docs.folderDocsEditToggle().click();
    await locators.docs.modeSwitchMarkdown().click();
    await expectNoLinkMark(locators.codeMirror.within(settings(page)));
  });

  test('Docs (Rich Text mode): plain click creates a transient request', async ({ page }) => {
    await selectfolderPaneTab(page, 'docs');
    const link = buildCommonLocators(page).docs.proseMirror().locator(`a[href="${url('folder-docs')}"]`);
    await expectRichTextLinkOpensRequest(page, link, { type: 'http', url: url('folder-docs') });
  });

  test('Docs (Rich Text mode): Cmd/Ctrl+Click opens the link externally', async ({ page }) => {
    await selectfolderPaneTab(page, 'docs');
    const link = buildCommonLocators(page).docs.proseMirror().locator(`a[href="${url('folder-docs')}"]`);
    await expectRichTextLinkOpensExternally(page, link, [LINK_CLICK_MODIFIER]);
  });

  test('Folder Vars: URL is plain text (not a link)', async ({ page }) => {
    await selectfolderPaneTab(page, 'vars');
    const cm = buildCommonLocators(page).codeMirror.valueCellAt(settings(page));
    await expectNoLinkMark(cm);
  });
});
