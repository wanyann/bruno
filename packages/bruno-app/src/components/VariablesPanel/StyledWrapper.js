import styled from 'styled-components';

const StyledWrapper = styled.div`
  flex-shrink: 0;
  height: 100%;
  position: relative;

  .variables-panel {
    width: 100%;
    height: 100%;
    background: ${(props) => props.theme.bg};
    color: ${(props) => props.theme.text};
    border-left: 1px solid ${(props) => props.theme.border.border1};
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .variables-panel-resize-handle {
    position: absolute;
    top: 0;
    left: -3px;
    width: 6px;
    height: 100%;
    display: flex;
    justify-content: center;
    cursor: col-resize;
    z-index: 5;

    .drag-border {
      width: 1px;
      height: 100%;
      border-left: solid 1px transparent;
    }

    &:hover .drag-border {
      border-left-color: ${(props) => props.theme.sidebar.dragbar.border};
    }
  }

  .vp-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
    height: 30px;
    flex-shrink: 0;
    border-bottom: 1px solid ${(props) => props.theme.border.border1};

    .vp-header-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 500;
      font-size: 13px;
    }

    .vp-close-btn {
      border: none;
      background: transparent;
      cursor: pointer;
      color: ${(props) => props.theme.colors.text.muted};
      padding: 2px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;

      &:hover {
        color: ${(props) => props.theme.primary.text};
      }
    }
  }

  .vp-scroll {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 8px 0 12px;
  }

  .vp-section-header {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    border: none;
    background: transparent;
    cursor: pointer;
    padding: 8px 12px;
    color: ${(props) => props.theme.text};
    font-weight: 500;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.03em;

    .vp-section-chevron {
      transition: transform 0.15s ease;
      color: ${(props) => props.theme.colors.text.muted};
    }

    &.expanded .vp-section-chevron {
      transform: rotate(90deg);
    }

    &.non-collapsible {
      cursor: default;
    }

    .vp-section-count {
      margin-left: auto;
      color: ${(props) => props.theme.colors.text.muted};
      font-size: 11px;
      font-weight: 400;
    }
  }

  .vp-group-title {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 12px 12px 4px;
    font-size: 11px;
    font-weight: 600;
    color: ${(props) => props.theme.colors.text.muted};
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .vp-empty {
    padding: 2px 12px 8px;
    color: ${(props) => props.theme.colors.text.muted};
    font-size: 12px;
  }

  .vp-table {
    margin: 4px 12px 8px;
    border-top: 1px solid rgba(128, 128, 128, 0.2);
    border-bottom: 1px solid rgba(128, 128, 128, 0.2);
    background: linear-gradient(
      to right,
      transparent 0,
      transparent 42%,
      rgba(128, 128, 128, 0.2) 42%,
      rgba(128, 128, 128, 0.2) calc(42% + 1px),
      transparent calc(42% + 1px),
      transparent 100%
    );

    > :not(:last-child) {
      border-bottom: 1px solid rgba(128, 128, 128, 0.2);
    }
  }

  .vp-row {
    display: flex;
    align-items: center;

    .vp-row-name {
      flex: 0 0 42%;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: ${(props) => props.theme.text};
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      padding: 6px 8px;
      box-sizing: border-box;

      .vp-row-name-text {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .vp-value {
      flex: 1;
      min-width: 0;
      padding: 4px 8px;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      gap: 4px;

      .vp-value-inner {
        position: relative;
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: center;

        .vp-trunc {
          flex: 1;
          min-width: 0;
          font-size: 12px;
          line-height: 1.4;
          color: ${(props) => props.theme.text};
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          cursor: text;
        }

        .vp-trunc-empty {
          color: ${(props) => props.theme.colors.text.muted};
          opacity: 0.6;
        }

        .vp-textarea {
          flex: 1;
          min-width: 0;
          width: 100%;
          box-sizing: border-box;
          border: none;
          background: transparent;
          color: ${(props) => props.theme.text};
          font-size: 12px;
          line-height: 1.4;
          font-family: inherit;
          padding: 0;
          resize: none;
          outline: none;

          &::placeholder {
            color: ${(props) => props.theme.colors.text.muted};
            opacity: 0.6;
          }
        }

        // Keep native placeholders right-aligned with the value text (smaller left indent).
        .cm-editor .CodeMirror-placeholder,
        .CodeMirror .CodeMirror-placeholder {
          left: 0 !important;
          color: ${(props) => props.theme.colors.text.muted};
          opacity: 0.6;
        }
      }
    }

    .vp-add-wrap {
      position: relative;
      flex-shrink: 0;
      display: flex;
      align-items: center;
    }

    .vp-add-btn {
      flex-shrink: 0;
      width: 18px;
      height: 18px;
      border: none;
      background: transparent;
      border-radius: 4px;
      color: ${(props) => props.theme.colors.text.muted};
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;

      &:hover {
        background: ${(props) => props.theme.colors.text.muted}22;
        color: ${(props) => props.theme.primary.text};
      }
    }

    .vp-add-menu {
      position: absolute;
      right: 0;
      min-width: 190px;
      padding: 4px;
      background: ${(props) => props.theme.sidebar.bg || props.theme.bg};
      border: 1px solid ${(props) => props.theme.border.border1};
      border-radius: 6px;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
      z-index: 50;
      display: flex;
      flex-direction: column;

      &.vp-add-menu-down {
        top: calc(100% + 4px);
      }

      &.vp-add-menu-up {
        bottom: calc(100% + 4px);
      }

      .vp-add-menu-title {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        color: ${(props) => props.theme.colors.text.muted};
        padding: 4px 8px 6px;
      }

      .vp-add-menu-item {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        border: none;
        background: transparent;
        color: ${(props) => props.theme.text};
        font-size: 12px;
        padding: 5px 8px;
        border-radius: 4px;
        text-align: left;
        cursor: pointer;

        &:hover:not(:disabled) {
          background: ${(props) => props.theme.colors.text.muted}22;
        }

        &:disabled {
          opacity: 0.5;
          cursor: default;
        }

        .vp-add-menu-label {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    }
  }

  .row-action-btn {
    flex-shrink: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    color: ${(props) => props.theme.colors.text.muted};
    padding: 2px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;

    &:hover {
      color: ${(props) => props.theme.primary.text};
    }
  }
`;

export default StyledWrapper;
