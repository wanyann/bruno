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
  const isReadOnly = READ_ONLY_SCOPES.includes(scopeInfo?.type) || !!scopeInfo?.inheritedFrom;
  const noScope = hasNoScope(scopeInfo);
  const rawValue = scopeInfo?.value;

  const displayValue = useMemo(() => {
    return typeof rawValue === 'string' ? rawValue : toDisplayString(rawValue, '');
  }, [rawValue]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const addWrapRef = useRef(null);

  const handleChange = useCallback((newValue) => {
    if (isReadOnly || !onSave) return;
    onSave(newValue);
  }, [isReadOnly, onSave]);

  const handleAddClick = useCallback(() => {
    const rect = addWrapRef.current?.getBoundingClientRect();
    const spaceBelow = window.innerHeight - (rect?.bottom ?? 0);
    const estimateHeight = 4 + 36 + 4 + addToOptions.length * 34 + 8;
    setOpenUp(spaceBelow < estimateHeight);
    setMenuOpen((v) => !v);
  }, [addToOptions.length]);

  const handleSelect = useCallback(
    (scope) => {
      setMenuOpen(false);
      onAddToScope?.(name, scope);
    },
    [name, onAddToScope]
  );

  const valueIsEmpty = displayValue === '' || displayValue === null || displayValue === undefined;

  return (
    <div className="vp-row" data-testid={`vp-row-${name}`}>
      <div className="vp-row-name" title={name}>
        {showScope && <ScopeBadge type={scopeInfo?.type} />}
        <span className="vp-row-name-text">{name}</span>
      </div>
      <div className="vp-value" onContextMenu={(e) => e.preventDefault()}>
        <div className="vp-value-inner">
          <SingleLineEditor
            collection={collection}
            item={item}
            value={displayValue}
            readOnly={isReadOnly}
            onChange={handleChange}
            enableBrunoVarInfo
          />
          {valueIsEmpty && <span className="vp-value-placeholder">No value</span>}
        </div>
        {addToEnabled && noScope && (
          <div className="vp-add-wrap" ref={addWrapRef}>
            <button
              type="button"
              className="vp-add-btn"
              onClick={handleAddClick}
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
                onSelect={handleSelect}
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
