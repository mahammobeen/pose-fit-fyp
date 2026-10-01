const STATUS_STYLES = {

  completed: {
    bg: "bg-brand-light/30",
    text: "text-brand-dark",
    border: "border-brand-light/70",
    dot: "bg-brand",
    label: "Completed",
  },

  pending: {
    bg: "bg-accent-orange/30",
    text: "text-accent-orange-dark",
    border: "border-accent-orange/70",
    dot: "bg-accent-orange-dark",
    label: "Pending",
  },

  failed: {
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-200/60",
    dot: "bg-rose-400",
    label: "Failed",
  },

  invited: {
    bg: "bg-accent-blue/40",
    text: "text-blue-800",
    border: "border-accent-blue",
    dot: "bg-blue-400",
    label: "Invited",
  },

  INVITED: {
    bg: "bg-accent-blue/40",
    text: "text-blue-800",
    border: "border-accent-blue",
    dot: "bg-blue-400",
    label: "Invited",
  },

  pending_verification: {
    bg: "bg-accent-orange/30",
    text: "text-accent-orange-dark",
    border: "border-accent-orange/70",
    dot: "bg-accent-orange-dark",
    label: "Pending Verification",
  },

  PENDING_VERIFICATION: {
    bg: "bg-accent-orange/30",
    text: "text-accent-orange-dark",
    border: "border-accent-orange/70",
    dot: "bg-accent-orange-dark",
    label: "Pending Verification",
  },

  PENDING: {
    bg: "bg-accent-orange/30",
    text: "text-accent-orange-dark",
    border: "border-accent-orange/70",
    dot: "bg-accent-orange-dark",
    label: "Pending",
  },

  approved: {
    bg: "bg-brand-light/30",
    text: "text-brand-dark",
    border: "border-brand-light/70",
    dot: "bg-brand",
    label: "Approved & Live",
  },

  APPROVED: {
    bg: "bg-brand-light/30",
    text: "text-brand-dark",
    border: "border-brand-light/70",
    dot: "bg-brand",
    label: "Approved & Live",
  },

  rejected: {
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-200/60",
    dot: "bg-rose-400",
    label: "Rejected",
  },

  REJECTED: {
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-200/60",
    dot: "bg-rose-400",
    label: "Rejected",
  },

  verified: {
    bg: "bg-brand-light/30",
    text: "text-brand-dark",
    border: "border-brand-light/70",
    dot: "bg-brand",
    label: "Verified",
  },

  unverified: {
    bg: "bg-stone-100",
    text: "text-stone-600",
    border: "border-stone-200/60",
    dot: "bg-stone-400",
    label: "Unverified",
  },
};

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || {
    bg: "bg-stone-100",
    text: "text-stone-700",
    border: "border-stone-200",
    dot: "bg-stone-400",
    label: status,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${style.bg} ${style.text} ${style.border}`}
    >
      <span className={`h-2 w-2 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}
