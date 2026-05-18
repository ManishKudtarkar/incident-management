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
