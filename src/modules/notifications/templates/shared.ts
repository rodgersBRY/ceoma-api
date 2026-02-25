function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDateOnly(value: string | Date | null | undefined): string {
  if (!value) {
    return "N/A";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toISOString().slice(0, 10);
}

function toRow(label: string, value: string): string {
  return `<tr><td style="padding:6px 10px;border:1px solid #e5e7eb;background:#f8fafc;font-weight:600;">${escapeHtml(label)}</td><td style="padding:6px 10px;border:1px solid #e5e7eb;">${escapeHtml(value)}</td></tr>`;
}

export function renderTemplate(
  title: string,
  intro: string,
  rows: Array<{ label: string; value: string }>,
): string {
  const rowsHtml = rows.map((row) => toRow(row.label, row.value)).join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.45;">
      <h2 style="margin:0 0 8px;">${escapeHtml(title)}</h2>
      <p style="margin:0 0 12px;">${escapeHtml(intro)}</p>
      <table style="border-collapse:collapse;border-spacing:0;min-width:420px;">${rowsHtml}</table>
    </div>
  `;
}

export { escapeHtml, formatDateOnly };
