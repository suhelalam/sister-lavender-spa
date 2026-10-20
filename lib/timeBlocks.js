export const BUSINESS_TIME_ZONE = "America/Chicago";

export function sanitizeTimeBlocks(input) {
  if (!Array.isArray(input)) return [];

  return input
    .map((block, index) => ({
      id: String(block?.id || `block-${Date.now()}-${index}`),
      date: String(block?.date || ""),
      startTime: String(block?.startTime || ""),
      endTime: String(block?.endTime || ""),
      scope: ["services", "categories"].includes(block?.scope) ? block.scope : "all",
      serviceIds: Array.isArray(block?.serviceIds)
        ? [...new Set(block.serviceIds.map(String).filter(Boolean))]
        : [],
      variationIds: Array.isArray(block?.variationIds)
        ? [...new Set(block.variationIds.map(String).filter(Boolean))]
        : [],
      categories: Array.isArray(block?.categories)
        ? [...new Set(block.categories.map(String).filter(Boolean))]
        : [],
      note: String(block?.note || "").trim().slice(0, 120),
    }))
    .filter(
      (block) =>
        /^\d{4}-\d{2}-\d{2}$/.test(block.date) &&
        /^\d{2}:\d{2}$/.test(block.startTime) &&
        /^\d{2}:\d{2}$/.test(block.endTime) &&
        block.startTime < block.endTime &&
        (block.scope === "all" ||
          (block.scope === "services" && block.serviceIds.length > 0) ||
          (block.scope === "categories" && block.categories.length > 0))
    );
}

function getBusinessParts(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type) => parts.find((part) => part.type === type)?.value;
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    minutes: Number(value("hour")) * 60 + Number(value("minute")),
  };
}

function timeToMinutes(value) {
  const [hour, minute] = String(value).split(":").map(Number);
  return hour * 60 + minute;
}

export function findBlockingRule({ startAt, endAt, durationMinutes, serviceIds, serviceCategories }, rules) {
  const start = new Date(startAt);
  const calculatedEnd = endAt
    ? new Date(endAt)
    : new Date(start.getTime() + Math.max(1, Number(durationMinutes) || 30) * 60000);
  if (Number.isNaN(start.getTime()) || Number.isNaN(calculatedEnd.getTime())) return null;

  const startParts = getBusinessParts(start);
  const endParts = getBusinessParts(calculatedEnd);
  const selectedIds = new Set((serviceIds || []).map(String));
  const selectedCategories = new Set((serviceCategories || []).map(String));

  return sanitizeTimeBlocks(rules).find((block) => {
    const appliesToService = block.scope === "all" ||
      (block.scope === "services" &&
        [...block.serviceIds, ...block.variationIds].some((id) => selectedIds.has(id))) ||
      (block.scope === "categories" &&
        block.categories.some((category) => selectedCategories.has(category)));
    if (!appliesToService || block.date !== startParts.date) return false;

    const blockStart = timeToMinutes(block.startTime);
    const blockEnd = timeToMinutes(block.endTime);
    const appointmentEnd =
      endParts.date === startParts.date ? endParts.minutes : 24 * 60;
    return startParts.minutes < blockEnd && appointmentEnd > blockStart;
  }) || null;
}
