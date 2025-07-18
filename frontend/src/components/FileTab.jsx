import React from 'react';

const FileTab = ({ file, isActive, onSelect, onClose }) => (
  <div className={`file-tab${isActive ? ' active' : ''}`}>
    <span onClick={onSelect} className="file-tab-name">
      {file.name}
    </span>
    <button onClick={onClose} className="file-tab-close">
      ×
    </button>
  </div>
);

export default FileTab;