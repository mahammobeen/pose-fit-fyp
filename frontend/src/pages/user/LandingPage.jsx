import { useRef, useState } from "react";
import { Link } from "react-router-dom";

import posefit_logo from "../../assets/posefit_logo.png";

export default function LandingPage() {
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const professionalsRef = useRef(null);
  const communityRef = useRef(null);
  const contactRef = useRef(null);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const ADMIN_EMAIL = "posefit0@gmail.com";

  const scrollToSection = (ref) => {
    ref.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-surface font-sans text-gray-700">
      {/* =====================================================
          HEADER
      ===================================================== */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-200/60 bg-white/95 backdrop-blur-lg">
        <div className="mx-auto flex min-h-[68px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* =================================================
              LOGO
          ================================================= */}
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex shrink-0 items-center gap-2"
          >
            {/* Logo Image */}
            <img
              src={posefit_logo}
              alt="PoseFit Logo"
              className="h-9 w-9 object-contain sm:h-10 sm:w-10"
            />

            {/* Logo Text */}
            <span className="text-lg font-bold tracking-tight text-gray-800 sm:text-xl">
              Pose<span className="text-brand">Fit</span>
            </span>
          </Link>

          {/* =================================================
              DESKTOP NAVIGATION
          ================================================= */}
          <nav className="hidden items-center gap-4 lg:flex xl:gap-7">
            <button
              type="button"
              onClick={() => scrollToSection(heroRef)}
              className="whitespace-nowrap text-xs font-semibold text-gray-600 transition-colors hover:text-brand-dark"
            >
              Home
            </button>

            <button
              type="button"
              onClick={() => scrollToSection(featuresRef)}
              className="whitespace-nowrap text-xs font-semibold text-gray-600 transition-colors hover:text-brand-dark"
            >
              Free Tools
            </button>

            <button
              type="button"
              onClick={() => scrollToSection(professionalsRef)}
              className="whitespace-nowrap text-xs font-semibold text-gray-600 transition-colors hover:text-brand-dark"
            >
              Hire a Pro
            </button>

            <button
              type="button"
              onClick={() => scrollToSection(communityRef)}
              className="whitespace-nowrap text-xs font-semibold text-gray-600 transition-colors hover:text-brand-dark"
            >
              For Professionals
            </button>

            <button
              type="button"
              onClick={() => scrollToSection(contactRef)}
              className="whitespace-nowrap text-xs font-semibold text-gray-600 transition-colors hover:text-brand-dark"
            >
              Contact
            </button>
          </nav>

          {/* =================================================
              DESKTOP BUTTONS
          ================================================= */}
          <div className="hidden items-center gap-2 lg:flex">
            <Link
              to="/user/login"
              className="rounded-lg px-3 py-2 text-xs font-bold text-brand-dark transition-colors hover:bg-brand-light/30 sm:px-4"
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

          {/* =================================================
              MOBILE MENU BUTTON
          ================================================= */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 transition-colors hover:bg-brand-light/30 lg:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <span className="material-symbols-outlined text-2xl">
              {mobileMenuOpen ? "close" : "menu"}
            </span>
          </button>
        </div>

        {/* =================================================
            MOBILE MENU
        ================================================= */}
        {mobileMenuOpen && (
          <div className="border-t border-gray-200/60 bg-white px-4 py-4 shadow-sm lg:hidden">
            <nav className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => scrollToSection(heroRef)}
                className="rounded-lg px-4 py-3 text-left text-sm font-semibold text-gray-700 transition-colors hover:bg-brand-light/20 hover:text-brand-dark"
              >
                Home
              </button>

              <button
                type="button"
                onClick={() => scrollToSection(featuresRef)}
                className="rounded-lg px-4 py-3 text-left text-sm font-semibold text-gray-700 transition-colors hover:bg-brand-light/20 hover:text-brand-dark"
              >
                Free Tools
              </button>

              <button
                type="button"
                onClick={() => scrollToSection(professionalsRef)}
                className="rounded-lg px-4 py-3 text-left text-sm font-semibold text-gray-700 transition-colors hover:bg-brand-light/20 hover:text-brand-dark"
              >
                Hire a Pro
              </button>

              <button
                type="button"
                onClick={() => scrollToSection(communityRef)}
                className="rounded-lg px-4 py-3 text-left text-sm font-semibold text-gray-700 transition-colors hover:bg-brand-light/20 hover:text-brand-dark"
              >
                For Professionals
              </button>

              <button
                type="button"
                onClick={() => scrollToSection(contactRef)}
                className="rounded-lg px-4 py-3 text-left text-sm font-semibold text-gray-700 transition-colors hover:bg-brand-light/20 hover:text-brand-dark"
              >
                Contact
              </button>
            </nav>

            {/* Mobile Auth Buttons */}
            <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3">
              <Link
                to="/user/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 rounded-lg border border-brand-light px-4 py-2.5 text-center text-xs font-bold text-brand-dark transition-colors hover:bg-brand-light/20"
              >
                Login
              </Link>

              <Link
                to="/user/register"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 rounded-lg bg-gray-800 px-4 py-2.5 text-center text-xs font-bold text-white transition-colors hover:bg-gray-700"
              >
                Sign Up
              </Link>
            </div>
          </div>
        )}
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

            <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-accent-orange/30 blur-3xl" />
          </div>

          <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 md:py-24 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-28">
            {/* HERO TEXT */}
            <div className="max-w-xl text-center lg:text-left">
              {/* Badge */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/65 px-4 py-2 backdrop-blur">
                <span className="h-2 w-2 animate-pulse rounded-full bg-brand" />

                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-dark sm:text-xs">
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
              <p className="mx-auto mt-6 max-w-lg text-base leading-7 text-gray-700 sm:text-lg lg:mx-0">
                Start free with AI-guided workouts, personalized diet plans, and
                posture correction. When you're ready for more, connect with a
                professional directly through PoseFit.
              </p>

              {/* Buttons */}
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                <Link to="/user/register" className="btn-primary text-center">
                  Start Free
                </Link>

                <button
                  type="button"
                  onClick={() => scrollToSection(professionalsRef)}
                  className="btn-secondary"
                >
                  Hire a Professional
                </button>
              </div>

              {/* Trust */}
              <div className="mt-7 flex items-center justify-center gap-2 lg:justify-start">
                <span className="material-symbols-outlined text-lg text-brand-dark">
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
                <div className="aspect-[4/3] overflow-hidden rounded-hero border-[6px] border-white/60 bg-white/30 shadow-xl backdrop-blur-xl">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDgE1XUpJJUBnUcm9nZeJbZZWdu-FqAJan-7gdJHSarWT87pQkkYObLqpYfLRvwu8rINxVICJyZXK2BhgrXDCNCLjaK_Y69LyBu8LGAHetHLlXZ2_lHpyn5zK29rvKRvODC-WyzKBbIzKL60T8UoF-tf3P162WS-dy5-qLhF2n4T9PLxD7t82uEEKCXwBFf690EUgzmnmCEhV-ejmnC2qr_nzXNnDOElLZ-3tNB0wn2NsxTZGQiDVGYABZBTQXWJV6j4XiDGZotYUg"
                    alt="Person exercising"
                    className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                  />

                  <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-transparent" />
                </div>

                {/* Verification Badge */}
                <div className="absolute -bottom-4 left-3 flex items-center gap-3 rounded-xl bg-white px-3 py-3 shadow-lg sm:-left-4 sm:px-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-light">
                    <span className="material-symbols-outlined text-lg text-brand-dark">
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
          className="scroll-offset bg-surface py-16 sm:py-20 md:py-24"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Heading */}
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-light/40 px-4 py-1.5">
                <span className="material-symbols-outlined text-base text-brand-dark">
                  redeem
                </span>

                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-dark sm:text-xs">
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
                    className={`card relative min-h-[210px] ${animationClass}`}
                  >
                    {/* FREE BADGE */}
                    <span className="absolute right-5 top-5 rounded-full bg-brand-light/30 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-brand-dark">
                      Free
                    </span>

                    {/* ICON */}
                    <div
                      className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor: item.color,
                      }}
                    >
                      <span className="material-symbols-outlined text-[22px] text-brand-dark">
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
          className="scroll-offset bg-white py-16 sm:py-20 md:py-24"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Heading */}
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent-orange/40 px-4 py-1.5">
                <span className="material-symbols-outlined text-base text-accent-orange-dark">
                  workspace_premium
                </span>

                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-accent-orange-dark sm:text-xs">
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
              <div className="rounded-card border border-accent-pink bg-surface p-6 transition-transform duration-300 hover:-translate-y-1">
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-pink">
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
              <div className="rounded-card border border-brand-light bg-surface p-6 transition-transform duration-300 hover:-translate-y-1">
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-light">
                  <span className="material-symbols-outlined text-[22px] text-brand-dark">
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
                to="/guest-professional"
                className="btn-primary w-full max-w-xs text-center sm:w-auto"
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
          className="scroll-offset bg-surface px-4 py-16 sm:px-6 sm:py-20 md:py-24"
        >
          <div className="mx-auto max-w-5xl overflow-hidden rounded-section bg-gradient-to-r from-brand-light to-accent-blue">
            <div className="flex flex-col items-center px-5 py-12 text-center sm:px-10 sm:py-14 md:px-16 md:py-16">
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
                className="btn-primary mt-7 w-full max-w-xs text-center sm:w-auto"
              >
                Join As a Professional
              </Link>

              {/* EMAIL */}
              <div className="mt-5 flex w-full max-w-md flex-col items-center justify-center gap-2 rounded-xl bg-white/70 px-4 py-3 sm:flex-row sm:px-5">
                <span className="material-symbols-outlined text-lg text-gray-700">
                  mail
                </span>

                <p className="text-center text-xs font-semibold text-gray-800 sm:text-sm">
                  Want to get hired? Email{" "}
                  <a
                    href={`mailto:${ADMIN_EMAIL}`}
                    className="text-brand-dark underline underline-offset-2"
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
          className="scroll-offset bg-surface px-4 py-16 sm:px-6 sm:py-20 md:py-24"
        >
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-light">
              <span className="material-symbols-outlined text-xl text-brand-dark">
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
              className="mt-5 inline-block break-all font-semibold text-brand-dark hover:underline sm:break-normal"
            >
              posefit0@gmail.com
            </a>
          </div>
        </section>
      </main>

      {/* =====================================================
          FOOTER
      ===================================================== */}
      <footer className="border-t border-gray-800 bg-gray-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
          {/* BOTTOM */}
          <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-center text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between sm:text-left">
            <p>© 2026 PoseFit. All rights reserved.</p>

            <p>Fitness guidance made simple.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
