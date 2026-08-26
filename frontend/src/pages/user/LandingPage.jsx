import React, { useRef } from "react";
import { Link } from "react-router-dom";

export default function LandingPage() {
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const professionalsRef = useRef(null);
  const communityRef = useRef(null);
  const contactRef = useRef(null);

  const ADMIN_EMAIL = "hiring@posefit.com";

  const scrollToSection = (ref) => {
    ref.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FFFDF5] text-gray-700 font-['Sora']">
      {/* =====================================================
          CUSTOM CSS
      ===================================================== */}
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap");

        @import url(
          "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,300..700,0..1,-25..200&display=swap"
        );

        .material-symbols-outlined {
          font-family: "Material Symbols Outlined";
          font-weight: normal;
          font-style: normal;
          font-size: 24px;
          line-height: 1;
          letter-spacing: normal;
          text-transform: none;
          display: inline-block;
          white-space: nowrap;
          word-wrap: normal;
          direction: ltr;
          -webkit-font-feature-settings: "liga";
          -webkit-font-smoothing: antialiased;
          font-feature-settings: "liga";
        }

        .hero-gradient {
          background:
            radial-gradient(
              circle at 82% 18%,
              rgba(255, 255, 255, 0.72),
              transparent 28%
            ),
            linear-gradient(
              135deg,
              #b7e4c7 0%,
              #d0ebff 52%,
              #ffd8b1 100%
            );
        }

        .scroll-offset {
          scroll-margin-top: 78px;
        }

        @media (max-width: 768px) {
          .scroll-offset {
            scroll-margin-top: 68px;
          }
        }

        @keyframes slideInLeft {
          from {
            transform: translateX(-25px);
            opacity: 0;
          }

          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slideInRight {
          from {
            transform: translateX(25px);
            opacity: 0;
          }

          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .animate-slide-in-left {
          animation: slideInLeft 0.6s ease-out forwards;
        }

        .animate-slide-in-right {
          animation: slideInRight 0.6s ease-out forwards;
        }
      `}</style>

      {/* =====================================================
          HEADER
      ===================================================== */}
      <header className="sticky top-0 z-50 border-b border-gray-200/60 bg-white/90 backdrop-blur-lg">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
          {/* LOGO */}
          <Link to="/" className="flex shrink-0 items-center gap-2">
            {/* Small Logo Icon */}
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#B7E4C7]">
              <span className="material-symbols-outlined text-[18px] text-[#16845b]">
                fitness_center
              </span>
            </div>

            {/* Logo Text */}
            <span className="text-lg font-bold tracking-tight text-gray-800">
              Pose<span className="text-[#53b889]">Fit</span>
            </span>
          </Link>

          {/* DESKTOP NAVIGATION */}
          <nav className="hidden items-center gap-6 lg:flex">
            <button
              type="button"
              onClick={() => scrollToSection(heroRef)}
              className="text-xs font-semibold text-gray-600 transition-colors hover:text-[#16845b]"
            >
              Home
            </button>

            <button
              type="button"
              onClick={() => scrollToSection(featuresRef)}
              className="text-xs font-semibold text-gray-600 transition-colors hover:text-[#16845b]"
            >
              Free Tools
            </button>

            <button
              type="button"
              onClick={() => scrollToSection(professionalsRef)}
              className="text-xs font-semibold text-gray-600 transition-colors hover:text-[#16845b]"
            >
              Hire a Pro
            </button>

            <button
              type="button"
              onClick={() => scrollToSection(communityRef)}
              className="text-xs font-semibold text-gray-600 transition-colors hover:text-[#16845b]"
            >
              For Professionals
            </button>

            <button
              type="button"
              onClick={() => scrollToSection(contactRef)}
              className="text-xs font-semibold text-gray-600 transition-colors hover:text-[#16845b]"
            >
              Contact
            </button>
          </nav>

          {/* HEADER BUTTONS */}
          <div className="flex items-center gap-2">
            <Link
              to="/user/login"
              className="rounded-lg px-3 py-2 text-xs font-bold text-[#16845b] transition-colors hover:bg-[#B7E4C7]/30 sm:px-4"
            >
              Login
            </Link>

            <Link
              to="/user/register"
              className="rounded-lg bg-gray-800 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-gray-700"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* =====================================================
          MAIN
      ===================================================== */}
      <main>
        {/* =====================================================
            HERO
        ===================================================== */}
        <section
          ref={heroRef}
          className="hero-gradient relative overflow-hidden scroll-offset"
        >
          {/* Background Decoration */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -left-24 top-16 h-60 w-60 rounded-full bg-white/25 blur-3xl" />

            <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-[#FFD8B1]/30 blur-3xl" />
          </div>

          <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:px-6 md:py-24 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-28">
            {/* HERO TEXT */}
            <div className="max-w-xl">
              {/* Badge */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/65 px-4 py-2 backdrop-blur">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#53b889]" />

                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#16845b] sm:text-xs">
                  Free Tools + Real Coaches
                </span>
              </div>

              {/* Heading */}
              <h1 className="text-4xl font-bold leading-[1.08] tracking-tight text-gray-800 sm:text-5xl lg:text-[3.6rem]">
                Your personal
                <br />
                <span className="text-white drop-shadow-sm">
                  fitness assistant
                </span>
              </h1>

              {/* Description */}
              <p className="mt-6 max-w-lg text-base leading-7 text-gray-700 sm:text-lg">
                Start free with AI-guided workouts, personalized diet plans, and
                posture correction. When you're ready for more, connect with a
                professional directly through PoseFit.
              </p>

              {/* Buttons */}
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/user/register"
                  className="rounded-xl bg-gray-800 px-7 py-3.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-gray-700"
                >
                  Start Free
                </Link>

                <button
                  type="button"
                  onClick={() => scrollToSection(professionalsRef)}
                  className="rounded-xl bg-white/75 px-7 py-3.5 text-sm font-bold text-gray-800 transition-all hover:-translate-y-0.5 hover:bg-white"
                >
                  Hire a Professional
                </button>
              </div>

              {/* Trust */}
              <div className="mt-7 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-[#16845b]">
                  check_circle
                </span>

                <span className="text-xs font-semibold text-gray-700 sm:text-sm">
                  3 free modules · No card required
                </span>
              </div>
            </div>

            {/* HERO IMAGE */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative w-full max-w-[470px]">
                <div className="aspect-[4/3] overflow-hidden rounded-[2.25rem] border-[6px] border-white/60 bg-white/30 shadow-xl backdrop-blur-xl">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDgE1XUpJJUBnUcm9nZeJbZZWdu-FqAJan-7gdJHSarWT87pQkkYObLqpYfLRvwu8rINxVICJyZXK2BhgrXDCNCLjaK_Y69LyBu8LGAHetHLlXZ2_lHpyn5zK29rvKRvODC-WyzKBbIzKL60T8UoF-tf3P162WS-dy5-qLhF2n4T9PLxD7t82uEEKCXwBFf690EUgzmnmCEhV-ejmnC2qr_nzXNnDOElLZ-3tNB0wn2NsxTZGQiDVGYABZBTQXWJV6j4XiDGZotYUg"
                    alt="Person exercising"
                    className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                  />

                  <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-transparent" />
                </div>

                {/* Verification Badge */}
                <div className="absolute -bottom-4 left-3 flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-lg sm:-left-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#B7E4C7]">
                    <span className="material-symbols-outlined text-lg text-[#16845b]">
                      check_circle
                    </span>
                  </div>

                  <div>
                    <p className="text-xs font-bold leading-tight text-gray-800">
                      Posture Verified
                    </p>

                    <p className="mt-0.5 text-[10px] text-gray-500">
                      Tracking active
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            FREE TOOLS
        ===================================================== */}
        <section
          ref={featuresRef}
          className="scroll-offset bg-[#FFFDF5] py-20 md:py-24"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            {/* Heading */}
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#B7E4C7]/40 px-4 py-1.5">
                <span className="material-symbols-outlined text-base text-[#16845b]">
                  redeem
                </span>

                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#16845b] sm:text-xs">
                  Free, forever
                </span>
              </div>

              <h2 className="text-3xl font-bold tracking-tight text-gray-800 md:text-4xl">
                Everything you need to start
              </h2>

              <p className="mt-4 text-sm leading-6 text-gray-500 sm:text-base">
                Get started with three powerful tools included with every
                PoseFit account.
              </p>
            </div>

            {/* FREE TOOL CARDS */}
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-3">
              {[
                {
                  icon: "chat_bubble",
                  title: "Chatbot",
                  color: "#B7E4C7",
                  text: "Get instant answers to your fitness and nutrition questions, any time of day.",
                },
                {
                  icon: "restaurant",
                  title: "Custom Diet Plans",
                  color: "#FFD8B1",
                  text: "Generate personalized meal plans based on your BMI, BMR, and TDEE.",
                },
                {
                  icon: "videocam",
                  title: "Posture Detection",
                  color: "#D0EBFF",
                  text: "Get live feedback on your exercise form through your webcam.",
                },
              ].map((item, index) => {
                const animationClass =
                  index % 2 === 0
                    ? "animate-slide-in-left"
                    : "animate-slide-in-right";

                return (
                  <div
                    key={item.title}
                    className={`relative min-h-[210px] rounded-2xl border border-gray-100 bg-white p-6 transition-transform duration-300 hover:-translate-y-1 ${animationClass}`}
                  >
                    {/* FREE BADGE */}
                    <span className="absolute right-5 top-5 rounded-full bg-[#EAF7EF] px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-[#16845b]">
                      Free
                    </span>

                    {/* ICON */}
                    <div
                      className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor: item.color,
                      }}
                    >
                      <span className="material-symbols-outlined text-[22px] text-[#16845b]">
                        {item.icon}
                      </span>
                    </div>

                    {/* TITLE */}
                    <h3 className="text-base font-bold text-gray-800">
                      {item.title}
                    </h3>

                    {/* TEXT */}
                    <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500">
                      {item.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* =====================================================
            PROFESSIONALS
        ===================================================== */}
        <section
          ref={professionalsRef}
          className="scroll-offset bg-white py-20 md:py-24"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            {/* Heading */}
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#FFD8B1]/40 px-4 py-1.5">
                <span className="material-symbols-outlined text-base text-[#d47a2e]">
                  workspace_premium
                </span>

                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#d47a2e] sm:text-xs">
                  Paid, on your terms
                </span>
              </div>

              <h2 className="text-3xl font-bold tracking-tight text-gray-800 md:text-4xl">
                Ready for a real coach?
              </h2>

              <p className="mt-4 text-sm leading-6 text-gray-500 sm:text-base">
                Browse verified professionals and book the right person for your
                fitness and nutrition goals.
              </p>
            </div>

            {/* TWO CARDS */}
            <div className="mx-auto grid max-w-4xl grid-cols-1 gap-5 md:grid-cols-2">
              {/* TRAINER */}
              <div className="rounded-2xl border border-[#FDE2E4] bg-[#FFFDF5] p-6 transition-transform duration-300 hover:-translate-y-1">
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#FDE2E4]">
                  <span className="material-symbols-outlined text-[22px] text-gray-700">
                    sports_gymnastics
                  </span>
                </div>

                <h3 className="text-base font-bold text-gray-800">
                  Certified Trainers
                </h3>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Book 1-on-1 sessions with certified trainers who can review
                  your form and create a program around your goals.
                </p>
              </div>

              {/* NUTRITION */}
              <div className="rounded-2xl border border-[#B7E4C7] bg-[#FFFDF5] p-6 transition-transform duration-300 hover:-translate-y-1">
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#B7E4C7]">
                  <span className="material-symbols-outlined text-[22px] text-[#16845b]">
                    nutrition
                  </span>
                </div>

                <h3 className="text-base font-bold text-gray-800">
                  Nutrition Coaches
                </h3>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Work with a qualified nutrition professional to fine-tune your
                  diet plan and build sustainable eating habits.
                </p>
              </div>
            </div>

            {/* BROWSE BUTTON */}
            <div className="mt-9 flex justify-center">
              <Link
                to="/professionals"
                className="rounded-xl bg-gray-800 px-8 py-3.5 text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-gray-700"
              >
                Browse Professionals
              </Link>
            </div>
          </div>
        </section>

        {/* =====================================================
            FOR PROFESSIONALS
        ===================================================== */}
        <section
          ref={communityRef}
          className="scroll-offset bg-[#FFFDF5] px-5 py-20 sm:px-6 md:py-24"
        >
          <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#B7E4C7] to-[#D0EBFF]">
            <div className="flex flex-col items-center px-6 py-14 text-center sm:px-10 md:px-16 md:py-16">
              {/* ICON */}
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-white/70">
                <span className="material-symbols-outlined text-2xl text-gray-800">
                  handshake
                </span>
              </div>

              {/* TITLE */}
              <h2 className="max-w-xl text-3xl font-bold leading-tight tracking-tight text-gray-800 md:text-4xl">
                Are you a fitness professional?
              </h2>

              {/* TEXT */}
              <p className="mt-4 max-w-xl text-sm leading-6 text-gray-700 sm:text-base">
                Join PoseFit as a certified trainer or nutrition professional
                and get discovered by clients using our free tools every day.
              </p>

              {/* BUTTON */}
              <Link
                to="/professional/login"
                className="mt-7 rounded-xl bg-gray-800 px-8 py-3.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-gray-700"
              >
                Join As a Professional
              </Link>

              {/* EMAIL */}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2 rounded-xl bg-white/70 px-5 py-3">
                <span className="material-symbols-outlined text-lg text-gray-700">
                  mail
                </span>

                <p className="text-xs font-semibold text-gray-800 sm:text-sm">
                  Want to get hired? Email{" "}
                  <a
                    href={`mailto:${ADMIN_EMAIL}`}
                    className="text-[#16845b] underline underline-offset-2"
                  >
                    {ADMIN_EMAIL}
                  </a>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            CONTACT
        ===================================================== */}
        <section
          ref={contactRef}
          className="scroll-offset bg-[#FFFDF5] px-5 py-20 sm:px-6 md:py-24"
        >
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#B7E4C7]">
              <span className="material-symbols-outlined text-xl text-[#16845b]">
                mail
              </span>
            </div>

            <h2 className="text-3xl font-bold tracking-tight text-gray-800 md:text-4xl">
              Get in touch
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-gray-500 sm:text-base">
              Have questions or suggestions? Our team would love to hear from
              you.
            </p>

            <a
              href="mailto:support@posefit.com"
              className="mt-5 inline-block font-semibold text-[#16845b] hover:underline"
            >
              support@posefit.com
            </a>
          </div>
        </section>
      </main>

      {/* =====================================================
          FOOTER
      ===================================================== */}
      <footer className="border-t border-gray-800 bg-gray-900 text-white">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-3">
            {/* BRAND */}
            <div>
              <Link to="/" className="inline-flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#B7E4C7]">
                  <span className="material-symbols-outlined text-[18px] text-[#16845b]">
                    fitness_center
                  </span>
                </div>

                <span className="text-lg font-bold">
                  Pose<span className="text-[#74C69D]">Fit</span>
                </span>
              </Link>

              <p className="mt-4 max-w-sm text-sm leading-6 text-gray-400">
                Your personal fitness assistant for smarter workouts,
                personalized nutrition, and better movement.
              </p>
            </div>

            {/* QUICK LINKS */}
            <div>
              <h3 className="text-sm font-bold text-white">Quick Links</h3>

              <div className="mt-4 flex flex-col gap-3">
                <Link
                  to="/"
                  className="text-sm text-gray-400 transition-colors hover:text-white"
                >
                  Home
                </Link>

                <Link
                  to="/professionals"
                  className="text-sm text-gray-400 transition-colors hover:text-white"
                >
                  Browse Professionals
                </Link>

                <Link
                  to="/user/login"
                  className="text-sm text-gray-400 transition-colors hover:text-white"
                >
                  Login
                </Link>

                <Link
                  to="/user/register"
                  className="text-sm text-gray-400 transition-colors hover:text-white"
                >
                  Create Account
                </Link>
              </div>
            </div>

            {/* CONTACT */}
            <div>
              <h3 className="text-sm font-bold text-white">Contact</h3>

              <div className="mt-4 space-y-3">
                <a
                  href="mailto:support@posefit.com"
                  className="block text-sm text-gray-400 transition-colors hover:text-white"
                >
                  support@posefit.com
                </a>

                <a
                  href={`mailto:${ADMIN_EMAIL}`}
                  className="block text-sm text-gray-400 transition-colors hover:text-white"
                >
                  Professional inquiries
                </a>
              </div>
            </div>
          </div>

          {/* BOTTOM */}
          <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 PoseFit. All rights reserved.</p>

            <p>Fitness guidance made simple.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
