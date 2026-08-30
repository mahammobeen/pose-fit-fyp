import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { httpClient } from "../../lib/http";
import { toast } from "sonner";
import UserLayout from "../../components/user/UserLayout";
import {
  IconCheckCircle,
  IconClock,
  IconCalendar,
} from "../../components/admin/Icons";

const DAYS_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function sortAvailability(availability = []) {
  return [...availability].sort(
    (a, b) => DAYS_ORDER.indexOf(a.day) - DAYS_ORDER.indexOf(b.day),
  );
}

function getImageUrl(image) {
  if (!image) return null;

  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  if (image.startsWith("/")) {
    return `http://localhost:4000${image}`;
  }

  return `http://localhost:4000/${image}`;
}

function getNextDateForDay(day) {
  const dayIndex = DAYS_ORDER.indexOf(day);

  if (dayIndex === -1) return null;

  const today = new Date();
  const todayIndex = (today.getDay() + 6) % 7;

  let daysUntil = dayIndex - todayIndex;

  if (daysUntil < 0) {
    daysUntil += 7;
  }

  const result = new Date(today);
  result.setDate(today.getDate() + daysUntil);
  result.setHours(0, 0, 0, 0);

  return result;
}

function formatDateForApi(date) {
  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function normalizeDate(date) {
  if (!date) return "";

  if (typeof date === "string") {
    return date.slice(0, 10);
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return formatDateForApi(parsedDate);
}

function parseSlotTime(slot) {
  if (!slot || typeof slot !== "string") return null;

  const value = slot.trim().toLowerCase();

  const match = value.match(
    /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?(?:\s*-\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?$/,
  );

  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridiem = match[3];

  if (meridiem) {
    if (hour < 1 || hour > 12 || minute > 59) {
      return null;
    }

    if (meridiem === "am") {
      if (hour === 12) hour = 0;
    } else if (hour !== 12) {
      hour += 12;
    }
  } else if (hour > 23 || minute > 59) {
    return null;
  }

  return {
    hour,
    minute,
  };
}

function getSlotEndTime(slot) {
  if (!slot || typeof slot !== "string") return null;

  const parts = slot.split("-");

  if (parts.length < 2) {
    return parseSlotTime(slot);
  }

  const endPart = parts[1].trim();
  const startPart = parts[0].trim();

  const start = parseSlotTime(startPart);
  const end = parseSlotTime(endPart);

  if (!start || !end) return null;

  const startHasMeridiem = /am|pm/i.test(startPart);
  const endHasMeridiem = /am|pm/i.test(endPart);

  if (!endHasMeridiem && startHasMeridiem) {
    const meridiemMatch = startPart.match(/(am|pm)/i);

    if (meridiemMatch) {
      const meridiem = meridiemMatch[1].toLowerCase();

      let hour = Number(
        endPart.match(/^(\d{1,2})/)?.[1] || end.hour,
      );

      const minute = Number(
        endPart.match(/:(\d{2})/)?.[1] || end.minute,
      );

      if (meridiem === "am") {
        if (hour === 12) hour = 0;
      } else if (hour !== 12) {
        hour += 12;
      }

      return {
        hour,
        minute,
      };
    }
  }

  return end;
}

function getAppointmentDateTime(date, slot) {
  if (!date || !slot) return null;

  const startTime = parseSlotTime(slot);

  if (!startTime) return null;

  const appointmentDate = new Date(date);

  if (Number.isNaN(appointmentDate.getTime())) {
    return null;
  }

  appointmentDate.setHours(
    startTime.hour,
    startTime.minute,
    0,
    0,
  );

  return appointmentDate;
}

function isBookingStillActive(booking) {
  if (!booking) return false;

  const status = String(booking.status || "").toLowerCase();

  if (!["pending", "completed"].includes(status)) {
    return false;
  }

  if (!booking.appointmentDate || !booking.appointmentSlot) {
    return false;
  }

  const appointmentStart = getAppointmentDateTime(
    booking.appointmentDate,
    booking.appointmentSlot,
  );

  if (!appointmentStart) {
    return true;
  }

  return appointmentStart.getTime() > Date.now();
}

export default function ProfessionalDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [pro, setPro] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookedSlots, setBookedSlots] = useState([]);

  const [showBooking, setShowBooking] = useState(false);
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [notes, setNotes] = useState("");

  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingCancelled, setBookingCancelled] = useState(false);

  const fetchPublicProfile = async () => {
    try {
      setLoading(true);

      const response = await httpClient.get(
        `/user/public-professionals/${id}`,
      );

      setPro(response.data?.professional || null);
    } catch (error) {
      console.error("Professional profile error:", error);

      setPro(null);

      toast.error(
        error?.response?.data?.message ||
          "Failed to load professional profile.",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchBookedSlots = async () => {
    try {
      const response = await httpClient.get(
        `/payment/booked-slots/${id}`,
      );

      setBookedSlots(response.data?.bookedSlots || []);
    } catch (error) {
      console.error("Booked slots error:", error);
      setBookedSlots([]);
    }
  };

  useEffect(() => {
    fetchPublicProfile();
    fetchBookedSlots();
  }, [id]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);

    const bookingSuccessParam = params.get("booking_success");
    const bookingCancelledParam = params.get("booking_cancelled");

    if (bookingSuccessParam === "true") {
      setBookingSuccess(true);
      setBookingCancelled(false);

      toast.success("Booking confirmed successfully!");

      fetchBookedSlots();

      navigate(location.pathname, {
        replace: true,
      });

      return;
    }

    if (bookingCancelledParam === "true") {
      setBookingCancelled(true);
      setBookingSuccess(false);

      toast.error("Payment was cancelled.");

      fetchBookedSlots();

      navigate(location.pathname, {
        replace: true,
      });
    }
  }, [location.search, location.pathname, navigate]);

  const availability = sortAvailability(pro?.availability || []);

  const isSlotBooked = (day, slot, appointmentDate = null) => {
    const targetDate = normalizeDate(appointmentDate);

    return bookedSlots.some((booking) => {
      if (!isBookingStillActive(booking)) {
        return false;
      }

      const bookingDay =
        booking.appointmentDay?.trim().toLowerCase() || "";

      const bookingSlot =
        booking.appointmentSlot?.trim().toLowerCase() || "";

      const bookingDate = normalizeDate(booking.appointmentDate);

      const sameDay =
        bookingDay === day?.trim().toLowerCase();

      const sameSlot =
        bookingSlot === slot?.trim().toLowerCase();

      if (!sameDay || !sameSlot) {
        return false;
      }

      if (targetDate) {
        return bookingDate === targetDate;
      }

      return true;
    });
  };

  const getAvailableSlots = (day) => {
    const dayData = availability.find(
      (item) =>
        item.day?.trim().toLowerCase() ===
        day?.trim().toLowerCase(),
    );

    if (!dayData) return [];

    const appointmentDate = getNextDateForDay(day);

    return (dayData.slots || []).filter(
      (slot) => !isSlotBooked(day, slot, appointmentDate),
    );
  };

  const openBooking = async () => {
    await fetchBookedSlots();

    setSelectedDay("");
    setSelectedSlot("");
    setNotes("");
    setBookingSuccess(false);
    setBookingCancelled(false);
    setShowBooking(true);
  };

  const closeBooking = () => {
    if (bookingLoading) return;

    setShowBooking(false);
    setSelectedDay("");
    setSelectedSlot("");
    setNotes("");
  };

  const handleConfirmBooking = async () => {
    if (!selectedDay) {
      toast.error("Please select a day.");
      return;
    }

    if (!selectedSlot) {
      toast.error("Please select a time slot.");
      return;
    }

    if (!pro?._id) {
      toast.error("Professional information is missing.");
      return;
    }

    if (!pro?.sessionFee) {
      toast.error("Session fee is not available.");
      return;
    }

    const appointmentDate = getNextDateForDay(selectedDay);
    const formattedAppointmentDate =
      formatDateForApi(appointmentDate);

    if (!appointmentDate || !formattedAppointmentDate) {
      toast.error("Invalid appointment date.");
      return;
    }

    if (
      isSlotBooked(
        selectedDay,
        selectedSlot,
        formattedAppointmentDate,
      )
    ) {
      toast.error(
        "This session has already been booked. Please select another slot.",
      );

      setSelectedSlot("");
      await fetchBookedSlots();
      return;
    }

    try {
      setBookingLoading(true);

      await fetchBookedSlots();

      if (
        isSlotBooked(
          selectedDay,
          selectedSlot,
          formattedAppointmentDate,
        )
      ) {
        toast.error(
          "This session was just booked by another user. Please select another slot.",
        );

        setSelectedSlot("");
        return;
      }

      const response = await httpClient.post("/payment/create", {
        professionalId: pro._id,
        amount: Number(pro.sessionFee),
        appointmentDay: selectedDay,
        appointmentSlot: selectedSlot,
        appointmentDate: formattedAppointmentDate,
        sessionDuration: 1,
        notes: notes.trim(),
      });

      const checkoutUrl = response.data?.checkoutUrl;

      if (!checkoutUrl) {
        throw new Error(
          "Payment checkout URL was not returned.",
        );
      }

      window.location.href = checkoutUrl;
    } catch (error) {
      console.error("Booking error:", error);

      if (error?.response?.status === 401) {
        localStorage.removeItem("pose-fit");

        toast.error("Please login to book a session.");

        navigate("/user/login", {
          state: {
            from: location,
          },
        });

        return;
      }

      if (error?.response?.status === 409) {
        toast.error(
          error?.response?.data?.message ||
            "This appointment session is no longer available.",
        );

        setSelectedSlot("");
        await fetchBookedSlots();

        return;
      }

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to initiate booking payment.",
      );

      await fetchBookedSlots();
    } finally {
      setBookingLoading(false);
    }
  };

  const selectedDayData = availability.find(
    (item) =>
      item.day?.trim().toLowerCase() ===
      selectedDay?.trim().toLowerCase(),
  );

  const daySlots = selectedDayData?.slots || [];
  const profilePhoto = getImageUrl(pro?.profilePhoto);

  const selectedAppointmentDate =
    getNextDateForDay(selectedDay);

  const selectedAppointmentDateString =
    formatDateForApi(selectedAppointmentDate);

  if (loading) {
    return (
      <UserLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
        </div>
      </UserLayout>
    );
  }

  if (!pro) {
    return (
      <UserLayout>
        <div className="pb-20">
          <div className="px-8 pt-8">
            <button
              onClick={() =>
                navigate("/user/professionals")
              }
              className="rounded-xl border border-stone-200 bg-stone-100 px-4 py-2 text-xs font-bold text-stone-700 transition-colors hover:bg-stone-200"
            >
              ← Back to Directory
            </button>
          </div>

          <div className="mx-auto mt-12 max-w-4xl px-8 text-center">
            <div className="rounded-3xl border border-stone-200 bg-white p-12 shadow-xs">
              <p className="mb-1 text-xl font-extrabold text-stone-800">
                Professional Not Found
              </p>

              <p className="text-sm font-medium text-stone-400">
                The requested professional profile is not
                available.
              </p>
            </div>
          </div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className="pb-20">
        <div className="flex items-center justify-between gap-4 px-8 pb-4 pt-8">
          <span className="rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-emerald-800">
            Professional Details
          </span>

          <button
            onClick={() =>
              navigate("/user/professionals")
            }
            className="rounded-xl border border-stone-200 bg-stone-100 px-4 py-2 text-xs font-bold text-stone-700 transition-colors hover:bg-stone-200"
          >
            ← Back to Directory
          </button>
        </div>

        {bookingSuccess && (
          <div className="mx-auto mb-6 max-w-5xl px-8">
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <IconCheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />

              <div>
                <p className="text-sm font-bold text-emerald-900">
                  Booking Confirmed!
                </p>

                <p className="mt-0.5 text-xs font-medium text-emerald-700">
                  Your payment was successful. The
                  professional will be in touch to confirm
                  your session details.
                </p>
              </div>
            </div>
          </div>
        )}

        {bookingCancelled && (
          <div className="mx-auto mb-6 max-w-5xl px-8">
            <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <span className="text-lg text-amber-600">
                !
              </span>

              <p className="text-sm font-medium text-amber-900">
                Payment was cancelled. You can try booking
                again anytime.
              </p>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-5xl space-y-6 px-8">
          <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-xs">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="flex items-start gap-5">
                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt={`${pro.firstName || ""} ${
                      pro.lastName || ""
                    }`}
                    className="h-24 w-24 shrink-0 rounded-3xl border border-stone-200 object-cover shadow-xs"
                    onError={(event) => {
                      event.currentTarget.style.display =
                        "none";
                    }}
                  />
                ) : (
                  <div
                    className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl text-3xl font-black text-white shadow-xs"
                    style={{
                      background:
                        "linear-gradient(135deg, #10b981, #059669)",
                    }}
                  >
                    {pro.firstName
                      ?.charAt(0)
                      ?.toUpperCase() || "P"}
                  </div>
                )}

                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-black text-stone-900">
                      {pro.firstName} {pro.lastName}
                    </h1>

                    <span className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                      <IconCheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                      PoseFit Certified
                    </span>
                  </div>

                  <p className="mt-1 text-sm font-bold text-stone-500">
                    {pro.professionalType || "Trainer"} •{" "}
                    {pro.specialization ||
                      "General Fitness"}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <div className="rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-1.5 text-xs font-extrabold text-stone-800">
                      {pro.rating?.count > 0 ? (
                        <span>
                          Rating:{" "}
                          {Number(
                            pro.rating?.average || 0,
                          ).toFixed(1)}{" "}
                          ({pro.rating.count})
                        </span>
                      ) : (
                        <span className="text-amber-700">
                          New Professional
                        </span>
                      )}
                    </div>

                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-black text-emerald-800">
                      $
                      {Number(
                        pro.sessionFee || 0,
                      ).toFixed(2)}{" "}
                      / session
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={openBooking}
                disabled={
                  !pro.sessionFee ||
                  availability.length === 0
                }
                className="rounded-2xl px-8 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background:
                    "linear-gradient(135deg, #10b981, #059669)",
                }}
              >
                Book a Session
              </button>
            </div>

            {pro.bio && (
              <div className="mt-8 border-t border-stone-100 pt-6">
                <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-stone-400">
                  About & Philosophy
                </h3>

                <p className="text-sm font-medium leading-relaxed text-stone-700">
                  {pro.bio}
                </p>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-xs">
            <h3 className="mb-4 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-stone-400">
              <IconCalendar className="h-4 w-4 text-emerald-600" />
              Weekly Availability Schedule
            </h3>

            {availability.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {availability.map((item) => (
                  <div
                    key={item.day}
                    className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
                  >
                    <p className="mb-2 text-sm font-extrabold text-stone-800">
                      {item.day}
                    </p>

                    <div className="flex flex-wrap gap-1.5">
                      {item.slots?.length > 0 ? (
                        item.slots.map((slot) => {
                          const appointmentDate =
                            getNextDateForDay(item.day);

                          const booked = isSlotBooked(
                            item.day,
                            slot,
                            appointmentDate,
                          );

                          return (
                            <span
                              key={slot}
                              className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-bold ${
                                booked
                                  ? "border-red-200 bg-red-50 text-red-500"
                                  : "border-stone-200 bg-white text-stone-700"
                              }`}
                            >
                              <IconClock
                                className={`h-3 w-3 ${
                                  booked
                                    ? "text-red-400"
                                    : "text-stone-400"
                                }`}
                              />

                              {slot}

                              {booked && (
                                <span className="ml-1 text-[9px] font-black uppercase">
                                  Booked
                                </span>
                              )}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-xs text-stone-400">
                          No slots
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-medium text-stone-400">
                No availability schedule published yet.
              </p>
            )}
          </div>
        </div>

        {showBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div
              className="w-full max-w-lg overflow-y-auto rounded-3xl border border-stone-200 bg-white shadow-2xl"
              style={{
                maxHeight: "92vh",
              }}
            >
              <div className="flex items-start justify-between border-b border-stone-100 p-6">
                <div>
                  <h2 className="text-lg font-black text-stone-800">
                    Book a Session
                  </h2>

                  <p className="mt-0.5 text-xs font-medium text-stone-500">
                    with{" "}
                    <span className="font-bold text-stone-700">
                      {pro.firstName} {pro.lastName}
                    </span>{" "}
                    ($
                    {Number(
                      pro.sessionFee || 0,
                    ).toFixed(2)}{" "}
                    per session)
                  </p>
                </div>

                <button
                  onClick={closeBooking}
                  disabled={bookingLoading}
                  className="text-xl font-bold leading-none text-stone-400 transition-colors hover:text-stone-700 disabled:opacity-40"
                >
                  ×
                </button>
              </div>

              <div className="space-y-5 p-6">
                <div>
                  <label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-stone-500">
                    Step 1: Choose a Day
                  </label>

                  {availability.length === 0 ? (
                    <p className="text-xs font-medium text-stone-400">
                      No availability slots configured by
                      this professional yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {availability.map((item) => {
                        const availableSlots =
                          getAvailableSlots(item.day);

                        return (
                          <button
                            key={item.day}
                            type="button"
                            disabled={
                              availableSlots.length === 0
                            }
                            onClick={() => {
                              setSelectedDay(item.day);
                              setSelectedSlot("");
                            }}
                            className={`rounded-xl border px-2 py-2.5 text-xs font-bold transition-all ${
                              selectedDay === item.day
                                ? "border-emerald-600 bg-emerald-600 text-white shadow-md"
                                : availableSlots.length ===
                                    0
                                ? "cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400"
                                : "border-stone-200 bg-stone-50 text-stone-700 hover:border-emerald-300 hover:bg-emerald-50"
                            }`}
                          >
                            {item.day.slice(0, 3)}

                            <span className="mt-0.5 block text-[10px] font-medium opacity-70">
                              {availableSlots.length ===
                              0
                                ? "Fully booked"
                                : `${availableSlots.length} slots`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {selectedDay && (
                  <div>
                    <label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-stone-500">
                      Step 2: Choose a Time Slot for{" "}
                      {selectedDay}
                    </label>

                    {daySlots.length === 0 ? (
                      <p className="text-xs font-medium text-stone-400">
                        No time slots available for{" "}
                        {selectedDay}.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {daySlots.map((slot) => {
                          const booked =
                            isSlotBooked(
                              selectedDay,
                              slot,
                              selectedAppointmentDateString,
                            );

                          return (
                            <button
                              key={slot}
                              type="button"
                              disabled={booked}
                              onClick={() => {
                                if (!booked) {
                                  setSelectedSlot(slot);
                                }
                              }}
                              className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-bold transition-all ${
                                booked
                                  ? "cursor-not-allowed border-red-200 bg-red-50 text-red-400"
                                  : selectedSlot === slot
                                  ? "border-emerald-600 bg-emerald-600 text-white shadow-md"
                                  : "border-stone-200 bg-stone-50 text-stone-700 hover:border-emerald-300 hover:bg-emerald-50"
                              }`}
                            >
                              <IconClock
                                className={`h-4 w-4 shrink-0 ${
                                  booked
                                    ? "text-red-400"
                                    : selectedSlot ===
                                      slot
                                    ? "text-white"
                                    : "text-stone-400"
                                }`}
                              />

                              <span>{slot}</span>

                              {booked && (
                                <span className="ml-auto text-[10px] font-black uppercase">
                                  Unavailable
                                </span>
                              )}

                              {selectedSlot === slot &&
                                !booked && (
                                  <IconCheckCircle className="ml-auto h-4 w-4 text-white" />
                                )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {selectedSlot && (
                  <div>
                    <label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-stone-500">
                      Step 3: Notes (Optional)
                    </label>

                    <textarea
                      rows={3}
                      maxLength={500}
                      placeholder="Any specific goals, injuries to be aware of, or questions for your professional..."
                      value={notes}
                      onChange={(event) =>
                        setNotes(event.target.value)
                      }
                      className="w-full resize-none rounded-xl border border-stone-200 px-3.5 py-2.5 text-xs font-medium text-stone-800 outline-none focus:ring-2 focus:ring-emerald-300"
                    />

                    <p className="mt-1 text-right text-[10px] text-stone-400">
                      {notes.length}/500
                    </p>
                  </div>
                )}

                {selectedDay && selectedSlot && (
                  <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-wide text-emerald-800">
                        Booking Summary
                      </p>

                      <p className="mt-1 text-sm font-bold text-stone-800">
                        {selectedDay} at {selectedSlot}
                      </p>

                      <p className="mt-0.5 text-xs font-medium text-stone-500">
                        with {pro.firstName} {pro.lastName}
                      </p>

                      <p className="mt-1 text-xs font-medium text-stone-500">
                        Date:{" "}
                        {selectedAppointmentDate?.toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </p>
                    </div>

                    <p className="text-xl font-black text-emerald-800">
                      $
                      {Number(
                        pro.sessionFee || 0,
                      ).toFixed(2)}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeBooking}
                    disabled={bookingLoading}
                    className="flex-1 rounded-2xl border border-stone-200 bg-stone-100 py-3 text-sm font-bold text-stone-700 transition-colors hover:bg-stone-200 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmBooking}
                    disabled={
                      !selectedDay ||
                      !selectedSlot ||
                      bookingLoading ||
                      !pro.sessionFee ||
                      isSlotBooked(
                        selectedDay,
                        selectedSlot,
                        selectedAppointmentDateString,
                      )
                    }
                    className="flex-1 rounded-2xl py-3 text-sm font-bold text-white shadow-md transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      background:
                        "linear-gradient(135deg, #10b981, #059669)",
                    }}
                  >
                    {bookingLoading
                      ? "Redirecting to Payment..."
                      : !selectedDay
                      ? "Select a Day"
                      : !selectedSlot
                      ? "Select a Time Slot"
                      : isSlotBooked(
                          selectedDay,
                          selectedSlot,
                          selectedAppointmentDateString,
                        )
                      ? "Slot Unavailable"
                      : "Confirm & Pay →"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </UserLayout>
  );
}

