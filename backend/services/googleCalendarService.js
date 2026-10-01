const { google } = require("googleapis");

const getOAuth2Client = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google OAuth credentials are not configured");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

const getGoogleCalendarClient = () => {
  const tokenJson = process.env.GOOGLE_TOKEN_JSON;

  if (!tokenJson) {
    throw new Error(
      "Google Calendar is not connected. GOOGLE_TOKEN_JSON is not configured.",
    );
  }

  let tokens;

  try {
    tokens = JSON.parse(tokenJson);
  } catch (error) {
    throw new Error("Google Calendar token configuration is invalid.");
  }

  if (!tokens.refresh_token) {
    throw new Error(
      "Google Calendar refresh token is missing. Please authorize PoseFit again.",
    );
  }

  const oauth2Client = getOAuth2Client();

  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    scope: tokens.scope,
    token_type: tokens.token_type,
    expiry_date: tokens.expiry_date,
  });

  return google.calendar({
    version: "v3",
    auth: oauth2Client,
  });
};

const createGoogleMeetEvent = async ({
  appointmentDate,
  appointmentSlot,
  user,
  professional,
  notes,
}) => {
  const calendar = await getGoogleCalendarClient();

  if (!appointmentDate) {
    throw new Error("Appointment date is required");
  }

  if (!appointmentSlot) {
    throw new Error("Appointment slot is required");
  }

  const startDate = new Date(appointmentDate);

  if (Number.isNaN(startDate.getTime())) {
    throw new Error("Invalid appointment date");
  }

  const parseTime = (timeString) => {
    if (!timeString) {
      return null;
    }

    const value = timeString.trim();

    const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);

    if (!match) {
      return null;
    }

    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const meridiem = match[3]?.toUpperCase();

    if (minutes < 0 || minutes > 59) {
      return null;
    }

    if (meridiem) {
      if (hours < 1 || hours > 12) {
        return null;
      }

      if (meridiem === "PM" && hours !== 12) {
        hours += 12;
      }

      if (meridiem === "AM" && hours === 12) {
        hours = 0;
      }
    } else if (hours > 23) {
      return null;
    }

    return {
      hours,
      minutes,
    };
  };

  const slotParts = appointmentSlot.split(/\s*-\s*/);

  const startTime = parseTime(slotParts[0]);

  if (!startTime) {
    throw new Error(`Unable to parse appointment slot: ${appointmentSlot}`);
  }

  let endTime = null;

  if (slotParts[1]) {
    endTime = parseTime(slotParts[1]);
  }

  if (!endTime) {
    endTime = {
      hours: startTime.hours + 1,
      minutes: startTime.minutes,
    };
  }

  const start = new Date(startDate);

  start.setHours(startTime.hours, startTime.minutes, 0, 0);

  const end = new Date(startDate);

  end.setHours(endTime.hours, endTime.minutes, 0, 0);

  if (end <= start) {
    end.setDate(end.getDate() + 1);
  }

  const userName =
    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "PoseFit User";

  const professionalName =
    `${professional?.firstName || ""} ${professional?.lastName || ""}`.trim() ||
    "PoseFit Professional";

  const timeZone = process.env.GOOGLE_CALENDAR_TIMEZONE || "Asia/Karachi";

  const event = {
    summary: `PoseFit Session - ${userName} & ${professionalName}`,

    description:
      `PoseFit professional session.\n\n` +
      `User: ${userName}\n` +
      `User Email: ${user?.email || ""}\n` +
      `Professional: ${professionalName}\n` +
      `Professional Email: ${professional?.email || ""}\n` +
      `Appointment Slot: ${appointmentSlot}\n` +
      `Notes: ${notes || "No notes provided"}`,

    start: {
      dateTime: start.toISOString(),
      timeZone,
    },

    end: {
      dateTime: end.toISOString(),
      timeZone,
    },

    attendees: [
      {
        email: user?.email,
        displayName: userName,
      },
      {
        email: professional?.email,
        displayName: professionalName,
      },
    ],

    conferenceData: {
      createRequest: {
        requestId: `posefit-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 10)}`,

        conferenceSolutionKey: {
          type: "hangoutsMeet",
        },
      },
    },

    reminders: {
      useDefault: true,
    },
  };

  const response = await calendar.events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",

    resource: event,

    conferenceDataVersion: 1,

    sendUpdates: "none",
  });

  const createdEvent = response.data;

  const meetingLink =
    createdEvent.hangoutLink ||
    createdEvent.conferenceData?.entryPoints?.find(
      (entry) => entry.entryPointType === "video",
    )?.uri;

  if (!meetingLink) {
    throw new Error("Google Meet link could not be generated");
  }

  return {
    eventId: createdEvent.id,
    meetingLink,
    event: createdEvent,
  };
};

module.exports = {
  getOAuth2Client,
  getGoogleCalendarClient,
  createGoogleMeetEvent,
};

