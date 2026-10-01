import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  .collection-switcher {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .header-actions {
    min-width: 0;
    overflow-x: auto;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }

    > * {
      flex-shrink: 0;
    }
  }

  .switcher-trigger {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: ${(props) => props.theme.colors.text.muted};
    cursor: pointer;
    font-weight: 400;
    transition: background-color 0.15s ease, color 0.15s ease;

    &:hover {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
      color: ${(props) => props.theme.text};
    }

    .switcher-name {
      white-space: nowrap;

      &.scratch-collection {
        font-weight: 400;
      }
    }

    .tab-count {
      font-size: 11px;
      font-weight: 500;
      padding: 1px 6px;
      border-radius: 10px;
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
      min-width: 18px;
      text-align: center;
    }
  }

  .tab-breadcrumb {
    white-space: nowrap;
  }

  .breadcrumb-group {
    flex-shrink: 0;
  }

  .breadcrumb-separator {
    color: ${(props) => props.theme.colors.text.muted};
    margin: 0;
    user-select: none;
  }

  .breadcrumb-folder {
    border: none;
    background: transparent;
    padding: 4px 8px;
    margin: 0;
    border-radius: 4px;
    font: inherit;
    font-weight: 400;
    color: ${(props) => props.theme.colors.text.muted};
    cursor: pointer;
    white-space: nowrap;
    transition: background-color 0.15s ease, color 0.15s ease;

    &:hover {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
      color: ${(props) => props.theme.text};
    }
  }

  .breadcrumb-tab-name {
    font-weight: 600;
    color: rgb(203, 166, 247);
    white-space: nowrap;
    padding: 4px 8px;
  }

  .workspace-actions-trigger {
    cursor: pointer;
    opacity: 0.6;
    padding: 4px;
    border-radius: 4px;
    transition: opacity 0.15s ease, background-color 0.15s ease;

    &:hover {
      opacity: 1;
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    }
  }

  .workspace-rename-container {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
  }

  .workspace-input-wrapper {
    display: flex;
    align-items: center;
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: 3px;
    background: ${(props) => props.theme.input.bg};
    min-width: 150px;

    &:focus-within {
      border-color: ${(props) => props.theme.input.focusBorder};
    }
  }

  .workspace-name-input {
    font-size: 13px;
    font-weight: 400;
    padding: 2px 6px;
    border: none;
    background: transparent;
    color: ${(props) => props.theme.text};
    outline: none;
    flex: 1;
    min-width: 0;
  }

  .cog-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 22px;
    height: 100%;
    border: none;
    cursor: pointer;
    background: transparent;
    color: ${(props) => props.theme.text};
    opacity: 0.5;

    &:hover {
      opacity: 1;
    }
  }

  .inline-actions {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .inline-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    background: transparent;
    color: ${(props) => props.theme.text};

    &:hover {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    }

    &.save {
      color: ${(props) => props.theme.colors.text.green};
    }

    &.cancel {
      color: ${(props) => props.theme.colors.text.danger};
    }
  }

  .workspace-error {
    font-size: 12px;
    color: ${(props) => props.theme.colors.text.danger};
    margin-left: 8px;
  }

  .migrate-yml-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 4px 2px 8px;
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: 999px;
    background: transparent;
    color: ${(props) => props.theme.text};
    font-size: 12px;
    line-height: 1;
    transition: background-color 0.15s ease;

    &:hover {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    }

    .pill-main {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0;
      border: none;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: pointer;
    }

    .pill-label {
      font-weight: 500;
    }

    .pill-dismiss {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      padding: 0;
      border: none;
      border-radius: 50%;
      background: transparent;
      color: inherit;
      cursor: pointer;
      opacity: 0.6;
      transition: opacity 0.15s ease, background-color 0.15s ease;

      &:hover {
        opacity: 1;
        background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
      }
    }
  }

  .display-icon{
    padding: 4px;
    box-sizing: content-box;
    &:hover {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
      border-radius: ${(props) => props.theme.border.radius.sm}
    }
  }

  .mode-toggle {
    display: inline-flex;
    align-items: stretch;
    background: transparent;

    > * + * .mode-btn,
    .mode-btn + .mode-btn {
      margin-left: -1px;
    }

    .mode-btn {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 26px;
      padding: 0;
      border: 1px solid ${(props) => props.theme.input.border};
      background: transparent;
      color: ${(props) => props.theme.colors.text.muted};
      border-radius: 0;
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;

      &:hover:not(.active) {
        color: ${(props) => props.theme.text};
        z-index: 1;
      }

      &.active {
        background: ${(props) => rgba(props.theme.primary.solid, 0.12)};
        color: ${(props) => props.theme.primary.solid};
        border-color: ${(props) => rgba(props.theme.primary.solid, 0.4)};
        z-index: 2;
      }
    }

    > *:first-child .mode-btn {
      border-top-left-radius: ${(props) => props.theme.border.radius.sm};
      border-bottom-left-radius: ${(props) => props.theme.border.radius.sm};
    }

    > *:last-child .mode-btn {
      border-top-right-radius: ${(props) => props.theme.border.radius.sm};
      border-bottom-right-radius: ${(props) => props.theme.border.radius.sm};
    }
  }

  .variables-panel-toggle-btn {
    transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;

    &:hover {
      background: rgba(167, 139, 250, 0.35);
      box-shadow: 0 0 0 2px rgba(167, 139, 250, 0.4);
    }

    &.is-open:hover {
      background: rgba(166, 173, 200, 0.15);
      box-shadow: 0 0 0 2px rgba(166, 173, 200, 0.3);
    }
  }
`;

export default StyledWrapper;
