import React from 'react';

const FileList = ({ files, onOpen }) => (
  <div className="file-list">
    <h4>Files</h4>
    <ul>
      {files.map(file => (
        <li key={file.id}>
          <button onClick={() => onOpen(file.id)}>{file.name}</button>
        </li>
      ))}
    </ul>
  </div>
);

export default FileList;