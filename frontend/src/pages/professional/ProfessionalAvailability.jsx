import { useState, useEffect, useCallback } from "react";
import ProfessionalLayout from "../../components/professional/ProfessionalLayout";
import { httpClient } from "../../lib/http";
import { Save, Plus, Trash2, Clock3 } from "lucide-react";

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function formatTo12Hour(time24) {
  if (!time24) return "";

  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr || "00";

  const modifier = h >= 12 ? "PM" : "AM";

  if (h === 0) h = 12;
  else if (h > 12) h -= 12;

  const formattedH = h < 10 ? `0${h}` : `${h}`;

  return `${formattedH}:${m} ${modifier}`;
}

function convertToMinutes(time) {
  if (!time) return null;

  const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);

  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const modifier = match[3].toUpperCase();

  if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
    return null;
  }

  if (modifier === "AM" && hours === 12) {
    hours = 0;
  }

  if (modifier === "PM" && hours !== 12) {
    hours += 12;
  }

  return hours * 60 + minutes;
}

export default function ProfessionalAvailability() {
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slotInputs, setSlotInputs] = useState({});
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });

    setTimeout(() => setToast(null), 3500);
  };

  const fetchAvailability = useCallback(async () => {
    try {
      setLoading(true);

      const res = await httpClient.get("/professional/availability");

      setAvailability(res.data?.availability || []);
    } catch {
      showToast("Failed to load availability schedule", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const handleToggleDay = (day) => {
    const exists = availability.find((item) => item.day === day);

    if (exists) {
      setAvailability((prev) => prev.filter((item) => item.day !== day));
    } else {
      setAvailability((prev) => [
        ...prev,
        {
          day,
          slots: ["09:00 AM - 10:00 AM"],
        },
      ]);
    }
  };

  const handleTimeChange = (day, field, value) => {
    setSlotInputs((prev) => ({
      ...prev,
      [day]: {
        ...(prev[day] || {
          start: "09:00",
          end: "10:00",
        }),
        [field]: value,
      },
    }));
  };

  const handleAddSlot = (day) => {
    const input = slotInputs[day] || {
      start: "09:00",
      end: "10:00",
    };

    const { start, end } = input;

    if (!start || !end) {
      showToast("Please choose both start and end times.", "error");
      return;
    }

    if (start >= end) {
      showToast("Start time must be strictly before end time.", "error");
      return;
    }

    const newStartMinutes = convertToMinutes(formatTo12Hour(start));
    const newEndMinutes = convertToMinutes(formatTo12Hour(end));

    if (newStartMinutes === null || newEndMinutes === null) {
      showToast("Invalid time selected.", "error");
      return;
    }

    const durationMinutes = newEndMinutes - newStartMinutes;
    const durationHours = durationMinutes / 60;

    if (durationMinutes < 60) {
      showToast("Each session slot must be at least 1 hour long.", "error");
      return;
    }

    if (durationMinutes > 180) {
      showToast("Each session slot cannot be longer than 3 hours.", "error");
      return;
    }

    if (!Number.isInteger(durationHours)) {
      showToast(
        "Session slots must be exactly 1, 2, or 3 hours long.",
        "error",
      );
      return;
    }

    const dayItem = availability.find((item) => item.day === day);
    const existingSlots = dayItem?.slots || [];

    const hasOverlap = existingSlots.some((slot) => {
      const [existingStart, existingEnd] = slot.split(" - ");

      const existingStartMinutes = convertToMinutes(existingStart);
      const existingEndMinutes = convertToMinutes(existingEnd);

      if (existingStartMinutes === null || existingEndMinutes === null) {
        return false;
      }

      return (
        newStartMinutes < existingEndMinutes &&
        newEndMinutes > existingStartMinutes
      );
    });

    if (hasOverlap) {
      showToast("This time slot overlaps with an existing slot.", "error");
      return;
    }

    const formattedSlot = `${formatTo12Hour(start)} - ${formatTo12Hour(end)}`;

    setAvailability((prev) =>
      prev.map((item) => {
        if (item.day === day) {
          return {
            ...item,
            slots: [...(item.slots || []), formattedSlot],
          };
        }

        return item;
      }),
    );

    setSlotInputs((prev) => ({
      ...prev,
      [day]: {
        start: "09:00",
        end: "10:00",
      },
    }));
  };

  const handleRemoveSlot = (day, slotIndex) => {
    setAvailability((prev) =>
      prev.map((item) => {
        if (item.day === day) {
          return {
            ...item,
            slots: item.slots.filter((_, i) => i !== slotIndex),
          };
        }

        return item;
      }),
    );
  };

  const handleSave = async () => {
    for (const dayItem of availability) {
      for (const slot of dayItem.slots || []) {
        const parts = slot.split(" - ");

        if (parts.length !== 2) {
          showToast(`Invalid time slot format on ${dayItem.day}.`, "error");
          return;
        }

        const start = convertToMinutes(parts[0]);
        const end = convertToMinutes(parts[1]);

        if (start === null || end === null) {
          showToast(`Invalid time format on ${dayItem.day}.`, "error");
          return;
        }

        if (start >= end) {
          showToast(
            `Start time must be before end time on ${dayItem.day}.`,
            "error",
          );
          return;
        }

        const durationMinutes = end - start;
        const durationHours = durationMinutes / 60;

        if (durationMinutes < 60) {
          showToast(
            `Each session slot must be at least 1 hour. Invalid slot on ${dayItem.day}: ${slot}`,
            "error",
          );
          return;
        }

        if (durationMinutes > 180) {
          showToast(
            `Each session slot cannot exceed 3 hours. Invalid slot on ${dayItem.day}: ${slot}`,
            "error",
          );
          return;
        }

        if (!Number.isInteger(durationHours)) {
          showToast(
            `Session slots must be exactly 1, 2, or 3 hours. Invalid slot on ${dayItem.day}: ${slot}`,
            "error",
          );
          return;
        }
      }
    }

    try {
      setSaving(true);

      await httpClient.put("/professional/availability", {
        availability,
      });

      showToast("Availability schedule saved successfully!");
    } catch (err) {
      showToast(
        err?.response?.data?.message || "Failed to save availability.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProfessionalLayout>
      <div className="min-h-screen bg-transparent pb-16 font-sans">
        {toast && (
          <div
            className={`fixed right-5 top-5 z-50 rounded-2xl border px-5 py-3 text-sm font-bold text-white shadow-card-hover transition-all ${
              toast.type === "error"
                ? "border-rose-600 bg-rose-500"
                : "border-brand-dark bg-brand-dark"
            }`}
            style={{ animation: "modalIn 0.2s ease" }}
          >
            {toast.msg}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 px-4 pb-4 pt-6 sm:px-6 sm:pt-8 lg:px-8">
          <div>
            <span className="inline-flex rounded-full border border-brand-light/70 bg-brand-light/40 px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-brand-dark">
              Schedule Management
            </span>

            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-gray-800 sm:text-3xl">
              Availability Schedule
            </h1>

            <p className="mt-1 text-sm font-medium text-gray-500">
              Configure available days and session slots from 1 to 3 hours for
              client bookings.
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-btn bg-gray-800 px-6 py-3 text-sm font-bold text-white shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-700 hover:shadow-card-hover disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >
            <Save className="h-4 w-4" />

            <span>{saving ? "Saving..." : "Save Availability Schedule"}</span>
          </button>
        </div>

        <div className="mb-5 max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-card border border-brand-light/70 bg-brand-light/25 px-4 py-3">
            <p className="text-xs font-extrabold text-brand-dark">
              Session Slot Rule
            </p>

            <p className="mt-1 text-xs font-medium leading-relaxed text-gray-600">
              Each availability slot must be exactly 1, 2, or 3 hours long.
              For example: 9:00 AM - 10:00 AM or 1:00 PM - 4:00 PM.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex h-52 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-light border-t-brand-dark" />
          </div>
        ) : (
          <div className="max-w-4xl space-y-4 px-4 sm:px-6 lg:px-8">
            <div className="grid gap-4">
              {DAYS_OF_WEEK.map((day) => {
                const dayItem = availability.find(
                  (item) => item.day === day,
                );

                const isActive = !!dayItem;

                const input = slotInputs[day] || {
                  start: "09:00",
                  end: "10:00",
                };

                return (
                  <div
                    key={day}
                    className={`rounded-card border p-5 transition-all duration-300 ${
                      isActive
                        ? "border-brand-light/60 bg-surface/90 shadow-card"
                        : "border-gray-200 bg-white/60 opacity-75"
                    }`}
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id={`check-${day}`}
                          checked={isActive}
                          onChange={() => handleToggleDay(day)}
                          className="h-5 w-5 cursor-pointer accent-[#53b889]"
                        />

                        <label
                          htmlFor={`check-${day}`}
                          className="cursor-pointer text-base font-extrabold text-gray-800"
                        >
                          {day}
                        </label>
                      </div>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-bold ${
                          isActive
                            ? "border-brand-light bg-brand-light/30 text-brand-dark"
                            : "border-gray-200 bg-gray-100 text-gray-500"
                        }`}
                      >
                        {isActive
                          ? `${dayItem.slots?.length || 0} Slots Active`
                          : "Off / Unavailable"}
                      </span>
                    </div>

                    {isActive && (
                      <div className="space-y-3 border-t border-brand-light/30 pt-3">
                        <div className="flex flex-wrap gap-2">
                          {dayItem.slots && dayItem.slots.length > 0 ? (
                            dayItem.slots.map((slot, sIdx) => (
                              <span
                                key={sIdx}
                                className="inline-flex items-center gap-2 rounded-xl border border-brand-light/60 bg-brand-light/20 px-3 py-1.5 text-xs font-bold text-gray-800"
                              >
                                <Clock3 className="h-3.5 w-3.5 text-brand-dark" />

                                {slot}

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveSlot(day, sIdx)
                                  }
                                  className="ml-1 text-gray-400 transition-colors hover:text-rose-600"
                                  aria-label="Remove slot"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </span>
                            ))
                          ) : (
                            <p className="text-xs font-medium text-gray-400">
                              No time slots configured for {day}. Add one
                              below.
                            </p>
                          )}
                        </div>

                        <div className="flex max-w-lg flex-wrap items-center gap-3 rounded-card border border-brand-light/40 bg-brand-light/10 p-3">
                          <div>
                            <label className="mb-0.5 block text-[10px] font-bold uppercase text-gray-500">
                              Start
                            </label>

                            <input
                              type="time"
                              value={input.start}
                              onChange={(e) =>
                                handleTimeChange(
                                  day,
                                  "start",
                                  e.target.value,
                                )
                              }
                              className="rounded-xl border border-gray-200 bg-white/80 px-2.5 py-1.5 text-xs font-bold text-gray-800 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand-light/60"
                            />
                          </div>

                          <div>
                            <label className="mb-0.5 block text-[10px] font-bold uppercase text-gray-500">
                              End
                            </label>

                            <input
                              type="time"
                              value={input.end}
                              onChange={(e) =>
                                handleTimeChange(
                                  day,
                                  "end",
                                  e.target.value,
                                )
                              }
                              className="rounded-xl border border-gray-200 bg-white/80 px-2.5 py-1.5 text-xs font-bold text-gray-800 outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand-light/60"
                            />
                          </div>

                          <div className="pt-3.5">
                            <button
                              type="button"
                              onClick={() => handleAddSlot(day)}
                              className="flex shrink-0 items-center gap-1 rounded-xl border border-brand-light bg-brand-light/35 px-3.5 py-2 text-xs font-bold text-brand-dark transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-light/50"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Add Slot
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </ProfessionalLayout>
  );
}