import { useEffect, useState } from "react";
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

/* =========================================================
   STAT CARD
   ========================================================= */

const StatCard = ({
  title,
  value,
  description,
  Icon,
  bgGradient,
  border,
  iconBg,
  trend,
}) => (
  <div
    className="rounded-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover border backdrop-blur-xl"
    style={{
      background: bgGradient,
      borderColor: border,
    }}
  >
    <div className="flex items-center justify-between mb-4">
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-card"
        style={{ background: iconBg }}
      >
        <Icon className="w-6 h-6 text-brand-dark" />
      </div>

      {trend && (
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-brand-light/50 text-brand-dark border border-brand-light">
          {trend}
        </span>
      )}
    </div>

    <p className="text-stone-500 font-semibold text-xs uppercase tracking-wider mb-1">
      {title}
    </p>

    <h2 className="text-3xl font-black text-gray-800 tracking-tight">
      {value}
    </h2>

    <p className="text-xs text-stone-400 mt-2 font-medium">{description}</p>
  </div>
);

/* =========================================================
   ADMIN DASHBOARD
   ========================================================= */

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState([]);
  const [paymentSummary, setPaymentSummary] = useState({
    totalRevenue: 0,
    totalCommission: 0,
    count: 0,
  });
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

  /* =========================================================
     LOADING
     ========================================================= */

  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center bg-transparent font-sans">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-brand-light border-t-brand rounded-full animate-spin mx-auto mb-4" />

            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">
              Loading Dashboard...
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  /* =========================================================
     STAT CARDS
     ========================================================= */

  const statCards = [
    {
      title: "Total Users",
      value: stats?.totalUsers ?? 0,
      description: "Lifetime registered users",
      Icon: IconUsers,
      bgGradient:
        "linear-gradient(135deg, rgba(183, 228, 199, 0.38) 0%, rgba(255, 253, 245, 0.95) 100%)",
      border: "#b7e4c7",
      iconBg: "rgba(183, 228, 199, 0.65)",
      trend: "+12.5%",
    },
    {
      title: "Active Today",
      value: stats?.activeToday ?? 0,
      description: "Users active in last 24h",
      Icon: IconTrendingUp,
      bgGradient:
        "linear-gradient(135deg, rgba(255, 216, 177, 0.38) 0%, rgba(255, 253, 245, 0.95) 100%)",
      border: "#ffd8b1",
      iconBg: "rgba(255, 216, 177, 0.65)",
      trend: "+5.2%",
    },
    {
      title: "New This Week",
      value: stats?.newUsers ?? 0,
      description: "Joined in last 7 days",
      Icon: IconUserPlus,
      bgGradient:
        "linear-gradient(135deg, rgba(183, 228, 199, 0.38) 0%, rgba(255, 253, 245, 0.95) 100%)",
      border: "#b7e4c7",
      iconBg: "rgba(183, 228, 199, 0.65)",
      trend: "+18%",
    },
    {
      title: "Professionals",
      value: stats?.totalProfessionals ?? 0,
      description: "Registered professionals",
      Icon: IconProfessional,
      bgGradient:
        "linear-gradient(135deg, rgba(208, 235, 255, 0.45) 0%, rgba(255, 253, 245, 0.95) 100%)",
      border: "#d0ebff",
      iconBg: "rgba(208, 235, 255, 0.7)",
      trend: null,
    },
    {
      title: "Conversion Rate",
      value: stats?.conversionRate ?? "0%",
      description: "Verified vs total users",
      Icon: IconReceipt,
      bgGradient:
        "linear-gradient(135deg, rgba(255, 216, 177, 0.32) 0%, rgba(255, 253, 245, 0.95) 100%)",
      border: "#ffd8b1",
      iconBg: "rgba(255, 216, 177, 0.6)",
      trend: "+2.4%",
    },
    {
      title: "Total Revenue",
      value: `$${(paymentSummary.totalRevenue || 0).toFixed(2)}`,
      description: "From completed payments",
      Icon: IconDollarSign,
      bgGradient:
        "linear-gradient(135deg, rgba(183, 228, 199, 0.42) 0%, rgba(255, 253, 245, 0.95) 100%)",
      border: "#b7e4c7",
      iconBg: "rgba(183, 228, 199, 0.7)",
      trend: null,
    },
    {
      title: "Admin Commission",
      value: `$${(paymentSummary.totalCommission || 0).toFixed(2)}`,
      description: "20% platform fee earned",
      Icon: IconBuilding,
      bgGradient:
        "linear-gradient(135deg, rgba(255, 216, 177, 0.38) 0%, rgba(255, 253, 245, 0.95) 100%)",
      border: "#ffd8b1",
      iconBg: "rgba(255, 216, 177, 0.65)",
      trend: null,
    },
    {
      title: "Transactions",
      value: paymentSummary.count,
      description: "Total payment records",
      Icon: IconPayment,
      bgGradient:
        "linear-gradient(135deg, rgba(208, 235, 255, 0.4) 0%, rgba(255, 253, 245, 0.95) 100%)",
      border: "#d0ebff",
      iconBg: "rgba(208, 235, 255, 0.65)",
      trend: null,
    },
  ];

  /* =========================================================
     UI
     ========================================================= */

  return (
    <AdminLayout>
      <div className="min-h-screen pb-16 bg-transparent font-sans">
        {/* =================================================
            HEADER BANNER
        ================================================= */}

        <div className="px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-4">
          <div
            className="
              rounded-card
              border border-brand-light/60
              bg-surface/75
              backdrop-blur-xl
              shadow-card
              p-6 sm:p-7
            "
          >
            <span className="inline-flex text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-brand-light/50 text-brand-dark border border-brand-light">
              Dashboard Overview
            </span>

            <h1 className="text-2xl sm:text-3xl font-black text-gray-800 tracking-tight mt-3">
              PoseFit Admin Dashboard
            </h1>

            <p className="text-gray-500 font-medium text-sm mt-1">
              Platform-wide operations and subscriber insights.
            </p>
          </div>
        </div>

        {/* =================================================
            STATS GRID
        ================================================= */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 px-4 sm:px-6 lg:px-8 py-4">
          {statCards.map((card, i) => (
            <StatCard key={i} {...card} />
          ))}
        </div>

        {/* =================================================
            ANALYTICS
        ================================================= */}

        <div className="px-4 sm:px-6 lg:px-8 mt-4">
          <div className="rounded-card p-5 sm:p-7 border border-brand-light/50 bg-surface/80 shadow-card backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
              <div>
                <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
                  <IconTrendingUp className="w-5 h-5 text-brand-dark" />
                  User Registrations (Last 7 Days)
                </h2>

                <p className="text-xs text-gray-500 font-medium mt-1">
                  Daily signups tracked over the last 7 days.
                </p>
              </div>

              <span className="text-xs font-bold text-gray-600 bg-brand-light/20 px-3 py-1.5 rounded-full border border-brand-light/60 self-start sm:self-auto">
                Last 7 Days
              </span>
            </div>

            {analytics.length > 0 ? (
              <div className="space-y-3.5">
                {analytics.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 sm:gap-4">
                    <div className="w-16 sm:w-20 text-xs font-bold text-gray-500 shrink-0">
                      {item.date}
                    </div>

                    <div className="flex-1 h-8 bg-brand-light/15 rounded-2xl overflow-hidden relative border border-brand-light/40">
                      <div
                        className="h-full rounded-2xl transition-all duration-700"
                        style={{
                          width: `${Math.max(
                            (item.registrations / maxReg) * 100,
                            item.registrations > 0 ? 6 : 0,
                          )}%`,
                          background:
                            "linear-gradient(90deg, #b7e4c7, #53b889, #16845b)",
                        }}
                      />

                      {item.registrations > 0 && (
                        <span className="absolute inset-0 flex items-center pl-3 text-brand-dark text-xs font-extrabold">
                          {item.registrations} user
                          {item.registrations > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    <div className="w-8 sm:w-10 text-right text-sm font-black text-gray-700 shrink-0">
                      {item.registrations || 0}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-gray-400 text-sm font-medium">
                No registration data available.
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
