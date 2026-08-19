export interface CalendarEventInput {
  title: string;
  startDate: string; // YYYY-MM-DD
  startTime: string | null; // free text, e.g. "10:30 AM" -- no format guarantee
  durationMinutes?: number; // default 30
  location: string | null;
  description: string | null;
}

// appointmentTime has no format guarantee (free text). Falls back to 9:00 AM
// when missing/unparseable -- the .ics format needs *some* time, and a
// business-hours default is an obvious placeholder if wrong, unlike midnight.
function parseTimeToHM(timeStr: string | null): { hour: number; minute: number } {
  const DEFAULT = { hour: 9, minute: 0 };
  if (!timeStr) return DEFAULT;
  const match = timeStr.trim().match(/^(\d{1,2}):?(\d{2})?\s*(AM|PM|am|pm)?$/);
  if (!match) return DEFAULT;

  let hour = parseInt(match[1], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;
  const ampm = match[3]?.toUpperCase();
  if (ampm === 'PM' && hour !== 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return DEFAULT;
  return { hour, minute };
}

export function computeEventRange(input: CalendarEventInput): { start: Date; end: Date } {
  const { hour, minute } = parseTimeToHM(input.startTime);
  const start = new Date(`${input.startDate}T00:00:00`);
  start.setHours(hour, minute, 0, 0);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + (input.durationMinutes ?? 30));
  return { start, end };
}

// Floating local time (no Z, no TZID) -- there's no timezone anywhere in
// this schema (single-office US operation), so a floating time lets every
// calendar app interpret "10:30 AM" in the device's own local zone, which
// is what the person who typed it meant. Converting to UTC would need a
// timezone we don't have.
function toIcsBasic(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
}

function escapeIcs(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function buildIcsFile(id: string, input: CalendarEventInput): string {
  const { start, end } = computeEventRange(input);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//White Pine Portal//BVM Appointments//EN',
    'BEGIN:VEVENT',
    `UID:${id}@whitepineportal`,
    `DTSTAMP:${toIcsBasic(new Date())}`,
    `DTSTART:${toIcsBasic(start)}`,
    `DTEND:${toIcsBasic(end)}`,
    `SUMMARY:${escapeIcs(input.title)}`,
    input.location ? `LOCATION:${escapeIcs(input.location)}` : null,
    input.description ? `DESCRIPTION:${escapeIcs(input.description)}` : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter((line): line is string => line !== null);
  return lines.join('\r\n');
}

export function buildGoogleCalendarUrl(input: CalendarEventInput): string {
  const { start, end } = computeEventRange(input);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: input.title,
    dates: `${toIcsBasic(start)}/${toIcsBasic(end)}`,
  });
  if (input.location) params.set('location', input.location);
  if (input.description) params.set('details', input.description);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
