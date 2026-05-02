import React from "react";

function AttachmentList({ attachments }) {
  if (!attachments || attachments.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <h4 className="font-bold text-slate-800 text-base mb-2 flex items-center gap-2">
        <span>📎</span>
        Attachments
      </h4>
      <ul className="space-y-2 pl-1">
        {attachments.map((att) => (
          <li key={att.id}>
            <a
              href={`/api/attachments/${att.file_path}`}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              <span>⬇️</span>
              <span>{att.file_name}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AttachmentList;

function AttachmentList({ attachments }) {
  if (!attachments || attachments.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <h4 className="font-bold text-slate-800 text-base mb-2 flex items-center gap-2">
        <PaperClipIcon className="h-5 w-5 text-slate-500"/>
        Attachments
      </h4>
      <ul className="space-y-2 pl-1">
        {attachments.map((att) => (
          <li key={att.id}>
            <a
              href={`/api/attachments/${att.file_path}`}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              <ArrowDownTrayIcon className="h-4 w-4 text-slate-400 group-hover:text-blue-700"/>
              <span>{att.file_name}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AttachmentList;
