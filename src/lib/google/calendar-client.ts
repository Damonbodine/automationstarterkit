import { google, calendar_v3 } from 'googleapis';
import { getSupabaseServerClient } from '@/lib/db/client';
import { decryptToken } from '@/lib/encryption/token-encryption';
import { getUserTimezone } from '@/lib/config/user-preferences';

/**
 * Google Calendar API client wrapper
 */
export class CalendarClient {
  private calendar: calendar_v3.Calendar;
  private userId: string;
  private oauth2Client: any;

  constructor(accessToken: string, userId: string) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    this.oauth2Client.setCredentials({ access_token: accessToken });
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    this.userId = userId;
  }

  /** Create a Calendar client for a user */
  static async forUser(userId: string): Promise<CalendarClient> {
    const supabase = getSupabaseServerClient();
    const { data: user, error } = await supabase
      .from('users')
      .select('google_access_token')
      .eq('id', userId)
      .single();

    if (error || !user?.google_access_token) {
      throw new Error('User not found or no access token available');
    }

    const accessToken = decryptToken(user.google_access_token);
    return new CalendarClient(accessToken, userId);
  }

  /**
   * Check availability for a time slot
   */
  async checkAvailability(
    start: Date,
    end: Date,
    calendarId: string = 'primary'
  ): Promise<boolean> {
    const response = await this.calendar.freebusy.query({
      requestBody: {
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        items: [{ id: calendarId }],
      },
    });

    const busy = response.data.calendars?.[calendarId]?.busy || [];
    return busy.length === 0;
  }

  /**
   * Find available time slots
   */
  async findAvailableSlots(
    startDate: Date,
    endDate: Date,
    durationMinutes: number,
    calendarId: string = 'primary'
  ): Promise<Array<{ start: Date; end: Date }>> {
    const response = await this.calendar.freebusy.query({
      requestBody: {
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        items: [{ id: calendarId }],
      },
    });

    const busyTimes = response.data.calendars?.[calendarId]?.busy || [];
    const availableSlots: Array<{ start: Date; end: Date }> = [];

    // Simple algorithm: find gaps between busy times
    let currentTime = new Date(startDate);

    for (const busy of busyTimes) {
      const busyStart = new Date(busy.start!);

      // If there's a gap before this busy time
      if (currentTime < busyStart) {
        const slotEnd = new Date(currentTime.getTime() + durationMinutes * 60000);

        if (slotEnd <= busyStart) {
          availableSlots.push({
            start: new Date(currentTime),
            end: slotEnd,
          });
        }
      }

      currentTime = new Date(busy.end!);
    }

    // Check if there's time after the last busy slot
    const finalSlotEnd = new Date(currentTime.getTime() + durationMinutes * 60000);
    if (finalSlotEnd <= endDate) {
      availableSlots.push({
        start: new Date(currentTime),
        end: finalSlotEnd,
      });
    }

    return availableSlots;
  }

  /**
   * Create a calendar event
   */
  async createEvent(
    summary: string,
    start: Date,
    end: Date,
    options?: {
      attendees?: string[];
      description?: string;
      location?: string;
      calendarId?: string;
      reminders?: Array<{ method: 'email' | 'popup'; minutes: number }>;
      sendUpdates?: boolean;
    }
  ): Promise<{ eventId: string; eventUrl: string }> {
    const timeZone = await getUserTimezone(this.userId);
    const event: calendar_v3.Schema$Event = {
      summary,
      description: options?.description,
      location: options?.location,
      start: { dateTime: start.toISOString(), timeZone },
      end: { dateTime: end.toISOString(), timeZone },
      attendees: options?.attendees?.map((email) => ({ email })),
      reminders: options?.reminders
        ? {
            useDefault: false,
            overrides: options.reminders,
          }
        : {
            useDefault: true,
          },
    };

    const response = await this.calendar.events.insert({
      calendarId: options?.calendarId || 'primary',
      requestBody: event,
      sendUpdates: options?.sendUpdates !== false ? 'all' : 'none',
    });

    return {
      eventId: response.data.id!,
      eventUrl: response.data.htmlLink!,
    };
  }

  /**
   * Update an existing event
   */
  async updateEvent(
    eventId: string,
    updates: {
      summary?: string;
      start?: Date;
      end?: Date;
      attendees?: string[];
      description?: string;
      location?: string;
    },
    options?: {
      calendarId?: string;
      sendUpdates?: boolean;
    }
  ): Promise<void> {
    const requestBody: calendar_v3.Schema$Event = {};

    if (updates.summary) requestBody.summary = updates.summary;
    if (updates.description) requestBody.description = updates.description;
    if (updates.location) requestBody.location = updates.location;
    if (updates.start) {
      const timeZone = await getUserTimezone(this.userId);
      requestBody.start = {
        dateTime: updates.start.toISOString(),
        timeZone,
      };
    }
    if (updates.end) {
      const timeZone = await getUserTimezone(this.userId);
      requestBody.end = {
        dateTime: updates.end.toISOString(),
        timeZone,
      };
    }
    if (updates.attendees)
      requestBody.attendees = updates.attendees.map((email) => ({ email }));

    await this.calendar.events.patch({
      calendarId: options?.calendarId || 'primary',
      eventId,
      requestBody,
      sendUpdates: options?.sendUpdates !== false ? 'all' : 'none',
    });
  }

  /**
   * Cancel/delete an event
   */
  async cancelEvent(
    eventId: string,
    options?: {
      calendarId?: string;
      sendUpdates?: boolean;
    }
  ): Promise<void> {
    await this.calendar.events.delete({
      calendarId: options?.calendarId || 'primary',
      eventId,
      sendUpdates: options?.sendUpdates !== false ? 'all' : 'none',
    });
  }

  /**
   * Get event details
   */
  async getEvent(
    eventId: string,
    calendarId: string = 'primary'
  ): Promise<calendar_v3.Schema$Event> {
    const response = await this.calendar.events.get({
      calendarId,
      eventId,
    });

    return response.data;
  }

  /**
   * List upcoming events
   */
  async listUpcomingEvents(
    maxResults: number = 10,
    calendarId: string = 'primary'
  ): Promise<calendar_v3.Schema$Event[]> {
    const response = await this.calendar.events.list({
      calendarId,
      timeMin: new Date().toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return response.data.items || [];
  }

  /**
   * List events in a date range
   */
  async listEvents(
    startDate: Date,
    endDate: Date,
    calendarId: string = 'primary'
  ): Promise<calendar_v3.Schema$Event[]> {
    const response = await this.calendar.events.list({
      calendarId,
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    return response.data.items || [];
  }

  /**
   * Check for scheduling conflicts
   */
  async hasConflict(
    start: Date,
    end: Date,
    excludeEventId?: string,
    calendarId: string = 'primary'
  ): Promise<{ hasConflict: boolean; conflictingEvents: calendar_v3.Schema$Event[] }> {
    const events = await this.listEvents(start, end, calendarId);

    const conflictingEvents = events.filter((event) => {
      // Skip if this is the event we're updating
      if (excludeEventId && event.id === excludeEventId) {
        return false;
      }

      const eventStart = new Date(event.start?.dateTime || event.start?.date || '');
      const eventEnd = new Date(event.end?.dateTime || event.end?.date || '');

      // Check for overlap
      return (
        (start >= eventStart && start < eventEnd) ||
        (end > eventStart && end <= eventEnd) ||
        (start <= eventStart && end >= eventEnd)
      );
    });

    return {
      hasConflict: conflictingEvents.length > 0,
      conflictingEvents,
    };
  }
}
