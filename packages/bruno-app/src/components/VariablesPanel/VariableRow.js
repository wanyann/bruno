import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import SingleLineEditor from 'components/SingleLineEditor';
import { toDisplayString } from '@usebruno/common/utils';
import ScopeBadge from './ScopeBadge';

const READ_ONLY_SCOPES = ['process.env', 'runtime', 'dynamic', 'oauth2', 'undefined'];

const hasNoScope = (scopeInfo) => !scopeInfo || !scopeInfo.type || scopeInfo.type === 'undefined' || scopeInfo.type === 'none';

const AddToMenu = ({ openUp, options, onSelect, onClose }) => {
  const ref = useRef(null);

  useEffect(() => {
    const onDocDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div ref={ref} className={`vp-add-menu ${openUp ? 'vp-add-menu-up' : 'vp-add-menu-down'}`}>
      <div className="vp-add-menu-title">Add to</div>
      {options.map((opt) => (
        <button
          key={opt.scope}
          type="button"
          className="vp-add-menu-item"
          onClick={() => onSelect(opt.scope)}
          disabled={opt.disabled}
        >
          <ScopeBadge type={opt.scope} />
          <span className="vp-add-menu-label">{opt.label}</span>
        </button>
      ))}
    </div>
  );
};

const VariableRow = ({
  name,
  scopeInfo,
  collection,
  item,
  onSave,
  showScope = true,
  addToEnabled = false,
  addToOptions = [],
  onAddToScope
}) => {
  const hasScope = !hasNoScope(scopeInfo);
  const isSecret = !!scopeInfo?.secret || !!scopeInfo?.data?.variable?.secret;
  const isReadOnly = READ_ONLY_SCOPES.includes(scopeInfo?.type) || !!scopeInfo?.inheritedFrom;
  const rawValue = scopeInfo?.value;

  const fullValue = useMemo(() => {
    return typeof rawValue === 'string' ? rawValue : toDisplayString(rawValue, '');
  }, [rawValue]);

  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(fullValue);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const addWrapRef = useRef(null);
  const textareaRef = useRef(null);

  const valueIsEmpty = fullValue === '' || fullValue === null || fullValue === undefined;

  const useSingleLine = isSecret || isReadOnly;

  // SingleLineEditor (secrets / read-only values)
  const handleScopeChange = useCallback((newValue) => {
    if (isReadOnly || !onSave) return;
    onSave(newValue);
  }, [isReadOnly, onSave]);

  // Multi-line editable textarea (all other rows)
  const handleTextareaChange = useCallback((e) => {
    const next = e.target.value;
    setDraft(next);
    onSave?.(next);
  }, [onSave]);

  const handleTextareaBlur = useCallback(() => {
    setFocused(false);
    if (onSave) onSave(draft);
  }, [draft, onSave]);

  // Auto-grow the textarea to fit its content while editing (multi-line wrap allowed).
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${ta.scrollHeight}px`;
    }
  }, [draft, focused, useSingleLine]);

  // Bring focus into the editor/textarea whenever the row enters edit mode.
  useEffect(() => {
    if (focused && !useSingleLine && textareaRef.current) {
      const ta = textareaRef.current;
      ta.focus();
      const len = ta.value.length;
      try {
        ta.setSelectionRange(len, len);
      } catch {}
    }
  }, [focused, useSingleLine]);

  const handleValueClick = useCallback((e) => {
    // Don't hijack clicks on the '+' button or the add-to menu.
    if (e.target.closest('.vp-add-btn, .vp-add-menu')) return;
    if (isReadOnly) return;
    if (useSingleLine) {
      // Click anywhere in the value cell should focus the CodeMirror editor.
      const input = e.currentTarget.querySelector('.CodeMirror textarea, .CodeMirror input, .CodeMirror-scroll');
      if (input && !input.contains(e.target)) {
        input.focus();
      }
      return;
    }
    if (focused) {
      // Already editing: focus the textarea and move the caret to the end.
      const ta = textareaRef.current;
      if (ta && e.target !== ta && !ta.contains(e.target)) {
        ta.focus();
        const len = ta.value.length;
        try {
          ta.setSelectionRange(len, len);
        } catch {}
      }
      return;
    }
    // Not editing yet: enter edit mode with the full value.
    setDraft(fullValue);
    setFocused(true);
  }, [isReadOnly, useSingleLine, focused, fullValue]);

  return (
    <div className="vp-row" data-testid={`vp-row-${name}`}>
      <div className="vp-row-name" title={name}>
        {showScope && <ScopeBadge type={scopeInfo?.type} />}
        <span className="vp-row-name-text">{name}</span>
      </div>
      <div className="vp-value" onContextMenu={(e) => e.preventDefault()} onClick={handleValueClick}>
        <div className="vp-value-inner">
          {useSingleLine ? (
            <SingleLineEditor
              collection={collection}
              item={item}
              value={fullValue}
              readOnly={isReadOnly}
              placeholder={valueIsEmpty ? 'No value' : undefined}
              onChange={handleScopeChange}
              enableBrunoVarInfo
            />
          ) : focused ? (
            <textarea
              ref={textareaRef}
              className="vp-textarea"
              rows={1}
              value={draft}
              readOnly={isReadOnly}
              placeholder="No value"
              onChange={handleTextareaChange}
              onBlur={handleTextareaBlur}
              spellCheck={false}
            />
          ) : (
            <div
              className={`vp-trunc${valueIsEmpty ? ' vp-trunc-empty' : ''}`}
              onClick={() => {
                if (isReadOnly) return;
                setDraft(fullValue);
                setFocused(true);
              }}
              title={fullValue}
            >
              {valueIsEmpty ? 'No value' : fullValue}
            </div>
          )}
        </div>
        {addToEnabled && !hasScope && (
          <div className="vp-add-wrap" ref={addWrapRef}>
            <button
              type="button"
              className="vp-add-btn"
              onClick={() => {
                const rect = addWrapRef.current?.getBoundingClientRect();
                const spaceBelow = window.innerHeight - (rect?.bottom ?? 0);
                const estimateHeight = 4 + 36 + 4 + addToOptions.length * 34 + 8;
                setOpenUp(spaceBelow < estimateHeight);
                setMenuOpen((v) => !v);
              }}
              title="Add to scope"
              data-testid="vp-add-btn"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            {menuOpen && (
              <AddToMenu
                openUp={openUp}
                options={addToOptions}
                onSelect={(scope) => {
                  setMenuOpen(false);
                  onAddToScope?.(name, scope);
                }}
                onClose={() => setMenuOpen(false)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VariableRow;
