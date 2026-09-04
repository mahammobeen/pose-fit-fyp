
const nodemailer = require("nodemailer");

const getTransporter = () => {
  const emailUser = process.env.EMAIL_USER?.trim();
  const emailPassword = process.env.EMAIL_PASSWORD?.trim();

  if (!emailUser || !emailPassword) {
    throw new Error("Email credentials are not configured");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailUser,
      pass: emailPassword,
    },
  });
};

const sendBookingConfirmationEmails = async ({
  user,
  professional,
  appointmentDate,
  appointmentDay,
  appointmentSlot,
}) => {
  const transporter = getTransporter();

  const formattedDate = new Date(
    appointmentDate
  ).toLocaleDateString("en-PK", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const userName =
    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
    "PoseFit User";

  const professionalName =
    `${professional?.firstName || ""} ${professional?.lastName || ""}`.trim() ||
    "PoseFit Professional";

  const userMail = {
    from: `"PoseFit" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: "PoseFit Session Booking Confirmed",

    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #292524; max-width: 600px; margin: 0 auto;">

        <h2 style="color: #059669;">
          PoseFit Booking Confirmed
        </h2>

        <p>Hello ${userName},</p>

        <p>
          Your payment has been successfully completed and
          your PoseFit session has been confirmed.
        </p>

        <h3>Session Details</h3>

        <p>
          <strong>Professional:</strong>
          ${professionalName}
        </p>

        <p>
          <strong>Date:</strong>
          ${formattedDate}
        </p>

        <p>
          <strong>Day:</strong>
          ${appointmentDay}
        </p>

        <p>
          <strong>Time:</strong>
          ${appointmentSlot}
        </p>

        <p>
          You will receive another email approximately
          <strong>30 minutes before your session</strong>
          with your Google Meet joining link.
        </p>

        <p>
          Regards,<br />
          PoseFit Team
        </p>

      </div>
    `,
  };

  const professionalMail = {
    from: `"PoseFit" <${process.env.EMAIL_USER}>`,
    to: professional.email,
    subject: "PoseFit Session Booking Confirmed",

    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #292524; max-width: 600px; margin: 0 auto;">

        <h2 style="color: #059669;">
          PoseFit Booking Confirmed
        </h2>

        <p>Hello ${professionalName},</p>

        <p>
          A user has successfully completed payment and
          booked a PoseFit session with you.
        </p>

        <h3>Session Details</h3>

        <p>
          <strong>User:</strong>
          ${userName}
        </p>

        <p>
          <strong>User Email:</strong>
          ${user.email}
        </p>

        <p>
          <strong>Date:</strong>
          ${formattedDate}
        </p>

        <p>
          <strong>Day:</strong>
          ${appointmentDay}
        </p>

        <p>
          <strong>Time:</strong>
          ${appointmentSlot}
        </p>

        <p>
          You will receive another email approximately
          <strong>30 minutes before the session</strong>
          with your Google Meet joining link.
        </p>

        <p>
          Regards,<br />
          PoseFit Team
        </p>

      </div>
    `,
  };

  await Promise.all([
    transporter.sendMail(userMail),
    transporter.sendMail(professionalMail),
  ]);

  return true;
};

const sendBookingReminderEmails = async ({
  user,
  professional,
  appointmentDate,
  appointmentDay,
  appointmentSlot,
  meetingLink,
}) => {
  const transporter = getTransporter();

  const formattedDate = new Date(
    appointmentDate
  ).toLocaleDateString("en-PK", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const userName =
    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
    "PoseFit User";

  const professionalName =
    `${professional?.firstName || ""} ${professional?.lastName || ""}`.trim() ||
    "PoseFit Professional";

  const userMail = {
    from: `"PoseFit" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: "PoseFit Session Starting Soon - Join Google Meet",

    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #292524; max-width: 600px; margin: 0 auto;">

        <h2 style="color: #059669;">
          Your PoseFit Session Starts Soon
        </h2>

        <p>Hello ${userName},</p>

        <p>
          Your PoseFit session with
          <strong>${professionalName}</strong>
          is starting in approximately 30 minutes.
        </p>

        <h3>Session Details</h3>

        <p>
          <strong>Date:</strong>
          ${formattedDate}
        </p>

        <p>
          <strong>Day:</strong>
          ${appointmentDay}
        </p>

        <p>
          <strong>Time:</strong>
          ${appointmentSlot}
        </p>

        <p>
          <strong>Professional:</strong>
          ${professionalName}
        </p>

        <div style="margin: 25px 0;">
          <a
            href="${meetingLink}"
            style="
              background-color: #059669;
              color: white;
              padding: 12px 22px;
              text-decoration: none;
              border-radius: 6px;
              display: inline-block;
              font-weight: bold;
            "
          >
            Join Google Meet
          </a>
        </div>

        <p>
          Please join the session at the scheduled time.
        </p>

        <p>
          Regards,<br />
          PoseFit Team
        </p>

      </div>
    `,
  };

  const professionalMail = {
    from: `"PoseFit" <${process.env.EMAIL_USER}>`,
    to: professional.email,
    subject: "PoseFit Session Starting Soon - Join Google Meet",

    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #292524; max-width: 600px; margin: 0 auto;">

        <h2 style="color: #059669;">
          Your PoseFit Session Starts Soon
        </h2>

        <p>Hello ${professionalName},</p>

        <p>
          Your PoseFit session with
          <strong>${userName}</strong>
          is starting in approximately 30 minutes.
        </p>

        <h3>Session Details</h3>

        <p>
          <strong>Date:</strong>
          ${formattedDate}
        </p>

        <p>
          <strong>Day:</strong>
          ${appointmentDay}
        </p>

        <p>
          <strong>Time:</strong>
          ${appointmentSlot}
        </p>

        <p>
          <strong>User:</strong>
          ${userName}
        </p>

        <p>
          <strong>User Email:</strong>
          ${user.email}
        </p>

        <div style="margin: 25px 0;">
          <a
            href="${meetingLink}"
            style="
              background-color: #059669;
              color: white;
              padding: 12px 22px;
              text-decoration: none;
              border-radius: 6px;
              display: inline-block;
              font-weight: bold;
            "
          >
            Join Google Meet
          </a>
        </div>

        <p>
          Please join the session at the scheduled time.
        </p>

        <p>
          Regards,<br />
          PoseFit Team
        </p>

      </div>
    `,
  };

  await Promise.all([
    transporter.sendMail(userMail),
    transporter.sendMail(professionalMail),
  ]);

  return true;
};

module.exports = {
  sendBookingConfirmationEmails,
  sendBookingReminderEmails,
};

