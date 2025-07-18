import React from 'react';
import FileTab from './FileTab';

const EditorTabs = ({ files, activeFileId, onSelect, onClose }) => (
  <div className="editor-tabs">
    {files.map(file => (
      <FileTab
        key={file.id}
        file={file}
        isActive={file.id === activeFileId}
        onSelect={() => onSelect(file.id)}
        onClose={e => {
          e.stopPropagation();
          onClose(file.id);
        }}
      />
    ))}
  </div>
);

export default EditorTabs;