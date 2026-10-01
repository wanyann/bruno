import { closeConsole, openConsole, setActiveTab } from 'providers/ReduxStore/slices/logs';

/**
 * Toggles the in-app Devtools Console panel.
 *
 * - Console panel open on the Console tab → closes the panel.
 * - Panel open on another tab (Network/Performance/Terminal/…) → switches to Console.
 * - Panel closed → opens it and selects the Console tab.
 *
 * @param {Function} dispatch - Redux dispatch function
 * @param {Object} state - { isConsoleOpen: boolean, activeTab: string }
 */
export const toggleDevtoolsConsole = (dispatch, { isConsoleOpen, activeTab }) => {
  if (isConsoleOpen && activeTab === 'console') {
    dispatch(closeConsole());
    return;
  }

  dispatch(setActiveTab('console'));
  if (!isConsoleOpen) {
    dispatch(openConsole());
  }
};
