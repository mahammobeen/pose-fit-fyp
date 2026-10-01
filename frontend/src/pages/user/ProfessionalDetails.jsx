import { useState, useEffect } from "react";

import { useParams, useNavigate, useLocation } from "react-router-dom";

import { httpClient } from "../../lib/http";

import { toast } from "sonner";

import UserLayout from "../../components/user/UserLayout";

import {
  CheckCircle,
  Clock,
  Calendar,
  Star,
} from "lucide-react";

const DAYS_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function sortAvailability(availability = []) {
  return [...availability].sort(
    (a, b) => DAYS_ORDER.indexOf(a.day) - DAYS_ORDER.indexOf(b.day),
  );
}

function getSlotStartDateTime(dateInput, slot) {
  if (!dateInput || !slot || typeof slot !== "string") return null;

  const dateStr =
    typeof dateInput === "string"
      ? dateInput.slice(0, 10)
      : formatDateForApi(dateInput);

  const parts = dateStr.split("-").map(Number);

  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;

  const [year, month, day] = parts;

  const slotParts = slot.split("-").map((p) => p.trim());
  const startPart = slotParts[0];
  const endPart = slotParts[1] || "";

  const match = startPart.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);

  if (!match) return null;

  let hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  let meridiem = match[3]?.toLowerCase();

  if (!meridiem && endPart) {
    const endMatch = endPart.match(/(am|pm)/i);

    if (endMatch) {
      meridiem = endMatch[1].toLowerCase();
    }
  }

  if (meridiem) {
    if (meridiem === "pm" && hour < 12) {
      hour += 12;
    } else if (meridiem === "am" && hour === 12) {
      hour = 0;
    }
  }

  const result = new Date(year, month - 1, day, hour, minute, 0, 0);

  return Number.isNaN(result.getTime()) ? null : result;
}

function isSlotTimePassed(dateInput, slot) {
  const slotStart = getSlotStartDateTime(dateInput, slot);

  if (!slotStart) return false;

  return slotStart.getTime() <= Date.now();
}

function getUpcomingAvailableDates(availability, count = 14) {
  if (!availability || availability.length === 0) return [];

  const availableDaysMap = new Set(
    availability.map((item) => item.day?.trim().toLowerCase()),
  );

  const dates = [];
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 60 && dates.length < count; i++) {
    const d = new Date(today);

    d.setDate(today.getDate() + i);

    const dayName = DAY_NAMES[d.getDay()];

    if (availableDaysMap.has(dayName.toLowerCase())) {
      dates.push({
        dateString: formatDateForApi(d),
        dayName,
        dateObj: d,
        isToday: i === 0,
      });
    }
  }

  return dates;
}

