import React, { useEffect, useState } from "react";
import { httpClient } from "../../lib/http";
import AdminLayout from "../../components/admin/AdminLayout";
import {
  IconUsers,
  IconTrendingUp,
  IconUserPlus,
  IconProfessional,
  IconPayment,
  IconDollarSign,
  IconBuilding,
  IconReceipt,
} from "../../components/admin/Icons";

const StatCard = ({ title, value, description, Icon, bgGradient, border, iconBg, trend }) => (
  <div
    className="rounded-3xl p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md border"
    style={{ background: bgGradient, borderColor: border }}
  >
    <div className="flex items-center justify-between mb-4">
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs"
        style={{ background: iconBg }}
      >
        <Icon className="w-6 h-6 text-stone-700" />
      </div>
      {trend && (
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100/80 text-emerald-800 border border-emerald-200/50">
          {trend}
        </span>
      )}
    </div>
    <p className="text-stone-500 font-semibold text-xs uppercase tracking-wider mb-1">{title}</p>
    <h2 className="text-3xl font-black text-stone-800 tracking-tight">{value}</h2>
    <p className="text-xs text-stone-400 mt-2 font-medium">{description}</p>
  </div>
);

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState([]);
  const [paymentSummary, setPaymentSummary] = useState({ totalRevenue: 0, totalCommission: 0, count: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [statsRes, analyticsRes, paymentsRes] = await Promise.all([
          httpClient.get("/admin/stats"),
          httpClient.get("/admin/analytics"),
          httpClient.get("/payment/admin/payments"),
        ]);
        setStats(statsRes.data?.stats || {});
        setAnalytics(analyticsRes.data?.data || []);
        const payments = paymentsRes.data;
        setPaymentSummary({
          totalRevenue: payments.totalRevenue || 0,
          totalCommission: payments.totalCommission || 0,
          count: payments.payments?.length || 0,
        });
      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const maxReg = Math.max(...analytics.map((a) => a.registrations || 0), 1);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div
              className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"
            />
            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Loading Dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const statCards = [
    {
      title: "Total Users",
      value: stats?.totalUsers ?? 0,
      description: "Lifetime registered users",
      Icon: IconUsers,
      bgGradient: "linear-gradient(135deg, #f2f7f2 0%, #ffffff 100%)",
      border: "#d8e6d8",
      iconBg: "#e2efe2",
      trend: "+12.5%",
    },
    {
      title: "Active Today",
      value: stats?.activeToday ?? 0,
      description: "Users active in last 24h",
      Icon: IconTrendingUp,
      bgGradient: "linear-gradient(135deg, #fef6f0 0%, #ffffff 100%)",
      border: "#fcdbc7",
      iconBg: "#fde3d3",
      trend: "+5.2%",
    },
    {
      title: "New This Week",
      value: stats?.newUsers ?? 0,
      description: "Joined in last 7 days",
      Icon: IconUserPlus,
      bgGradient: "linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)",
      border: "#bbf7d0",
      iconBg: "#dcfce7",
      trend: "+18%",
    },
    {
      title: "Professionals",
      value: stats?.totalProfessionals ?? 0,
      description: "Registered professionals",
      Icon: IconProfessional,
      bgGradient: "linear-gradient(135deg, #faf5ff 0%, #ffffff 100%)",
      border: "#e9d5ff",
      iconBg: "#f3e8ff",
      trend: null,
    },
    {
      title: "Conversion Rate",
      value: stats?.conversionRate ?? "0%",
      description: "Verified vs total users",
      Icon: IconReceipt,
      bgGradient: "linear-gradient(135deg, #fefce8 0%, #ffffff 100%)",
      border: "#fef08a",
      iconBg: "#fef9c3",
      trend: "+2.4%",
    },
    {
      title: "Total Revenue",
      value: `$${(paymentSummary.totalRevenue || 0).toFixed(2)}`,
      description: "From completed payments",
      Icon: IconDollarSign,
      bgGradient: "linear-gradient(135deg, #edf7ed 0%, #ffffff 100%)",
      border: "#c3e6c3",
      iconBg: "#d5edd5",
      trend: null,
    },
    {
      title: "Admin Commission",
      value: `$${(paymentSummary.totalCommission || 0).toFixed(2)}`,
      description: "20% platform fee earned",
      Icon: IconBuilding,
      bgGradient: "linear-gradient(135deg, #fff7ed 0%, #ffffff 100%)",
      border: "#ffedd5",
      iconBg: "#ffedd5",
      trend: null,
    },
    {
      title: "Transactions",
      value: paymentSummary.count,
      description: "Total payment records",
      Icon: IconPayment,
      bgGradient: "linear-gradient(135deg, #f5f5f4 0%, #ffffff 100%)",
      border: "#e7e5e4",
      iconBg: "#e7e5e4",
      trend: null,
    },
  ];

  return (
    <AdminLayout>
      <div className="min-h-screen pb-16" style={{ background: "#f5f7f2" }}>
        {/* Header Banner */}
        <div className="px-8 pt-8 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Dashboard Overview
              </span>
              <h1 className="text-3xl font-black text-stone-800 tracking-tight mt-2">
                PoseFit Admin Dashboard
              </h1>
              <p className="text-stone-500 font-medium text-sm mt-1">
                Platform-wide operations and subscriber insights.
              </p>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <div className="px-4 py-2 bg-white rounded-2xl border border-stone-200 shadow-xs flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-stone-700">API Live Sync</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 px-8 py-4">
          {statCards.map((card, i) => (
            <StatCard key={i} {...card} />
          ))}
        </div>

        {/* Analytics */}
        <div className="px-8 mt-4">
          <div className="bg-white rounded-3xl p-7 shadow-xs border border-stone-200/80">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-black text-stone-800 flex items-center gap-2">
                  <IconTrendingUp className="w-5 h-5 text-emerald-700" />
                  User Registrations (Last 7 Days)
                </h2>
                <p className="text-xs text-stone-400 font-medium mt-1">
                  Daily signups tracked over the last 7 days.
                </p>
              </div>
              <span className="text-xs font-bold text-stone-500 bg-stone-100 px-3 py-1.5 rounded-full border border-stone-200">
                Last 7 Days
              </span>
            </div>

            {analytics.length > 0 ? (
              <div className="space-y-3.5">
                {analytics.map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-20 text-xs font-bold text-stone-500 shrink-0">{item.date}</div>
                    <div className="flex-1 h-8 bg-stone-100/80 rounded-2xl overflow-hidden relative border border-stone-200/50">
                      <div
                        className="h-full rounded-2xl transition-all duration-700"
                        style={{
                          width: `${Math.max((item.registrations / maxReg) * 100, item.registrations > 0 ? 6 : 0)}%`,
                          background: "linear-gradient(90deg, #86efac, #4ade80, #22c55e)",
                        }}
                      />
                      {item.registrations > 0 && (
                        <span className="absolute inset-0 flex items-center pl-3 text-emerald-950 text-xs font-extrabold">
                          {item.registrations} user{item.registrations > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <div className="w-10 text-right text-sm font-black text-stone-700 shrink-0">
                      {item.registrations || 0}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-stone-400 text-sm font-medium">
                No registration data available.
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}