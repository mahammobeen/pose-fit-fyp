const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

const TOKEN_PATH = path.join(
  __dirname,
  "../../google-token.json"
);

const getOAuth2Client = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Google OAuth credentials are not configured"
    );
  }

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );
};

// Start Google OAuth authorization
const googleAuth = async (req, res) => {
  try {
    const oauth2Client = getOAuth2Client();

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/calendar",
      ],
    });

    return res.redirect(authUrl);
  } catch (error) {
    console.error("Google auth error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to start Google authorization",
      error: error.message,
    });
  }
};

// Google OAuth callback
const googleCallback = async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).send(
        "Google authorization code was not provided."
      );
    }

    const oauth2Client = getOAuth2Client();

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return res.status(400).send(
        "Google did not return a refresh token. Please authorize again."
      );
    }

    fs.writeFileSync(
      TOKEN_PATH,
      JSON.stringify(tokens, null, 2)
    );

    return res.send(`
      <html>
        <head>
          <title>PoseFit Google Calendar</title>
        </head>

        <body style="font-family: Arial; padding: 40px;">
          <h2>Google Calendar Connected Successfully</h2>

          <p>
            PoseFit can now create Google Calendar events
            and Google Meet links.
          </p>

          <p>
            You can close this tab.
          </p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error(
      "Google OAuth callback error:",
      error
    );

    return res.status(500).send(`
      <h2>Google Calendar Authorization Failed</h2>
      <p>${error.message}</p>
    `);
  }
};

module.exports = {
  googleAuth,
  googleCallback,
};