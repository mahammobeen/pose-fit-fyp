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
      icon: <IconUsers className="size-6 text-indigo-600" />,
      trend: "+12.5%",
      color: "from-indigo-50/50 to-white",
    },
    {
      title: "Active Today",
      value: dbStats.activeToday ?? 0,
      description: "Users active in last 24h",
      icon: <IconActivity className="size-6 text-emerald-600" />,
      trend: "+5.2%",
      color: "from-emerald-50/50 to-white",
    },
    {
      title: "New Users",
      value: dbStats.newUsers ?? 0,
      description: "Joined this week",
      icon: <IconUserPlus className="size-6 text-blue-600" />,
      trend: "+18%",
      color: "from-blue-50/50 to-white",
    },
    {
      title: "Conversion",
      value: dbStats.conversionRate ?? "0%",
      description: "Free to Premium",
      icon: <IconChartBar className="size-6 text-amber-600" />,
      trend: "+2.4%",
      color: "from-amber-50/50 to-white",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-6 py-8">
      {stats.map((stat, index) => (
        <div
          key={index}
          className={`overflow-hidden border-none shadow-sm bg-linear-to-br ${stat.color} hover:shadow-md transition-all duration-300 rounded-3xl bg-white`}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">

              <div className="p-3 bg-white rounded-2xl shadow-xs">
                {stat.icon}
              </div>

              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                {stat.trend}
              </span>
            </div>

            <p className="text-gray-500 font-medium text-sm mb-1">
              {stat.title}
            </p>

            <h2 className="text-3xl font-black text-gray-900 tracking-tight">
              {stat.value}
            </h2>

            <p className="text-[10px] text-gray-400 mt-2 font-medium uppercase tracking-wider">
              {stat.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}