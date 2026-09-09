import React, { useCallback, useMemo } from 'react';
import SingleLineEditor from 'components/SingleLineEditor';
import { toDisplayString } from '@usebruno/common/utils';
import ScopeBadge from './ScopeBadge';

const READ_ONLY_SCOPES = ['process.env', 'runtime', 'dynamic', 'oauth2', 'undefined'];

const VariableRow = ({ name, scopeInfo, collection, item, onSave, showScope = true }) => {
  const isReadOnly = READ_ONLY_SCOPES.includes(scopeInfo?.type) || !!scopeInfo?.inheritedFrom;
  const rawValue = scopeInfo?.value;

  const displayValue = useMemo(() => {
    return typeof rawValue === 'string' ? rawValue : toDisplayString(rawValue, '');
  }, [rawValue]);

  const handleChange = useCallback((newValue) => {
    if (isReadOnly || !onSave) return;
    onSave(newValue);
  }, [isReadOnly, onSave]);

  return (
    <div className="vp-row" data-testid={`vp-row-${name}`}>
      <div className="vp-row-name" title={name}>
        {showScope && <ScopeBadge type={scopeInfo?.type} />}
        <span className="vp-row-name-text">{name}</span>
      </div>
      <div className="vp-value" onContextMenu={(e) => e.preventDefault()}>
        <SingleLineEditor
          collection={collection}
          item={item}
          value={displayValue}
          readOnly={isReadOnly}
          onChange={handleChange}
          enableBrunoVarInfo
        />
      </div>
    </div>
  );
};

export default VariableRow;
