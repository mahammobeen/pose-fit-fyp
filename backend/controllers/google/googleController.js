const { google } = require("googleapis");

const getOAuth2Client = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google OAuth credentials are not configured");
  }

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );
};

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

    const tokenJson = JSON.stringify(tokens);

    return res.send(`
      <html>
        <head>
          <title>PoseFit Google Calendar</title>
        </head>

        <body style="font-family: Arial; padding: 40px;">
          <h2>Google Calendar Connected Successfully</h2>

          <p>
            Copy the token JSON below and add it to Vercel
            as <strong>GOOGLE_TOKEN_JSON</strong>.
          </p>

          <textarea
            style="
              width: 100%;
              height: 220px;
              font-family: monospace;
              font-size: 14px;
            "
            readonly
          >${tokenJson}</textarea>

          <p>
            After copying the token, close this tab.
          </p>

          <p>
            Do not share this token with anyone.
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
