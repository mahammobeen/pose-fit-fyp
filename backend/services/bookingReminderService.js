const cron = require("node-cron");
const PaymentModel = require("../models/paymentModel");
const { sendBookingReminderEmails } = require("./emailService");

const parseAppointmentStart = (appointmentDate, appointmentSlot) => {
  if (!appointmentDate || !appointmentSlot) {
    return null;
  }

  const date = new Date(appointmentDate);

  if (Number.isNaN(date.getTime())) {
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
  }

  date.setHours(hours, minutes, 0, 0);

  return date;
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
      },
      appointmentSlot: {
        $exists: true,
        $ne: "",
      },
    })
      .populate("user", "firstName lastName email")
      .populate(
        "professional",
        "firstName lastName email"
      );

    for (const payment of payments) {
      const appointmentStart = parseAppointmentStart(
        payment.appointmentDate,
        payment.appointmentSlot
      );

      if (!appointmentStart) {
        continue;
      }

      const reminderTime = new Date(
        appointmentStart.getTime() - 30 * 60 * 1000
      );

      const reminderWindowEnd = new Date(
        reminderTime.getTime() + 60 * 1000
      );

      if (
        now >= reminderTime &&
        now < reminderWindowEnd
      ) {
        try {
          await sendBookingReminderEmails({
            user: payment.user,
            professional: payment.professional,
            appointmentDate: payment.appointmentDate,
            appointmentDay: payment.appointmentDay,
            appointmentSlot: payment.appointmentSlot,
            meetingLink: payment.meetingLink,
          });

          payment.meetingReminderSent = true;

          await payment.save();

          console.log(
            `Meeting reminder emails sent for payment ${payment._id}`
          );
        } catch (emailError) {
          console.error(
            `Meeting reminder email failed for payment ${payment._id}:`,
            emailError
          );
        }
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
  cron.schedule(
    "* * * * *",
    async () => {
      await processBookingReminders();
    },
    {
      timezone: "Asia/Karachi",
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