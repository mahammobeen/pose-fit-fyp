const STATUS_STYLES = {
  // Payment statuses
  completed:            { bg: "bg-emerald-50",  text: "text-emerald-800", border: "border-emerald-200/60", dot: "bg-emerald-400",  label: "Completed"  },
  pending:              { bg: "bg-amber-50",    text: "text-amber-800",   border: "border-amber-200/60",   dot: "bg-amber-400",    label: "Pending"    },
  failed:               { bg: "bg-rose-50",     text: "text-rose-800",    border: "border-rose-200/60",    dot: "bg-rose-400",     label: "Failed"     },
  refunded:             { bg: "bg-sky-50",      text: "text-sky-800",     border: "border-sky-200/60",     dot: "bg-sky-400",      label: "Refunded"   },
  cancelled:            { bg: "bg-stone-100",   text: "text-stone-700",   border: "border-stone-200/60",   dot: "bg-stone-400",    label: "Cancelled"  },

  // Professional statuses flow
  invited:              { bg: "bg-blue-50",     text: "text-blue-800",    border: "border-blue-200/60",    dot: "bg-blue-400",     label: "Invited"    },
  INVITED:              { bg: "bg-blue-50",     text: "text-blue-800",    border: "border-blue-200/60",    dot: "bg-blue-400",     label: "Invited"    },
  pending_verification: { bg: "bg-amber-50",    text: "text-amber-800",   border: "border-amber-200/60",   dot: "bg-amber-400",    label: "Pending Verification" },
  PENDING_VERIFICATION: { bg: "bg-amber-50",    text: "text-amber-800",   border: "border-amber-200/60",   dot: "bg-amber-400",    label: "Pending Verification" },
  PENDING:              { bg: "bg-amber-50",    text: "text-amber-800",   border: "border-amber-200/60",   dot: "bg-amber-400",    label: "Pending"    },
  approved:             { bg: "bg-teal-50",     text: "text-teal-800",    border: "border-teal-200/60",    dot: "bg-teal-400",     label: "Approved & Live" },
  APPROVED:             { bg: "bg-teal-50",     text: "text-teal-800",    border: "border-teal-200/60",    dot: "bg-teal-400",     label: "Approved & Live" },
  rejected:             { bg: "bg-rose-50",     text: "text-rose-800",    border: "border-rose-200/60",    dot: "bg-rose-400",     label: "Rejected"   },
  REJECTED:             { bg: "bg-rose-50",     text: "text-rose-800",    border: "border-rose-200/60",    dot: "bg-rose-400",     label: "Rejected"   },

  // Verification
  verified:             { bg: "bg-emerald-50",  text: "text-emerald-800", border: "border-emerald-200/60", dot: "bg-emerald-400",  label: "Verified"   },
  unverified:           { bg: "bg-stone-100",   text: "text-stone-600",   border: "border-stone-200/60",   dot: "bg-stone-400",    label: "Unverified" },
};

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || {
    bg: "bg-stone-100", text: "text-stone-700", border: "border-stone-200", dot: "bg-stone-400", label: status,
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${style.bg} ${style.text} ${style.border}`}>
      <span className={`w-2 h-2 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}
