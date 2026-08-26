import { useState, useEffect, useCallback } from "react";
import ProfessionalLayout from "../../components/professional/ProfessionalLayout";
import { httpClient } from "../../lib/http";
import {
  IconSave,
  IconPlus,
  IconTrash,
  IconClock,
} from "../../components/admin/Icons";

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

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
        { day, slots: ["09:00 AM - 12:00 PM", "02:00 PM - 05:00 PM"] },
      ]);
    }
  };

  const handleTimeChange = (day, field, value) => {
    setSlotInputs((prev) => ({
      ...prev,
      [day]: { ...(prev[day] || { start: "09:00", end: "12:00" }), [field]: value },
    }));
  };

  const handleAddSlot = (day) => {
    const input = slotInputs[day] || { start: "09:00", end: "12:00" };
    const { start, end } = input;

    if (!start || !end) {
      showToast("Please choose both start and end times.", "error");
      return;
    }

    if (start >= end) {
      showToast("Start time must be strictly before end time.", "error");
      return;
    }

    const formattedSlot = `${formatTo12Hour(start)} - ${formatTo12Hour(end)}`;

    const dayItem = availability.find((item) => item.day === day);
    if (dayItem && dayItem.slots?.includes(formattedSlot)) {
      showToast("This exact slot is already added.", "error");
      return;
    }

    setAvailability((prev) =>
      prev.map((item) => {
        if (item.day === day) {
          return { ...item, slots: [...(item.slots || []), formattedSlot] };
        }
        return item;
      })
    );
  };

  const handleRemoveSlot = (day, slotIndex) => {
    setAvailability((prev) =>
      prev.map((item) => {
        if (item.day === day) {
          return { ...item, slots: item.slots.filter((_, i) => i !== slotIndex) };
        }
        return item;
      })
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await httpClient.put("/professional/availability", { availability });
      showToast("Availability schedule saved successfully!");
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to save availability.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProfessionalLayout>
      <div className="min-h-screen pb-16" style={{ background: "#f5f7f2" }}>
        {toast && (
          <div
            className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-xl text-white text-sm font-bold border transition-all ${
              toast.type === "error" ? "bg-rose-500 border-rose-600" : "bg-emerald-600 border-emerald-700"
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
            <h1 className="text-3xl font-black text-stone-800 tracking-tight mt-2">Availability Schedule</h1>
            <p className="text-stone-500 font-medium text-sm mt-1">
              Configure available days and 12-hour AM/PM time slots for client session bookings.
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold text-white text-sm shadow-xs hover:opacity-90 disabled:opacity-60 transition-all"
            style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
          >
            <IconSave className="w-4 h-4" />
            <span>{saving ? "Saving..." : "Save Availability Schedule"}</span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-52">
            <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="px-8 max-w-4xl space-y-4">
            <div className="grid gap-4">
              {DAYS_OF_WEEK.map((day) => {
                const dayItem = availability.find((item) => item.day === day);
                const isActive = !!dayItem;
                const input = slotInputs[day] || { start: "09:00", end: "12:00" };

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
                          onChange={() => handleToggleDay(day)}
                          className="w-5 h-5 accent-emerald-600 rounded-lg cursor-pointer"
                        />
                        <label htmlFor={`check-${day}`} className="font-extrabold text-stone-800 text-base cursor-pointer">
                          {day}
                        </label>
                      </div>

                      <span className={`text-xs font-bold px-3 py-1 rounded-full border ${isActive ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-stone-100 text-stone-500 border-stone-200"}`}>
                        {isActive ? `${dayItem.slots?.length || 0} Slots Active` : "Off / Unavailable"}
                      </span>
                    </div>

                    {isActive && (
                      <div className="space-y-3 pt-2 border-t border-stone-100">
                        {/* Current Slots Badges */}
                        <div className="flex flex-wrap gap-2">
                          {dayItem.slots && dayItem.slots.length > 0 ? (
                            dayItem.slots.map((slot, sIdx) => (
                              <span
                                key={sIdx}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-100 text-stone-800 border border-stone-200 text-xs font-bold"
                              >
                                <IconClock className="w-3.5 h-3.5 text-stone-500" />
                                {slot}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSlot(day, sIdx)}
                                  className="text-stone-400 hover:text-rose-600 transition-colors ml-1"
                                >
                                  ✕
                                </button>
                              </span>
                            ))
                          ) : (
                            <p className="text-xs text-stone-400 font-medium">No time slots configured for {day}. Add one below.</p>
                          )}
                        </div>

                        {/* Add New Slot Picker Bar */}
                        <div className="flex items-center gap-3 max-w-lg pt-1 flex-wrap bg-stone-50 p-3 rounded-2xl border border-stone-200">
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-stone-500 mb-0.5">Start</label>
                            <input
                              type="time"
                              value={input.start}
                              onChange={(e) => handleTimeChange(day, "start", e.target.value)}
                              className="px-2.5 py-1.5 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-800 outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase text-stone-500 mb-0.5">End</label>
                            <input
                              type="time"
                              value={input.end}
                              onChange={(e) => handleTimeChange(day, "end", e.target.value)}
                              className="px-2.5 py-1.5 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-800 outline-none"
                            />
                          </div>

                          <div className="pt-3.5">
                            <button
                              type="button"
                              onClick={() => handleAddSlot(day)}
                              className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold hover:bg-emerald-200 transition-colors shrink-0"
                            >
                              <IconPlus className="w-3.5 h-3.5" /> Add Slot
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
