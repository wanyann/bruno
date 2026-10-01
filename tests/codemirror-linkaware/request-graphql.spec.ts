import { expect, Page, test } from '../../playwright';
import { buildCommonLocators, closeAllCollections, LINK_AWARE_COLLECTION_NAME as COLLECTION_NAME, expectLinkOpensExternally, expectLinkOpensRequest, expectNoLinkMark, expectRichTextLinkOpensExternally, expectRichTextLinkOpensRequest, LINK_CLICK_MODIFIER, openCollectionFromDialog, openRequest, selectRequestPaneTab, selectScriptSubTab } from '../utils/page';

const pane = (page: Page) => buildCommonLocators(page).request.pane();
const url = (path: string) => `http://link-aware.test/${path}`;

const openVariablesPanel = async (page: Page) => {
  await buildCommonLocators(page).request.pane().getByRole('button', { name: 'Variables' }).click();
};

test.describe('CodeMirror link-aware - GraphQL request tab', () => {
  test.beforeEach(async ({ page, electronApp, collectionFixturePath }) => {
    await openCollectionFromDialog(page, electronApp, collectionFixturePath!);
    await openRequest(page, COLLECTION_NAME, 'graphql-request');
    await selectRequestPaneTab(page, 'Query');
  });

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('URL Bar: plain click does not open a request; Cmd/Ctrl+Click opens it externally', async ({ page }) => {
    const cm = buildCommonLocators(page).request.urlInput();
    const link = cm.locator('.CodeMirror-link').first();
    await expect(link).toBeVisible();

    await link.click();
    await expect(cm).toContainClass('CodeMirror-focused');

    await expectLinkOpensExternally(page, cm);
  });

  test('Query editor: plain click opens a transient GraphQL request', async ({ page }) => {
    const cm = buildCommonLocators(page).codeMirror.within(pane(page));
    await expectLinkOpensRequest(page, cm, { type: 'graphql', url: url('graphql-query') });
  });

  test('Variables: URL is plain text (not a link)', async ({ page }) => {
    await openVariablesPanel(page);
    const cm = pane(page).locator('.CodeMirror').last();
    await expectNoLinkMark(cm);
  });

  test('Vars: URL is plain text (not a link)', async ({ page }) => {
    await selectRequestPaneTab(page, 'Vars');
    const cm = buildCommonLocators(page).codeMirror.valueCellAt(pane(page));
    await expectNoLinkMark(cm);
  });

  test('Pre-Request-Script: URL is plain text (not a link)', async ({ page }) => {
    await selectScriptSubTab(page, 'pre-request');
    const cm = buildCommonLocators(page).codeMirror.byTestId('pre-request-script-editor');
    await expectNoLinkMark(cm);
  });

  test('Post-Response-Script: URL is plain text (not a link)', async ({ page }) => {
    await selectScriptSubTab(page, 'post-response');
    const cm = buildCommonLocators(page).codeMirror.byTestId('post-response-script-editor');
    await expectNoLinkMark(cm);
  });

  test('Tests: URL is plain text (not a link)', async ({ page }) => {
    await selectRequestPaneTab(page, 'Tests');
    const cm = buildCommonLocators(page).codeMirror.byTestId('test-script-editor');
    await expectNoLinkMark(cm);
  });

  test('Docs (Markdown mode): URL is plain text (not a link)', async ({ page }) => {
    await selectRequestPaneTab(page, 'Docs');
    const locators = buildCommonLocators(page);
    await locators.docs.editToggle().click();
    await locators.docs.modeSwitchMarkdown().click();
    await expectNoLinkMark(locators.codeMirror.within(pane(page)));
  });

  test('Docs (Rich Text mode): plain click opens a transient GraphQL request', async ({ page }) => {
    await selectRequestPaneTab(page, 'Docs');
    const link = buildCommonLocators(page).docs.proseMirror().locator(`a[href="${url('graphql-docs')}"]`);
    await expectRichTextLinkOpensRequest(page, link, { type: 'graphql', url: url('graphql-docs') });
  });

  test('Docs (Rich Text mode): Cmd/Ctrl+Click opens the link externally', async ({ page }) => {
    await selectRequestPaneTab(page, 'Docs');
    const link = buildCommonLocators(page).docs.proseMirror().locator(`a[href="${url('graphql-docs')}"]`);
    await expectRichTextLinkOpensExternally(page, link, [LINK_CLICK_MODIFIER]);
  });
});
