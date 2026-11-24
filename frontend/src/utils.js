const parse = (iso) => new Date(`${iso}T00:00:00`);

// "Fri, 28 Nov"
export const fmtDay = (iso) => parse(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

// "28 Nov 2026"
export const fmtDate = (value) =>
  new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

// "28 Nov, 3:40 pm"
export const fmtDateTime = (value) =>
  new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export const returnLabel = (days) => (days > 0 ? `${days}-Day Returns` : "No Returns");