function getImageUrl(image) {
  if (!image) return null;

  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  const baseURL =
    import.meta.env.VITE_BASE_URL || "http://localhost:4000/api";

  const backendURL = baseURL.replace(/\/api\/?$/, "");

  if (image.startsWith("/")) {
    return `${backendURL}${image}`;
  }

  return `${backendURL}/${image}`;
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

function formatExperience(years) {
  const n = Number(years);

  if (
    years === undefined ||
    years === null ||
    years === "" ||
    isNaN(n) ||
    n < 0
  ) {
    return null;
  }

  return n === 1 ? "1 Year" : `${n} Years`;
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
  return getSlotStartDateTime(date, slot);
}

function isBookingStillActive(booking) {
  if (!booking) return false;

  const status = String(booking.status || "").toLowerCase();

  if (status !== "completed") {
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
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [notes, setNotes] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingCancelled, setBookingCancelled] = useState(false);
  const [bookingPending, setBookingPending] = useState(false);
  const [paymentReceipt, setPaymentReceipt] = useState(null);
  const [proReviews, setProReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [pendingEligibleSessions, setPendingEligibleSessions] = useState([]);
  const [myRating, setMyRating] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [userRating, setUserRating] = useState(5);
  const [userHoverRating, setUserHoverRating] = useState(0);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  const fetchPublicProfile = async () => {
    try {
      setLoading(true);

      const response = await httpClient.get(
        `/user/public-professionals/${id}`,
      );

      setPro(response.data?.professional || null);
    } catch (error) {
      console.error("Professional profile error:", error);
      toast.error("Failed to load professional profile.");
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

  const fetchProReviews = async () => {
    const proId = id || pro?._id || pro?.id;

    if (!proId) return;

    try {
      setReviewsLoading(true);

      const [revRes, pendingRes] = await Promise.all([
        httpClient.get(`/reviews/professional/${proId}`),
        httpClient.get("/reviews/pending-ratings").catch(() => ({
          data: {
            pendingSessions: [],
          },
        })),
      ]);

      const reviewsList = revRes.data?.reviews || [];

      setProReviews(reviewsList);

      const storedUser = localStorage.getItem("pose-fit-user");

      let currentUserId = null;

      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          currentUserId = parsed?._id || parsed?.id;
        } catch (e) {
          console.error(e);
        }
      }

      const existingMyRating = reviewsList.find(
        (r) =>
          currentUserId &&
          (r.user?._id?.toString() === currentUserId.toString() ||
            r.user?.toString() === currentUserId.toString()),
      );

      setMyRating(existingMyRating || null);

      const pending = pendingRes.data?.pendingSessions || [];

      const forThisPro = pending.filter(
        (s) =>
          s.professional?._id?.toString() === proId?.toString() ||
          s.professional?.toString() === proId?.toString(),
      );

      setPendingEligibleSessions(forThisPro);

      if (revRes.data?.averageRating !== undefined) {
        setPro((prev) =>
          prev
            ? {
                ...prev,
                rating: {
                  average: revRes.data.averageRating,
                  count: revRes.data.ratingCount,
                },
              }
            : prev,
        );
      }
    } catch (error) {
      console.error("Fetch pro reviews error:", error);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleRateProfessional = async (e) => {
    e.preventDefault();

    const proId = id || pro?._id || pro?.id;

    if (!userRating || userRating < 1 || userRating > 5) {
      toast.error("Please choose a rating between 1 and 5 stars.");
      return;
    }

    const targetSessionId = pendingEligibleSessions[0]?._id;

    try {
      setRatingSubmitting(true);

      const res = await httpClient.post("/reviews/professional", {
        reviewType: "PROFESSIONAL",
        professionalId: proId,
        paymentId: targetSessionId,
        rating: userRating,
      });

      toast.success(
        res.data?.message || "Rating submitted successfully!",
      );

      setShowRatingModal(false);
      setUserRating(5);

      if (res.data?.averageRating !== undefined) {
        setPro((prev) =>
          prev
            ? {
                ...prev,
                rating: {
                  average: res.data.averageRating,
                  count: res.data.ratingCount,
                },
              }
            : prev,
        );
      }

      await fetchProReviews();
    } catch (error) {
      console.error("Rating error:", error);

      if (error?.response?.status === 401) {
        toast.error("Please login to rate this professional.");

        navigate("/user/login", {
          state: {
            from: location,
          },
        });
      } else {
        toast.error(
          error?.response?.data?.message ||
            "You can rate this professional after completing a scheduled session.",
        );
      }
    } finally {
      setRatingSubmitting(false);
    }
  };

  useEffect(() => {
    fetchPublicProfile();
    fetchBookedSlots();
    fetchProReviews();
  }, [id]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);

    const bookingSuccessParam = params.get("booking_success");
    const bookingCancelledParam = params.get("booking_cancelled");
    const sessionId = params.get("session_id");

    if (bookingSuccessParam === "true") {
      if (!sessionId) {
        toast.info("Payment session details not found.");

        navigate(location.pathname, {
          replace: true,
        });

        return;
      }

      let isCancelled = false;
      let timerId = null;
      let attempts = 0;

      const MAX_ATTEMPTS = 10;
      const POLL_INTERVAL = 2000;

      setBookingPending(true);
      setBookingCancelled(false);
      setBookingSuccess(false);

      const pollSessionStatus = async () => {
        try {
          const res = await httpClient.get(
            `/payment/verify-session?session_id=${sessionId}`,
          );

          if (isCancelled) return;

          const data = res.data;

          const isConfirmed =
            Boolean(data?.bookingConfirmed) ||
            String(data?.status || "").toLowerCase() === "completed" ||
            String(data?.payment?.status || "").toLowerCase() === "completed";

          if (isConfirmed) {
            setPaymentReceipt(data?.payment || null);
            setBookingSuccess(true);
            setBookingPending(false);

            toast.success("Booking confirmed successfully!");

            await fetchBookedSlots();

            navigate(location.pathname, {
              replace: true,
            });

            return;
          }

          attempts += 1;

          if (attempts < MAX_ATTEMPTS) {
            timerId = setTimeout(
              pollSessionStatus,
              POLL_INTERVAL,
            );
          } else {
            setBookingPending(false);

            toast.info(
              "Your payment is being processed. Your booking will appear once payment confirmation is received.",
            );

            await fetchBookedSlots();

            if (!isCancelled) {
              navigate(location.pathname, {
                replace: true,
              });
            }
          }
        } catch (err) {
          if (isCancelled) return;

          console.error("Session verification error:", err);

          setBookingPending(false);

          toast.info(
            "Your payment is being processed. Your booking will appear once payment confirmation is received.",
          );

          if (!isCancelled) {
            navigate(location.pathname, {
              replace: true,
            });
          }
        }
      };

      pollSessionStatus();

      return () => {
        isCancelled = true;

        if (timerId) {
          clearTimeout(timerId);
        }
      };
    }

    if (bookingCancelledParam === "true") {
      let isCancelled = false;

      const cancelPendingPayment = async () => {
        setBookingCancelled(true);
        setBookingSuccess(false);
        setBookingPending(false);

        if (!sessionId) {
          toast.error("Payment was cancelled.");

          await fetchBookedSlots();

          if (!isCancelled) {
            navigate(location.pathname, {
              replace: true,
            });
          }

          return;
        }

        try {
          await httpClient.post("/payment/cancel", {
            sessionId,
          });

          if (isCancelled) return;

          toast.error(
            "Payment was cancelled. The slot is now available.",
          );

          await fetchBookedSlots();
        } catch (error) {
          if (isCancelled) return;

          console.error("Cancel payment error:", error);

          toast.error(
            error?.response?.data?.message ||
              "Payment was cancelled. Please try booking again.",
          );

          await fetchBookedSlots();
        } finally {
          if (!isCancelled) {
            navigate(location.pathname, {
              replace: true,
            });
          }
        }
      };

      cancelPendingPayment();

      return () => {
        isCancelled = true;
      };
    }
  }, [location.search]);

  const availability = sortAvailability(pro?.availability || []);

  const isSlotBooked = (
    day,
    slot,
    appointmentDate = null,
  ) => {
    const targetDate = normalizeDate(appointmentDate);

    return bookedSlots.some((booking) => {
      if (!isBookingStillActive(booking)) {
        return false;
      }

      const bookingDay =
        booking.appointmentDay?.trim().toLowerCase() || "";

      const bookingSlot =
        booking.appointmentSlot?.trim().toLowerCase() || "";

      const bookingDate = normalizeDate(
        booking.appointmentDate,
      );

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

  const getAvailableSlotsForDate = (day, dateStr) => {
    const dayData = availability.find(
      (item) =>
        item.day?.trim().toLowerCase() ===
        day?.trim().toLowerCase(),
    );

    if (!dayData) return [];

    return (dayData.slots || []).filter(
      (slot) =>
        !isSlotBooked(day, slot, dateStr) &&
        !isSlotTimePassed(dateStr, slot),
    );
  };

  const openBooking = async () => {
    await fetchBookedSlots();

    const upcoming = getUpcomingAvailableDates(
      availability,
      14,
    );

    const firstAvailable = upcoming.find((item) => {
      const slots = getAvailableSlotsForDate(
        item.dayName,
        item.dateString,
      );

      return slots.length > 0;
    });

    if (firstAvailable) {
      setSelectedDate(firstAvailable.dateString);
      setSelectedDay(firstAvailable.dayName);
    } else if (upcoming.length > 0) {
      setSelectedDate(upcoming[0].dateString);
      setSelectedDay(upcoming[0].dayName);
    } else {
      const todayStr = formatDateForApi(new Date());

      setSelectedDate(todayStr);
      setSelectedDay(DAY_NAMES[new Date().getDay()]);
    }

    setSelectedSlot("");
    setNotes("");
    setBookingSuccess(false);
    setBookingCancelled(false);
    setShowBooking(true);
  };

  const closeBooking = () => {
    if (bookingLoading) return;

    setShowBooking(false);
    setSelectedDate("");
    setSelectedDay("");
    setSelectedSlot("");
    setNotes("");
  };

  const handleDateSelect = (dateStr) => {
    if (!dateStr) {
      setSelectedDate("");
      setSelectedDay("");
      setSelectedSlot("");

      return;
    }

    const todayStr = formatDateForApi(new Date());

    if (dateStr < todayStr) {
      toast.error("Past dates cannot be selected.");
      return;
    }

    const parts = dateStr
      .slice(0, 10)
      .split("-")
      .map(Number);

    if (
      parts.length !== 3 ||
      parts.some(Number.isNaN)
    ) {
      toast.error("Invalid date selected.");
      return;
    }

    const [year, month, day] = parts;

    const dateObj = new Date(
      year,
      month - 1,
      day,
    );

    const dayName = DAY_NAMES[dateObj.getDay()];

    setSelectedDate(dateStr);
    setSelectedDay(dayName);
    setSelectedSlot("");
  };

  const handleConfirmBooking = async () => {
    if (!selectedDate) {
      toast.error("Please select a booking date.");
      return;
    }

    if (!selectedDay) {
      toast.error("Please select a valid day.");
      return;
    }

    if (!selectedSlot) {
      toast.error("Please select a time slot.");
      return;
    }

    const todayStr = formatDateForApi(new Date());

    if (selectedDate < todayStr) {
      toast.error(
        "Cannot book an appointment for a past date.",
      );

      return;
    }

    if (
      isSlotTimePassed(
        selectedDate,
        selectedSlot,
      )
    ) {
      toast.error(
        "The selected session start time has already passed. Please select an upcoming slot.",
      );

      return;
    }

    if (!pro?._id) {
      toast.error(
        "Professional information is missing.",
      );

      return;
    }

    if (!pro?.sessionFee) {
      toast.error(
        "Session fee is not available.",
      );

      return;
    }

    if (
      isSlotBooked(
        selectedDay,
        selectedSlot,
        selectedDate,
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
          selectedDate,
        )
      ) {
        toast.error(
          "This session was just booked by another user. Please select another slot.",
        );

        setSelectedSlot("");

        return;
      }

      const response = await httpClient.post(
        "/payment/create",
        {
          professionalId: pro._id,
          amount: Number(pro.sessionFee),
          appointmentDay: selectedDay,
          appointmentSlot: selectedSlot,
          appointmentDate: selectedDate,
          sessionDuration: 1,
          notes: notes.trim(),
        },
      );

      const checkoutUrl =
        response.data?.checkoutUrl;

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

        toast.error(
          "Please login to book a session.",
        );

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

  const profilePhoto = getImageUrl(
    pro?.profilePhoto,
  );

  const upcomingAvailableDates =
    getUpcomingAvailableDates(
      availability,
      14,
    );

  if (loading) {
    return (
      <UserLayout>
        <div className="flex min-h-full items-center justify-center bg-transparent">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-light border-t-brand" />
        </div>
      </UserLayout>
    );
  }

  if (!pro) {
    return (
      <UserLayout>
        <div className="min-h-full bg-transparent pb-20 font-sans">
          <div className="px-4 pt-6 sm:px-6 lg:px-8">
            <button
              onClick={() =>
                navigate("/user/professionals")
              }
              className="rounded-btn border border-brand-light/50 bg-surface/80 px-4 py-2 text-xs font-bold text-gray-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white"
            >
              ← Back to Directory
            </button>
          </div>

          <div className="mx-auto mt-12 max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-card border border-brand-light/50 bg-surface/85 p-12 text-center shadow-card backdrop-blur-xl">
              <p className="mb-1 text-xl font-extrabold text-gray-800">
                Professional Not Found
              </p>

              <p className="text-sm font-medium text-gray-400">
                The requested professional profile is not available.
              </p>
            </div>
          </div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className="min-h-full bg-transparent pb-20 font-sans">
        <div className="flex items-center justify-between gap-4 px-4 pb-4 pt-6 sm:px-6 sm:pt-8 lg:px-8">
          <span className="rounded-full border border-brand-light bg-brand-light/35 px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-brand-dark">
            Professional Details
          </span>

          <button
            onClick={() =>
              navigate("/user/professionals")
            }
            className="rounded-btn border border-brand-light/50 bg-surface/80 px-4 py-2 text-xs font-bold text-gray-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white"
          >
            ← Back to Directory
          </button>
        </div>

        {bookingPending && (
          <div className="mx-auto mb-6 max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 rounded-card border border-blue-200 bg-blue-50/70 p-4">
              <Clock className="h-5 w-5 shrink-0 animate-spin text-blue-600" />

              <div>
                <p className="text-sm font-bold text-blue-900">
                  Verifying Payment Confirmation...
                </p>

                <p className="mt-0.5 text-xs font-medium text-blue-700">
                  Please wait while we confirm your payment with Stripe and set up your session.
                </p>
              </div>
            </div>
          </div>
        )}

        {bookingSuccess && paymentReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
                <h2 className="text-lg font-bold text-gray-900">
                  Payment Receipt
                </h2>

                <button
                  type="button"
                  onClick={() => {
                    setBookingSuccess(false);
                    setPaymentReceipt(null);
                  }}
                  className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                  aria-label="Close receipt"
                >
                  ×
                </button>
              </div>

              <div
                id="payment-receipt"
                className="p-6"
              >
                <div className="border-b border-gray-200 pb-5 text-center">
                  <CheckCircle className="mx-auto h-10 w-10 text-green-600" />

                  <h3 className="mt-3 text-xl font-bold text-gray-900">
                    Payment Successful
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    Your appointment has been confirmed.
                  </p>

                  <p className="mt-4 text-sm font-medium text-gray-500">
                    Amount Paid
                  </p>

                  <p className="mt-1 text-3xl font-bold text-gray-900">
                    Rs.{" "}
                    {Number(
                      paymentReceipt.amount || 0,
                    ).toLocaleString()}
                  </p>

                  <p className="mt-1 text-sm font-semibold text-green-600">
                    Payment Completed
                  </p>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-xs font-medium text-gray-500">
                      Transaction ID
                    </p>

                    <p className="mt-1 break-all text-sm font-semibold text-gray-900">
                      {paymentReceipt.stripeSessionId ||
                        paymentReceipt._id ||
                        "N/A"}
                    </p>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-xs font-medium text-gray-500">
                      Payment Date
                    </p>

                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {paymentReceipt.createdAt
                        ? new Date(
                            paymentReceipt.createdAt,
                          ).toLocaleString()
                        : "N/A"}
                    </p>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-xs font-medium text-gray-500">
                      Professional
                    </p>

                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {paymentReceipt.professional
                        ? `${paymentReceipt.professional.firstName || ""} ${
                            paymentReceipt.professional.lastName || ""
                          }`.trim()
                        : "N/A"}
                    </p>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-xs font-medium text-gray-500">
                      Appointment Date
                    </p>

                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {paymentReceipt.appointmentDate ||
                        "N/A"}
                    </p>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-xs font-medium text-gray-500">
                      Appointment Day
                    </p>

                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {paymentReceipt.appointmentDay ||
                        "N/A"}
                    </p>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-xs font-medium text-gray-500">
                      Appointment Time
                    </p>

                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {paymentReceipt.appointmentSlot ||
                        "N/A"}
                    </p>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-xs font-medium text-gray-500">
                      Session Duration
                    </p>

                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {paymentReceipt.sessionDuration
                        ? `${paymentReceipt.sessionDuration} hour${
                            paymentReceipt.sessionDuration >
                            1
                              ? "s"
                              : ""
                          }`
                        : "N/A"}
                    </p>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-xs font-medium text-gray-500">
                      Payment Status
                    </p>

                    <p className="mt-1 text-sm font-semibold capitalize text-green-600">
                      {paymentReceipt.status ||
                        "Completed"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-lg border border-gray-200 p-4">
                  <p className="text-xs font-medium text-gray-500">
                    Receipt Reference
                  </p>

                  <p className="mt-1 break-all text-sm font-semibold text-gray-900">
                    {paymentReceipt._id || "N/A"}
                  </p>
                </div>
              </div>

              <div className="sticky bottom-0 flex flex-col gap-3 border-t border-gray-200 bg-white p-6 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setBookingSuccess(false);
                    setPaymentReceipt(null);
                  }}
                  className="flex-1 rounded-lg border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 rounded-lg bg-brand-dark px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                >
                  Save Receipt
                </button>
              </div>
            </div>
          </div>
        )}

        {bookingCancelled && (
          <div className="mx-auto mb-6 max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 rounded-card border border-accent-orange-dark/30 bg-accent-orange/35 p-4">
              <span className="text-lg font-bold text-accent-orange-dark">
                !
              </span>

              <p className="text-sm font-medium text-gray-800">
                Payment was cancelled. The slot is available again and you can try booking again anytime.
              </p>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <section className="rounded-card border border-brand-light/50 bg-surface/85 shadow-card backdrop-blur-xl">
            <div className="p-6 sm:p-8">
              <div className="flex flex-col gap-7 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-start gap-5">
                  {profilePhoto ? (
                    <img
                      src={profilePhoto}
                      alt={`${pro.firstName || ""} ${pro.lastName || ""}`}
                      className="h-24 w-24 shrink-0 rounded-card border border-brand-light/60 object-cover shadow-sm sm:h-28 sm:w-28"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div
                      className="flex h-24 w-24 shrink-0 items-center justify-center rounded-card text-3xl font-black text-white shadow-sm sm:h-28 sm:w-28"
                      style={{
                        background:
                          "linear-gradient(135deg, #53b889, #16845b)",
                      }}
                    >
                      {pro.firstName?.charAt(0)?.toUpperCase() || "P"}
                    </div>
                  )}

                  <div className="min-w-0 pt-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h1 className="text-2xl font-black tracking-tight text-gray-800 sm:text-3xl">
                        {pro.firstName} {pro.lastName}
                      </h1>

                      <span className="inline-flex items-center gap-1 rounded-full border border-brand-light bg-brand-light/30 px-2.5 py-1 text-[11px] font-bold text-brand-dark">
                        <CheckCircle className="h-3.5 w-3.5 text-brand" />
                        PoseFit Certified
                      </span>
                    </div>

                    <p className="mt-1.5 text-sm font-semibold text-gray-500">
                      {pro.professionalType || "Trainer"} •{" "}
                      {pro.specialization || "General Fitness"}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-gray-700">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        {pro.rating?.count > 0
                          ? `${Number(pro.rating?.average || 0).toFixed(1)}`
                          : "New"}
                        {pro.rating?.count > 0 && (
                          <span className="font-normal text-gray-400">
                            ({pro.rating.count}{" "}
                            {pro.rating.count === 1 ? "review" : "reviews"})
                          </span>
                        )}
                      </span>

                      <span className="text-gray-300">•</span>

                      <span className="font-semibold text-gray-700">
                        Rs.{" "}
                        {Number(pro.sessionFee || 0).toLocaleString()}
                        <span className="font-normal text-gray-400">
                          {" "}
                          / session
                        </span>
                      </span>

                      {formatExperience(pro.experience) && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="font-semibold text-gray-700">
                            {formatExperience(pro.experience)} experience
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2.5 lg:pt-1">
                  {myRating ? (
                    <div className="flex items-center gap-1.5 rounded-btn border border-brand-light bg-brand-light/25 px-4 py-3 text-xs font-bold text-brand-dark">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                      You rated {Number(myRating.rating).toFixed(1)} ★
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowRatingModal(true)}
                      className="flex items-center gap-2 rounded-btn border border-brand-light/60 bg-white/70 px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-card"
                    >
                      <Star className="h-4 w-4 text-amber-400" />
                      Rate Professional
                    </button>
                  )}

                  <button
                    onClick={openBooking}
                    disabled={!pro.sessionFee || availability.length === 0}
                    className="rounded-btn bg-gray-800 px-6 py-3 text-sm font-bold text-white shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-700 hover:shadow-card-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Book a Session
                  </button>
                </div>
              </div>

              {pro.bio && (
                <div className="mt-8 border-t border-brand-light/40 pt-6">
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-400">
                    About
                  </h2>

                  <p className="mt-2 max-w-4xl text-sm leading-7 text-gray-600">
                    {pro.bio}
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="mt-10">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-brand" />
                  <h2 className="text-lg font-bold text-gray-800">
                    Availability
                  </h2>
                </div>

                <p className="mt-1 text-sm text-gray-500">
                  Weekly schedule for upcoming sessions.
                </p>
              </div>

              {availability.length > 0 && (
                <span className="hidden text-xs font-semibold text-gray-400 sm:block">
                  {availability.length}{" "}
                  {availability.length === 1 ? "day" : "days"} available
                </span>
              )}
            </div>

            {availability.length > 0 ? (
              <div className="overflow-hidden rounded-card border border-brand-light/50 bg-surface/70 shadow-sm">
                {availability.map((item, index) => (
                  <div
                    key={item.day}
                    className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center ${
                      index !== availability.length - 1
                        ? "border-b border-brand-light/30"
                        : ""
                    }`}
                  >
                    <div className="w-28 shrink-0">
                      <p className="text-sm font-bold text-gray-800">
                        {item.day}
                      </p>
                    </div>

                    <div className="flex flex-1 flex-wrap gap-x-5 gap-y-2">
                      {item.slots.map((slot) => (
                        <span
                          key={slot}
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600"
                        >
                          <Clock className="h-3.5 w-3.5 text-brand" />
                          {slot}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-card border border-gray-200 bg-surface/70 px-5 py-8 text-sm text-gray-500">
                No availability schedule published yet.
              </div>
            )}
          </section>

          <section className="mt-10">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <h2 className="text-lg font-bold text-gray-800">
                    Client Reviews
                  </h2>
                </div>

                <div className="mt-1 flex items-center gap-2 text-sm">
                  <span className="font-bold text-gray-800">
                    {pro.rating?.count > 0
                      ? Number(pro.rating.average || 0).toFixed(1)
                      : "No ratings"}
                  </span>

                  {pro.rating?.count > 0 && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span className="text-gray-500">
                        {pro.rating.count}{" "}
                        {pro.rating.count === 1 ? "rating" : "ratings"}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {myRating ? (
                <span className="inline-flex items-center gap-1.5 rounded-btn border border-brand-light bg-brand-light/25 px-3.5 py-2 text-xs font-bold text-brand-dark">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                  You rated {Number(myRating.rating).toFixed(1)} ★
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowRatingModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-btn border border-brand-light bg-brand-light/25 px-3.5 py-2 text-xs font-bold text-brand-dark transition-colors hover:bg-brand-light/40"
                >
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                  Rate Professional
                </button>
              )}
            </div>

            {reviewsLoading ? (
              <div className="flex h-28 items-center justify-center">
                <div className="h-7 w-7 animate-spin rounded-full border-4 border-brand-light border-t-brand" />
              </div>
            ) : proReviews.length === 0 ? (
              <div className="rounded-card border border-gray-200 bg-surface/70 px-5 py-10 text-center">
                <p className="text-sm font-semibold text-gray-700">
                  No client ratings yet for this professional.
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  Ratings become available after scheduled client sessions
                  have ended.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-brand-light/30 border-y border-brand-light/30">
                {proReviews.map((review) => (
                  <div
                    key={review._id}
                    className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-btn text-xs font-black text-white shadow-sm"
                        style={{
                          background:
                            "linear-gradient(135deg, #53b889, #16845b)",
                        }}
                      >
                        {review.user?.firstName?.[0]?.toUpperCase() || "U"}
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          {review.user
                            ? `${review.user.firstName} ${review.user.lastName}`
                            : "PoseFit User"}
                        </p>

                        {review.createdAt && (
                          <p className="mt-0.5 text-xs text-gray-400">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.rating
                                ? "fill-amber-400 text-amber-400"
                                : "fill-gray-100 text-gray-200"
                            }`}
                          />
                        ))}
                      </div>

                      <span className="text-xs font-bold text-gray-700">
                        {review.rating}.0
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {showBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div
              className="w-full max-w-lg overflow-y-auto rounded-card border border-brand-light/60 bg-surface/95 shadow-card-hover backdrop-blur-xl"
              style={{
                maxHeight: "92vh",
              }}
            >
              <div className="flex items-start justify-between border-b border-brand-light/40 p-6">
                <div>
                  <h2 className="text-lg font-black text-gray-800">
                    Book a Session
                  </h2>

                  <p className="mt-0.5 text-xs font-medium text-gray-500">
                    with{" "}
                    <span className="font-bold text-gray-700">
                      {pro.firstName}{" "}
                      {pro.lastName}
                    </span>{" "}
                    (Rs.{" "}
                    {Number(
                      pro.sessionFee || 0,
                    ).toLocaleString()}{" "}
                    per session)
                  </p>
                </div>

                <button
                  onClick={closeBooking}
                  disabled={bookingLoading}
                  className="text-xl font-bold leading-none text-gray-400 transition-colors hover:text-gray-700 disabled:opacity-40"
                >
                  ×
                </button>
              </div>

              <div className="space-y-5 p-6">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-500">
                      Step 1: Choose a Booking Date
                    </label>

                    {selectedDate && (
                      <span className="rounded-full bg-brand-light/30 px-2.5 py-0.5 text-[11px] font-bold text-brand-dark">
                        {new Date(
                          selectedDate +
                            "T00:00:00",
                        ).toLocaleDateString(
                          "en-US",
                          {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </span>
                    )}
                  </div>

                  <div className="mb-3">
                    <div className="relative flex items-center">
                      <Calendar className="pointer-events-none absolute left-3.5 h-4 w-4 text-gray-400" />

                      <input
                        type="date"
                        min={formatDateForApi(
                          new Date(),
                        )}
                        value={selectedDate}
                        onChange={(e) =>
                          handleDateSelect(
                            e.target.value,
                          )
                        }
                        className="w-full rounded-btn border border-brand-light/60 bg-white/90 py-2.5 pl-10 pr-3.5 text-xs font-bold text-gray-800 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand-light/60"
                      />
                    </div>

                    <p className="mt-1 text-[11px] text-gray-500">
                      Pick any future date above, or choose an upcoming working day below:
                    </p>
                  </div>

                  {availability.length === 0 ? (
                    <p className="text-xs font-medium text-gray-400">
                      No availability slots configured by this professional yet.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {upcomingAvailableDates.map(
                        (item) => {
                          const availableSlots =
                            getAvailableSlotsForDate(
                              item.dayName,
                              item.dateString,
                            );

                          const isSelected =
                            selectedDate ===
                            item.dateString;

                          const isFullyBooked =
                            availableSlots.length ===
                            0;

                          return (
                            <button
                              key={
                                item.dateString
                              }
                              type="button"
                              disabled={
                                isFullyBooked
                              }
                              onClick={() =>
                                handleDateSelect(
                                  item.dateString,
                                )
                              }
                              className={`rounded-btn border px-2.5 py-2 text-xs font-bold transition-all ${
                                isSelected
                                  ? "border-brand-dark bg-brand-dark text-white shadow-card"
                                  : isFullyBooked
                                  ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                                  : "border-brand-light/50 bg-brand-light/10 text-gray-700 hover:border-brand hover:bg-brand-light/25"
                              }`}
                            >
                              <span>
                                {item.isToday
                                  ? "Today"
                                  : item.dayName.slice(
                                      0,
                                      3,
                                    )}
                                ,{" "}
                                {item.dateObj.toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                  },
                                )}
                              </span>

                              <span className="mt-0.5 block text-[10px] font-medium opacity-70">
                                {isFullyBooked
                                  ? "No slots"
                                  : `${availableSlots.length} slots`}
                              </span>
                            </button>
                          );
                        },
                      )}
                    </div>
                  )}
                </div>

                {selectedDate && (
                  <div>
                    <label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-gray-500">
                      Step 2: Choose a Time Slot for{" "}
                      {selectedDay},{" "}
                      {new Date(
                        selectedDate +
                          "T00:00:00",
                      ).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                        },
                      )}
                    </label>

                    {!selectedDayData ||
                    daySlots.length === 0 ? (
                      <div className="rounded-card border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                        <p className="font-bold">
                          Not available on{" "}
                          {selectedDay}s
                        </p>

                        <p className="mt-0.5 text-[11px] text-amber-700">
                          This professional does not have slots configured for{" "}
                          {selectedDay}. Available working days:{" "}
                          <span className="font-semibold">
                            {availability
                              .map((a) => a.day)
                              .join(", ")}
                          </span>
                          .
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {daySlots.map(
                          (slot) => {
                            const booked =
                              isSlotBooked(
                                selectedDay,
                                slot,
                                selectedDate,
                              );

                            const isPassed =
                              isSlotTimePassed(
                                selectedDate,
                                slot,
                              );

                            const isUnavailable =
                              booked ||
                              isPassed;

                            return (
                              <button
                                key={slot}
                                type="button"
                                disabled={
                                  isUnavailable
                                }
                                onClick={() => {
                                  if (
                                    !isUnavailable
                                  ) {
                                    setSelectedSlot(
                                      slot,
                                    );
                                  }
                                }}
                                className={`flex items-center gap-2 rounded-btn border px-4 py-3 text-xs font-bold transition-all ${
                                  isPassed
                                    ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                                    : booked
                                    ? "cursor-not-allowed border-rose-200 bg-rose-50 text-rose-400"
                                    : selectedSlot ===
                                      slot
                                    ? "border-brand-dark bg-brand-dark text-white shadow-card"
                                    : "border-brand-light/50 bg-brand-light/10 text-gray-700 hover:border-brand hover:bg-brand-light/25"
                                }`}
                              >
                                <Clock
                                  className={`h-4 w-4 shrink-0 ${
                                    isPassed
                                      ? "text-gray-400"
                                      : booked
                                      ? "text-rose-400"
                                      : selectedSlot ===
                                        slot
                                      ? "text-white"
                                      : "text-gray-400"
                                  }`}
                                />

                                <span>
                                  {slot}
                                </span>

                                {isPassed && (
                                  <span className="ml-auto rounded bg-gray-200 px-1.5 py-0.5 text-[9px] font-bold uppercase text-gray-500">
                                    Passed
                                  </span>
                                )}

                                {booked &&
                                  !isPassed && (
                                    <span className="ml-auto text-[10px] font-black uppercase">
                                      Unavailable
                                    </span>
                                  )}

                                {selectedSlot ===
                                  slot &&
                                  !isUnavailable && (
                                    <CheckCircle className="ml-auto h-4 w-4 text-white" />
                                  )}
                              </button>
                            );
                          },
                        )}
                      </div>
                    )}
                  </div>
                )}

                {selectedSlot && (
                  <div>
                    <label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-gray-500">
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
                      className="w-full resize-none rounded-btn border border-gray-200 bg-white/70 px-3.5 py-2.5 text-xs font-medium text-gray-800 outline-none transition-all placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand-light/60"
                    />

                    <p className="mt-1 text-right text-[10px] text-gray-400">
                      {notes.length}/500
                    </p>
                  </div>
                )}

                {selectedDate &&
                  selectedDay &&
                  selectedSlot && (
                    <div className="flex flex-wrap items-start justify-between gap-4 rounded-card border border-brand-light bg-brand-light/20 p-4">
                      <div>
                        <p className="text-xs font-extrabold uppercase tracking-wide text-brand-dark">
                          Booking Summary
                        </p>

                        <p className="mt-1 text-sm font-bold text-gray-800">
                          {selectedDay} at{" "}
                          {selectedSlot}
                        </p>

                        <p className="mt-0.5 text-xs font-medium text-gray-500">
                          with{" "}
                          {pro.firstName}{" "}
                          {pro.lastName}
                        </p>

                        <p className="mt-1 text-xs font-medium text-gray-500">
                          Date:{" "}
                          {new Date(
                            selectedDate +
                              "T00:00:00",
                          ).toLocaleDateString(
                            "en-US",
                            {
                              weekday:
                                "short",
                              month:
                                "short",
                              day: "numeric",
                              year:
                                "numeric",
                            },
                          )}
                        </p>
                      </div>

                      <p className="text-xl font-black text-brand-dark">
                        Rs.{" "}
                        {Number(
                          pro.sessionFee || 0,
                        ).toLocaleString()}
                      </p>
                    </div>
                  )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeBooking}
                    disabled={bookingLoading}
                    className="flex-1 rounded-btn border border-gray-200 bg-gray-100 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={
                      handleConfirmBooking
                    }
                    disabled={
                      !selectedDate ||
                      !selectedDay ||
                      !selectedSlot ||
                      bookingLoading ||
                      !pro.sessionFee ||
                      isSlotTimePassed(
                        selectedDate,
                        selectedSlot,
                      ) ||
                      isSlotBooked(
                        selectedDay,
                        selectedSlot,
                        selectedDate,
                      )
                    }
                    className="flex-1 rounded-btn bg-gray-800 py-3 text-sm font-bold text-white shadow-card transition-all hover:-translate-y-0.5 hover:bg-gray-700 hover:shadow-card-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {bookingLoading
                      ? "Redirecting to Payment..."
                      : !selectedDate
                      ? "Select a Date"
                      : !selectedDay
                      ? "Select a Day"
                      : !selectedSlot
                      ? "Select a Time Slot"
                      : isSlotTimePassed(
                          selectedDate,
                          selectedSlot,
                        )
                      ? "Slot Has Passed"
                      : isSlotBooked(
                          selectedDay,
                          selectedSlot,
                          selectedDate,
                        )
                      ? "Slot Unavailable"
                      : "Confirm & Pay →"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showRatingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-card border border-brand-light/60 bg-surface/95 shadow-card-hover backdrop-blur-xl">
              <div className="flex items-start justify-between border-b border-brand-light/40 p-6">
                <div>
                  <h2 className="text-lg font-black text-gray-800">
                    Rate {pro.firstName}{" "}
                    {pro.lastName}
                  </h2>

                  <p className="mt-0.5 text-xs font-medium text-gray-500">
                    Rate your completed session with this fitness coach.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowRatingModal(false)
                  }
                  disabled={ratingSubmitting}
                  className="text-xl font-bold leading-none text-gray-400 transition-colors hover:text-gray-700 disabled:opacity-40"
                >
                  ×
                </button>
              </div>

              <form
                onSubmit={
                  handleRateProfessional
                }
                className="space-y-5 p-6"
              >
                {pendingEligibleSessions[0] && (
                  <div className="rounded-card border border-brand-light bg-brand-light/20 p-3 text-xs text-brand-dark">
                    <p className="font-bold">
                      Completed Session:
                    </p>

                    <p className="mt-0.5 text-[11px] text-brand-dark/80">
                      {
                        pendingEligibleSessions[0]
                          .appointmentDay
                      }{" "}
                      •{" "}
                      {
                        pendingEligibleSessions[0]
                          .appointmentSlot
                      }
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
                    Star Rating (1 to 5)
                  </label>

                  <div className="mt-3 flex items-center justify-center gap-3 rounded-card border border-brand-light/40 bg-brand-light/10 p-4">
                    {[1, 2, 3, 4, 5].map(
                      (star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() =>
                            setUserRating(
                              star,
                            )
                          }
                          onMouseEnter={() =>
                            setUserHoverRating(
                              star,
                            )
                          }
                          onMouseLeave={() =>
                            setUserHoverRating(
                              0,
                            )
                          }
                          className="rounded-md p-1 transition-transform hover:scale-110 focus:outline-none"
                        >
                          <Star
                            className={`h-7 w-7 ${
                              star <=
                              (userHoverRating ||
                                userRating)
                                ? "fill-amber-400 text-amber-400"
                                : "fill-gray-100 text-gray-200"
                            }`}
                          />
                        </button>
                      ),
                    )}
                  </div>

                  <p className="mt-2 text-center text-xs font-bold text-gray-700">
                    {userHoverRating ||
                      userRating}{" "}
                    out of 5 Stars
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      setShowRatingModal(
                        false,
                      )
                    }
                    disabled={ratingSubmitting}
                    className="flex-1 rounded-btn border border-gray-200 bg-gray-100 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={ratingSubmitting}
                    className="flex-1 rounded-btn bg-gray-800 py-3 text-sm font-bold text-white shadow-card transition-all hover:-translate-y-0.5 hover:bg-gray-700 hover:shadow-card-hover disabled:opacity-50"
                  >
                    {ratingSubmitting
                      ? "Submitting..."
                      : "Submit Rating"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </UserLayout>
  );
}