import React from "react";

function AttachmentList({ attachments }) {
  if (!attachments || attachments.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <h4 className="font-bold text-gray-900 text-base mb-2">Attachments</h4>
      <ul className="space-y-2">
        {attachments.map((att) => (
          <li key={att.id} className="flex items-center gap-2">
            <a
              href={`/api/attachments/${att.file_path}`}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:underline"
            >
              {att.file_name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AttachmentList;
