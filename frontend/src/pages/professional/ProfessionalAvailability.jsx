import { useState, useEffect, useCallback } from "react";
import ProfessionalLayout from "../../components/professional/ProfessionalLayout";
import { httpClient } from "../../lib/http";
import {
  IconSave,
  IconPlus,
  IconTrash,
  IconClock,
} from "../../components/admin/Icons";

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Convert 24-hour HH:MM to 12-hour "hh:mm AM/PM"
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

// Convert "09:00 AM" into minutes
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
      setAvailability((prev) =>
        prev.filter((item) => item.day !== day)
      );
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
      showToast(
        "Please choose both start and end times.",
        "error"
      );
      return;
    }

    if (start >= end) {
      showToast(
        "Start time must be strictly before end time.",
        "error"
      );
      return;
    }

    const newStartMinutes = convertToMinutes(
      formatTo12Hour(start)
    );

    const newEndMinutes = convertToMinutes(
      formatTo12Hour(end)
    );

    if (
      newStartMinutes === null ||
      newEndMinutes === null
    ) {
      showToast("Invalid time selected.", "error");
      return;
    }

    const durationMinutes =
      newEndMinutes - newStartMinutes;

    const durationHours = durationMinutes / 60;

    // Minimum session duration = 1 hour
    if (durationMinutes < 60) {
      showToast(
        "Each session slot must be at least 1 hour long.",
        "error"
      );
      return;
    }

    // Maximum session duration = 3 hours
    if (durationMinutes > 180) {
      showToast(
        "Each session slot cannot be longer than 3 hours.",
        "error"
      );
      return;
    }

    // Only complete 1, 2, or 3 hour slots are allowed
    if (!Number.isInteger(durationHours)) {
      showToast(
        "Session slots must be exactly 1, 2, or 3 hours long.",
        "error"
      );
      return;
    }

    const dayItem = availability.find(
      (item) => item.day === day
    );

    const existingSlots = dayItem?.slots || [];

    // Check overlap with existing slots
    const hasOverlap = existingSlots.some((slot) => {
      const [existingStart, existingEnd] =
        slot.split(" - ");

      const existingStartMinutes =
        convertToMinutes(existingStart);

      const existingEndMinutes =
        convertToMinutes(existingEnd);

      if (
        existingStartMinutes === null ||
        existingEndMinutes === null
      ) {
        return false;
      }

      return (
        newStartMinutes < existingEndMinutes &&
        newEndMinutes > existingStartMinutes
      );
    });

    if (hasOverlap) {
      showToast(
        "This time slot overlaps with an existing slot.",
        "error"
      );
      return;
    }

    const formattedSlot = `${formatTo12Hour(
      start
    )} - ${formatTo12Hour(end)}`;

    setAvailability((prev) =>
      prev.map((item) => {
        if (item.day === day) {
          return {
            ...item,
            slots: [
              ...(item.slots || []),
              formattedSlot,
            ],
          };
        }

        return item;
      })
    );

    // Reset picker to a default 1-hour slot
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
            slots: item.slots.filter(
              (_, i) => i !== slotIndex
            ),
          };
        }

        return item;
      })
    );
  };

  const handleSave = async () => {
    // Final frontend validation before sending to backend
    for (const dayItem of availability) {
      for (const slot of dayItem.slots || []) {
        const parts = slot.split(" - ");

        if (parts.length !== 2) {
          showToast(
            `Invalid time slot format on ${dayItem.day}.`,
            "error"
          );
          return;
        }

        const start = convertToMinutes(parts[0]);
        const end = convertToMinutes(parts[1]);

        if (start === null || end === null) {
          showToast(
            `Invalid time format on ${dayItem.day}.`,
            "error"
          );
          return;
        }

        if (start >= end) {
          showToast(
            `Start time must be before end time on ${dayItem.day}.`,
            "error"
          );
          return;
        }

        const durationMinutes = end - start;
        const durationHours = durationMinutes / 60;

        if (durationMinutes < 60) {
          showToast(
            `Each session slot must be at least 1 hour. Invalid slot on ${dayItem.day}: ${slot}`,
            "error"
          );
          return;
        }

        if (durationMinutes > 180) {
          showToast(
            `Each session slot cannot exceed 3 hours. Invalid slot on ${dayItem.day}: ${slot}`,
            "error"
          );
          return;
        }

        if (!Number.isInteger(durationHours)) {
          showToast(
            `Session slots must be exactly 1, 2, or 3 hours. Invalid slot on ${dayItem.day}: ${slot}`,
            "error"
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

      showToast(
        "Availability schedule saved successfully!"
      );
    } catch (err) {
      showToast(
        err?.response?.data?.message ||
          "Failed to save availability.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProfessionalLayout>
      <div
        className="min-h-screen pb-16"
        style={{ background: "#f5f7f2" }}
      >
        {toast && (
          <div
            className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-xl text-white text-sm font-bold border transition-all ${
              toast.type === "error"
                ? "bg-rose-500 border-rose-600"
                : "bg-emerald-600 border-emerald-700"
            }`}
            style={{ animation: "modalIn 0.2s ease" }}
          >
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div className="px-8 pt-8 pb-4 flex items-center justify-between flex-wrap gap-4">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Schedule Management
            </span>

            <h1 className="text-3xl font-black text-stone-800 tracking-tight mt-2">
              Availability Schedule
            </h1>

            <p className="text-stone-500 font-medium text-sm mt-1">
              Configure available days and session slots from
              1 to 3 hours for client bookings.
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold text-white text-sm shadow-xs hover:opacity-90 disabled:opacity-60 transition-all"
            style={{
              background:
                "linear-gradient(135deg, #10b981, #059669)",
            }}
          >
            <IconSave className="w-4 h-4" />

            <span>
              {saving
                ? "Saving..."
                : "Save Availability Schedule"}
            </span>
          </button>
        </div>

        {/* Duration Rule */}
        <div className="px-8 mb-5 max-w-4xl">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-xs font-bold text-emerald-800">
              Session Slot Rule
            </p>

            <p className="text-xs font-medium text-emerald-700 mt-1">
              Each availability slot must be exactly 1, 2, or
              3 hours long. For example: 9:00 AM - 10:00 AM
              or 1:00 PM - 4:00 PM.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-52">
            <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="px-8 max-w-4xl space-y-4">
            <div className="grid gap-4">
              {DAYS_OF_WEEK.map((day) => {
                const dayItem = availability.find(
                  (item) => item.day === day
                );

                const isActive = !!dayItem;

                const input = slotInputs[day] || {
                  start: "09:00",
                  end: "10:00",
                };

                return (
                  <div
                    key={day}
                    className={`rounded-3xl border p-5 transition-all ${
                      isActive
                        ? "bg-white border-stone-200 shadow-xs"
                        : "bg-stone-50/70 border-stone-200/60 opacity-75"
                    }`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id={`check-${day}`}
                          checked={isActive}
                          onChange={() =>
                            handleToggleDay(day)
                          }
                          className="w-5 h-5 accent-emerald-600 rounded-lg cursor-pointer"
                        />

                        <label
                          htmlFor={`check-${day}`}
                          className="font-extrabold text-stone-800 text-base cursor-pointer"
                        >
                          {day}
                        </label>
                      </div>

                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full border ${
                          isActive
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-stone-100 text-stone-500 border-stone-200"
                        }`}
                      >
                        {isActive
                          ? `${
                              dayItem.slots?.length || 0
                            } Slots Active`
                          : "Off / Unavailable"}
                      </span>
                    </div>

                    {isActive && (
                      <div className="space-y-3 pt-2 border-t border-stone-100">
                        {/* Current Slots */}
                        <div className="flex flex-wrap gap-2">
                          {dayItem.slots &&
                          dayItem.slots.length > 0 ? (
                            dayItem.slots.map(
                              (slot, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-100 text-stone-800 border border-stone-200 text-xs font-bold"
                                >
                                  <IconClock className="w-3.5 h-3.5 text-stone-500" />

                                  {slot}

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveSlot(
                                        day,
                                        sIdx
                                      )
                                    }
                                    className="text-stone-400 hover:text-rose-600 transition-colors ml-1"
                                  >
                                    <IconTrash className="w-3.5 h-3.5" />
                                  </button>
                                </span>
                              )
                            )
                          ) : (
                            <p className="text-xs text-stone-400 font-medium">
                              No time slots configured for{" "}
                              {day}. Add one below.
                            </p>
                          )}
                        </div>

                        {/* Add New Slot */}
                        <div className="flex items-center gap-3 max-w-lg pt-1 flex-wrap bg-stone-50 p-3 rounded-2xl border border-stone-200">
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-stone-500 mb-0.5">
                              Start
                            </label>

                            <input
                              type="time"
                              value={input.start}
                              onChange={(e) =>
                                handleTimeChange(
                                  day,
                                  "start",
                                  e.target.value
                                )
                              }
                              className="px-2.5 py-1.5 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-800 outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase text-stone-500 mb-0.5">
                              End
                            </label>

                            <input
                              type="time"
                              value={input.end}
                              onChange={(e) =>
                                handleTimeChange(
                                  day,
                                  "end",
                                  e.target.value
                                )
                              }
                              className="px-2.5 py-1.5 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-800 outline-none"
                            />
                          </div>

                          <div className="pt-3.5">
                            <button
                              type="button"
                              onClick={() =>
                                handleAddSlot(day)
                              }
                              className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold hover:bg-emerald-200 transition-colors shrink-0"
                            >
                              <IconPlus className="w-3.5 h-3.5" />

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
};
