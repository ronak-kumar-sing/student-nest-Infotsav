/**
 * Google Meet Integration Service
 * Provides meeting creation, joining, and satisfaction rating functionality
 */

import { google } from 'googleapis';

class GoogleMeetService {
  constructor(accessToken) {
    this.auth = new google.auth.OAuth2();
    this.auth.setCredentials({ access_token: accessToken });
    this.calendar = google.calendar({ version: 'v3', auth: this.auth });
  }

  /**
   * Create a new Google Meet session
   * @param {Object} meetingData - Meeting configuration
   * @returns {Object} Meeting details including join URL
   */
  async createMeeting(meetingData = {}) {
    try {
      const {
        title = 'Property Visit Meeting',
        description = 'Virtual property viewing session',
        startTime,
        endTime,
        attendees = []
      } = meetingData;

      // Create calendar event with Google Meet
      const event = {
        summary: title,
        description,
        start: {
          dateTime: startTime || new Date().toISOString(),
          timeZone: 'Asia/Kolkata',
        },
        end: {
          dateTime: endTime || new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour later
          timeZone: 'Asia/Kolkata',
        },
        attendees: attendees.map(email => ({ email })),
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 24 hours before
            { method: 'popup', minutes: 10 }, // 10 minutes before
          ],
        },
      };

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        conferenceDataVersion: 1,
      });

      const meetInfo = response.data.conferenceData?.entryPoints?.find(
        ep => ep.entryPointType === 'video'
      );

      return {
        success: true,
        eventId: response.data.id,
        meetingUri: meetInfo?.uri || response.data.hangoutLink,
        meetingId: response.data.conferenceData?.conferenceId,
        dialIn: response.data.conferenceData?.entryPoints?.find(
          ep => ep.entryPointType === 'phone'
        ),
        eventLink: response.data.htmlLink,
        status: 'created'
      };

    } catch (error) {
      console.error('Google Meet creation failed:', error);
      throw new Error(`Failed to create meeting: ${error.message}`);
    }
  }

  /**
   * Get meeting details by event ID
   */
  async getMeetingDetails(eventId) {
    try {
      const response = await this.calendar.events.get({
        calendarId: 'primary',
        eventId: eventId
      });

      const meetInfo = response.data.conferenceData?.entryPoints?.find(
        ep => ep.entryPointType === 'video'
      );

      return {
        success: true,
        eventId: response.data.id,
        title: response.data.summary,
        description: response.data.description,
        startTime: response.data.start.dateTime,
        endTime: response.data.end.dateTime,
        meetingUri: meetInfo?.uri || response.data.hangoutLink,
        meetingId: response.data.conferenceData?.conferenceId,
        status: response.data.status,
        attendees: response.data.attendees || []
      };
    } catch (error) {
      console.error('Failed to get meeting details:', error);
      throw error;
    }
  }

  /**
   * Update meeting status
   */
  async updateMeetingStatus(eventId, status) {
    try {
      const response = await this.calendar.events.patch({
        calendarId: 'primary',
        eventId: eventId,
        resource: {
          status: status // 'confirmed', 'tentative', 'cancelled'
        }
      });

      return {
        success: true,
        status: response.data.status
      };
    } catch (error) {
      console.error('Failed to update meeting status:', error);
      throw error;
    }
  }

  /**
   * End meeting (mark as completed)
   */
  async endMeeting(eventId) {
    try {
      // Update event description to mark as completed
      const event = await this.calendar.events.get({
        calendarId: 'primary',
        eventId: eventId
      });

      const updatedDescription = `${event.data.description || ''}\n\n[MEETING COMPLETED - ${new Date().toISOString()}]`;

      await this.calendar.events.patch({
        calendarId: 'primary',
        eventId: eventId,
        resource: {
          description: updatedDescription,
          status: 'confirmed'
        }
      });

      return {
        success: true,
        status: 'completed',
        endedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to end meeting:', error);
      throw error;
    }
  }
}

export default GoogleMeetService;
