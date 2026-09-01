const cron = require("node-cron");
const PaymentModel = require("../models/paymentModel");
const { sendBookingReminderEmails } = require("./emailService");

const TIMEZONE = "Asia/Karachi";
const REMINDER_MINUTES = 30;

const parseAppointmentStart = (appointmentDate, appointmentSlot) => {
  if (!appointmentDate || !appointmentSlot) {
    return null;
  }

  const originalDate = new Date(appointmentDate);

  if (Number.isNaN(originalDate.getTime())) {
    return null;
  }

  const firstSlot = appointmentSlot
    .split(/\s*-\s*/)
    .map((value) => value.trim())[0];

  const match = firstSlot.match(
    /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i
  );

  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();

  if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
    return null;
  }

  if (meridiem === "PM" && hours !== 12) {
    hours += 12;
  }

  if (meridiem === "AM" && hours === 12) {
    hours = 0;
  }

  const dateParts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(originalDate);

  const year = Number(
    dateParts.find((part) => part.type === "year")?.value
  );

  const month = Number(
    dateParts.find((part) => part.type === "month")?.value
  );

  const day = Number(
    dateParts.find((part) => part.type === "day")?.value
  );

  if (!year || !month || !day) {
    return null;
  }

  const pakistanTimeOffset = 5 * 60 * 60 * 1000;

  return new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      hours,
      minutes,
      0,
      0
    ) - pakistanTimeOffset
  );
};

const processBookingReminders = async () => {
  try {
    const now = new Date();

    const payments = await PaymentModel.find({
      status: "completed",
      meetingLink: {
        $exists: true,
        $ne: "",
      },
      meetingReminderSent: false,
      appointmentDate: {
        $exists: true,
        $ne: null,
      },
      appointmentSlot: {
        $exists: true,
        $ne: "",
      },
    })
      .populate("user", "firstName lastName email")
      .populate("professional", "firstName lastName email");

    for (const payment of payments) {
      try {
        const appointmentStart = parseAppointmentStart(
          payment.appointmentDate,
          payment.appointmentSlot
        );

        if (!appointmentStart) {
          console.error(
            `Unable to parse appointment time for payment ${payment._id}`
          );
          continue;
        }

        const reminderTime = new Date(
          appointmentStart.getTime() -
            REMINDER_MINUTES * 60 * 1000
        );

        if (now >= appointmentStart) {
          continue;
        }

        if (now < reminderTime) {
          continue;
        }

        if (
          !payment.user?.email ||
          !payment.professional?.email ||
          !payment.meetingLink
        ) {
          console.error(
            `Missing reminder email data for payment ${payment._id}`
          );
          continue;
        }

        try {
          await sendBookingReminderEmails({
            user: payment.user,
            professional: payment.professional,
            appointmentDate: payment.appointmentDate,
            appointmentDay: payment.appointmentDay,
            appointmentSlot: payment.appointmentSlot,
            meetingLink: payment.meetingLink,
          });

          const updatedPayment =
            await PaymentModel.findOneAndUpdate(
              {
                _id: payment._id,
                status: "completed",
                meetingReminderSent: false,
              },
              {
                $set: {
                  meetingReminderSent: true,
                },
              },
              {
                returnDocument: "after",
              }
            );

          if (updatedPayment) {
            console.log(
              `Meeting reminder emails sent for payment ${payment._id}`
            );
          }
        } catch (emailError) {
          console.error(
            `Meeting reminder email failed for payment ${payment._id}:`,
            emailError
          );
        }
      } catch (bookingError) {
        console.error(
          `Error processing reminder for payment ${payment._id}:`,
          bookingError
        );
      }
    }
  } catch (error) {
    console.error(
      "Booking reminder scheduler error:",
      error
    );
  }
};

const startBookingReminderScheduler = () => {
  processBookingReminders().catch((error) => {
    console.error(
      "Initial booking reminder check failed:",
      error
    );
  });

  cron.schedule(
    "* * * * *",
    async () => {
      await processBookingReminders();
    },
    {
      timezone: TIMEZONE,
    }
  );

  console.log(
    "Booking reminder scheduler started."
  );
};

module.exports = {
  startBookingReminderScheduler,
  processBookingReminders,
};