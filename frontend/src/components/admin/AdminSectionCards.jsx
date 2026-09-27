import {
  IconUsers,
  IconUserPlus,
  IconActivity,
  IconChartBar,
} from "@tabler/icons-react";

export function AdminSectionCards({ dbStats = {} }) {
  const stats = [
    {
      title: "Total Users",
      value: dbStats.totalUsers ?? 0,
      description: "Lifetime registered users",
      icon: <IconUsers className="size-6 text-brand-dark" />,
      trend: "+12.5%",
    },
    {
      title: "Active Today",
      value: dbStats.activeToday ?? 0,
      description: "Users active in last 24h",
      icon: <IconActivity className="size-6 text-brand-dark" />,
      trend: "+5.2%",
    },
    {
      title: "New Users",
      value: dbStats.newUsers ?? 0,
      description: "Joined this week",
      icon: <IconUserPlus className="size-6 text-brand-dark" />,
      trend: "+18%",
    },
    {
      title: "Conversion",
      value: dbStats.conversionRate ?? "0%",
      description: "Free to Premium",
      icon: <IconChartBar className="size-6 text-brand-dark" />,
      trend: "+2.4%",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 px-4 py-6 font-sans sm:px-6 lg:grid-cols-4 lg:px-8">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="group overflow-hidden rounded-card border border-brand-light/50 bg-surface/80 shadow-card backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
        >
          <div className="p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-light/70 bg-brand-light/30 transition-transform duration-300 group-hover:-translate-y-0.5">
                {stat.icon}
              </div>

              <span className="rounded-full border border-brand-light/70 bg-brand-light/30 px-2.5 py-1 text-xs font-bold text-brand-dark">
                {stat.trend}
              </span>
            </div>

            <p className="mb-1 text-sm font-semibold text-gray-500">
              {stat.title}
            </p>

            <h2 className="text-3xl font-extrabold tracking-tight text-gray-800">
              {stat.value}
            </h2>

            <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              {stat.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
