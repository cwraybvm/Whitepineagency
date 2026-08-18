import { google } from 'googleapis';

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';
const DEFAULT_DURATION_MINUTES = 30;

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CALENDAR_CLIENT_ID,
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET
  );
}

function getCalendarClient() {
  const auth = getOAuthClient();
  auth.setCredentials({ refresh_token: process.env.GOOGLE_CALENDAR_REFRESH_TOKEN });
  return google.calendar({ version: 'v3', auth });
}

export function isGoogleCalendarConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CALENDAR_CLIENT_ID &&
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET &&
    process.env.GOOGLE_CALENDAR_REFRESH_TOKEN
  );
}

interface CalendarEventInput {
  title: string;
  description?: string | null;
  scheduledAt: Date;
  estimatedMinutes?: number | null;
}

function toEventBody({ title, description, scheduledAt, estimatedMinutes }: CalendarEventInput) {
  const end = new Date(scheduledAt.getTime() + (estimatedMinutes || DEFAULT_DURATION_MINUTES) * 60_000);
  return {
    summary: title,
    description: description || undefined,
    start: { dateTime: scheduledAt.toISOString() },
    end: { dateTime: end.toISOString() },
  };
}

export async function createCalendarEvent(input: CalendarEventInput): Promise<string | null> {
  const calendar = getCalendarClient();
  const res = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    requestBody: toEventBody(input),
  });
  return res.data.id ?? null;
}

export async function updateCalendarEvent(eventId: string, input: CalendarEventInput): Promise<void> {
  const calendar = getCalendarClient();
  await calendar.events.patch({
    calendarId: CALENDAR_ID,
    eventId,
    requestBody: toEventBody(input),
  });
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const calendar = getCalendarClient();
  try {
    await calendar.events.delete({ calendarId: CALENDAR_ID, eventId });
  } catch (err: any) {
    // Already gone on Google's side -- not an error from our perspective.
    if (err?.code !== 404 && err?.code !== 410) throw err;
  }
}

interface SyncTaskEventParams {
  existingEventId: string | null;
  shouldSync: boolean;
  title: string;
  description?: string | null;
  scheduledAt: Date | null;
  estimatedMinutes?: number | null;
}

/**
 * Reconciles a task's Google Calendar event with its desired state
 * (scheduled + sync toggle on). Returns the event id that should be
 * persisted on the task (null if no event should exist). Never throws --
 * a Calendar API hiccup must not block saving the task itself.
 */
export async function syncTaskCalendarEvent({
  existingEventId,
  shouldSync,
  scheduledAt,
  ...rest
}: SyncTaskEventParams): Promise<string | null> {
  if (!isGoogleCalendarConfigured()) return existingEventId;
  const wantsEvent = shouldSync && !!scheduledAt;

  try {
    if (wantsEvent && existingEventId) {
      await updateCalendarEvent(existingEventId, { ...rest, scheduledAt: scheduledAt! });
      return existingEventId;
    }
    if (wantsEvent && !existingEventId) {
      return await createCalendarEvent({ ...rest, scheduledAt: scheduledAt! });
    }
    if (!wantsEvent && existingEventId) {
      await deleteCalendarEvent(existingEventId);
      return null;
    }
    return existingEventId;
  } catch (err) {
    console.error('Google Calendar sync failed:', err);
    return existingEventId;
  }
}
