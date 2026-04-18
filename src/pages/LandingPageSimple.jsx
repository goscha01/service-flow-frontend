"use client"

import { useState } from "react"
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const painPoints = [
  { title: "Slow lead responses",      body: "New leads sit in inboxes while competitors reply in 60 seconds." },
  { title: "Scattered conversations",  body: "Yelp, SMS, WhatsApp, email — no single timeline, no context." },
  { title: "Manual scheduling chaos",  body: "Double-bookings, no-shows, and missed details, all by hand." },
  { title: "Messy cancellations",      body: "Cancellation fees and cleaner reimbursements fall through the cracks." },
  { title: "No profit visibility",     body: "You're guessing which jobs actually make money." },
  { title: "Forgotten follow-ups",     body: "Cold leads that could have closed — gone." },
]

const flowSteps = [
  { num: "1", label: "Lead arrives",     detail: "Thumbtack, Yelp, SMS, WhatsApp." },
  { num: "2", label: "Auto-reply sent",  detail: "Instantly — AI or template." },
  { num: "3", label: "Follow-ups run",   detail: "Until the lead responds." },
  { num: "4", label: "Job scheduled",    detail: "One-click conversion." },
  { num: "5", label: "Cleaner assigned", detail: "Full job details delivered." },
  { num: "6", label: "Cancellation handled", detail: "Fees + reimbursements, atomic." },
  { num: "7", label: "Paid & tracked",   detail: "Payment, analytics, history." },
]

const features = [
  {
    title: "Lead Capture & Conversion",
    tag: "LeadBridge integrated",
    items: [
      "Instant auto-replies across Yelp, Thumbtack, SMS",
      "AI-powered follow-ups until they respond",
      "Lead → Job conversion in one click",
      "No lost leads",
    ],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M4 4h16v12H5.17L4 17.17V4z" />
        <line x1="8" y1="9" x2="16" y2="9" />
        <line x1="8" y1="12" x2="13" y2="12" />
      </svg>
    ),
  },
  {
    title: "Unified Communication",
    tag: "Powered by Sigcore",
    items: [
      "SMS, WhatsApp & more in one timeline",
      "Every message tied to a job_id",
      "Full conversation history per customer",
      "No more switching apps",
    ],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    title: "Job Management",
    tag: "Operations core",
    items: [
      "Schedule with exact date and time",
      "Assign cleaners and teams",
      "Track every status transition",
      "Full job activity timeline",
    ],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    title: "Financial Control",
    tag: "Ledger-backed",
    items: [
      "Real profit-per-job tracking",
      "Cancellation fees & reimbursements",
      "Expenses (parking, supplies, tolls)",
      "Unified with payroll & balances",
    ],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    title: "Automation Engine",
    tag: "Always-on",
    items: [
      "Auto follow-ups until response",
      "Status sync across every system",
      "Smart triggers for each event",
      "No manual chasing",
    ],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
    ),
  },
  {
    title: "Real Analytics",
    tag: "Accurate numbers",
    items: [
      "Revenue per job & per cleaner",
      "Lead source performance",
      "Conversion rate breakdowns",
      "Profitability that's actually right",
    ],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
]

const offerIncludes = [
  "Full CRM + job management",
  "Lead automation (LeadBridge ready)",
  "Messaging infrastructure (Sigcore-powered)",
  "Financial tracking — profit, reimbursements, payroll-ready",
]

const CheckIcon = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const ArrowIcon = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
)

export default function LandingPageSimple() {
  const [email, setEmail] = useState("")
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleSubmit = (e) => {
    e.preventDefault()
    navigate(`/signup?email=${encodeURIComponent(email)}`)
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5F7FA", color: "#1A1D26" }}>
      {/* Header — matches CRM header style */}
      <header
        className="fixed top-0 left-0 right-0 z-50"
        style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E5EA" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center">
              <img src="/logo.svg" alt="ServiceFlow" className="h-9 w-auto" />
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <a href="#features" className="px-3 py-2 text-sm font-medium hover:bg-[#F0F4FF] rounded-[10px] transition-colors" style={{ color: "#5F6775" }}>
                Features
              </a>
              <a href="#how-it-works" className="px-3 py-2 text-sm font-medium hover:bg-[#F0F4FF] rounded-[10px] transition-colors" style={{ color: "#5F6775" }}>
                How it works
              </a>
              <a href="#pricing" className="px-3 py-2 text-sm font-medium hover:bg-[#F0F4FF] rounded-[10px] transition-colors" style={{ color: "#5F6775" }}>
                Pricing
              </a>
            </nav>

            <div className="flex items-center gap-2">
              {user ? (
                <>
                  <button
                    onClick={() => navigate("/dashboard")}
                    className="cursor-pointer px-4 py-2 text-sm font-medium rounded-[10px] hover:bg-[#F0F4FF] transition-colors"
                    style={{ color: "#5F6775" }}
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={handleLogout}
                    className="cursor-pointer px-4 py-2 text-sm font-medium rounded-[10px] hover:bg-[#F0F4FF] transition-colors"
                    style={{ color: "#5F6775" }}
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigate("/signin")}
                    className="cursor-pointer px-4 py-2 text-sm font-medium rounded-[10px] hover:bg-[#F0F4FF] transition-colors"
                    style={{ color: "#5F6775" }}
                  >
                    Sign in
                  </button>
                  <button
                    onClick={() => navigate("/signup")}
                    className="cursor-pointer px-5 py-2 text-sm font-semibold rounded-[10px] text-white transition-all"
                    style={{
                      background: "#2563EB",
                      boxShadow: "0 1px 3px rgba(37, 99, 235, 0.3)",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#1D4ED8"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(37, 99, 235, 0.35)" }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "#2563EB"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(37, 99, 235, 0.3)" }}
                  >
                    Start free trial
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-28 pb-16 sm:pt-36 sm:pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            <div className="lg:col-span-7">
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
                style={{ background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #DBEAFE" }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#2563EB" }} />
                <span className="text-xs font-semibold tracking-wide">Early access · Limited spots</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-bold leading-[1.1] tracking-tight" style={{ color: "#1A1D26" }}>
                Run your entire service business from one system.
              </h1>
              <p className="mt-6 text-lg leading-relaxed max-w-2xl" style={{ color: "#5F6775" }}>
                Leads, jobs, messaging, and payments — built for cleaning companies and home service teams who want
                to stop juggling tools and start closing more jobs with less effort.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 flex flex-col sm:flex-row gap-3 max-w-lg">
                <label htmlFor="hero-email" className="sr-only">Work email</label>
                <input
                  id="hero-email"
                  type="email"
                  placeholder="you@yourcompany.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1 px-4 py-3"
                  style={{ fontSize: "15px" }}
                />
                <button
                  type="submit"
                  className="cursor-pointer px-6 py-3 font-semibold text-white transition-all whitespace-nowrap inline-flex items-center justify-center gap-2"
                  style={{
                    background: "#2563EB",
                    borderRadius: "10px",
                    boxShadow: "0 1px 3px rgba(37, 99, 235, 0.3)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#1D4ED8"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(37, 99, 235, 0.35)" }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#2563EB"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(37, 99, 235, 0.3)" }}
                >
                  Start free trial
                  <ArrowIcon />
                </button>
              </form>
              <p className="mt-3 text-sm" style={{ color: "#8E95A2" }}>
                14-day free trial · No credit card required · Cancel anytime
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm" style={{ color: "#5F6775" }}>
                {["From lead", "to scheduled job", "to payment"].map((t, i) => (
                  <span key={t} className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full" style={{ background: "#F0FDF4", color: "#22C55E" }}>
                      <CheckIcon className="w-3 h-3" />
                    </span>
                    <span className="font-medium">{t}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Product preview card — mimics a CRM screen */}
            <div className="lg:col-span-5">
              <div
                className="relative"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E2E5EA",
                  borderRadius: "16px",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.08)",
                  overflow: "hidden",
                }}
              >
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: "1px solid #E2E5EA", background: "#F5F7FA" }}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#EF4444" }} />
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#F59E0B" }} />
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#22C55E" }} />
                  </div>
                  <div className="text-xs font-medium" style={{ color: "#8E95A2" }}>
                    service-flow.pro / jobs
                  </div>
                  <div className="w-10" />
                </div>

                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#8E95A2" }}>
                      Today · 6 jobs
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "#F0FDF4", color: "#15803D" }}>
                      All on-time
                    </span>
                  </div>

                  {[
                    { t: "Deep clean · 3BR", who: "Maria + Jose", time: "10:00 AM", status: "Scheduled", badge: "#EFF6FF", badgeText: "#1D4ED8", amt: "$340" },
                    { t: "Move-out clean", who: "Elena", time: "01:30 PM", status: "En route", badge: "#FFFBEB", badgeText: "#B45309", amt: "$520" },
                    { t: "Weekly recurring", who: "Maria", time: "03:00 PM", status: "Completed", badge: "#F0FDF4", badgeText: "#15803D", amt: "$180" },
                  ].map((j) => (
                    <div
                      key={j.t}
                      className="flex items-center justify-between p-3"
                      style={{ background: "#F9FAFB", border: "1px solid #E2E5EA", borderRadius: "10px" }}
                    >
                      <div>
                        <div className="text-sm font-semibold" style={{ color: "#1A1D26" }}>{j.t}</div>
                        <div className="text-xs mt-0.5" style={{ color: "#8E95A2" }}>{j.who} · {j.time}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold" style={{ color: "#1A1D26" }}>{j.amt}</div>
                        <div className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded mt-1" style={{ background: j.badge, color: j.badgeText }}>
                          {j.status}
                        </div>
                      </div>
                    </div>
                  ))}

                  <div
                    className="flex items-center justify-between p-3 mt-4"
                    style={{ background: "#EFF6FF", border: "1px solid #DBEAFE", borderRadius: "10px" }}
                  >
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#1D4ED8" }}>
                        New lead · Yelp
                      </div>
                      <div className="text-sm font-semibold mt-0.5" style={{ color: "#1A1D26" }}>
                        Sarah M. — Deep cleaning, 3BR
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-2 py-1 rounded-[10px] text-white" style={{ background: "#2563EB" }}>
                      Auto-replied
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pain */}
      <section className="py-16 sm:py-24" style={{ borderTop: "1px solid #E2E5EA", background: "#FFFFFF" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#2563EB" }}>
              The problem
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight" style={{ color: "#1A1D26" }}>
              You're losing money in places you don't even see.
            </h2>
            <p className="mt-4 text-lg leading-relaxed" style={{ color: "#5F6775" }}>
              You don't have a system. You have tools. And tools don't run your business — systems do.
            </p>
          </div>

          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {painPoints.map((p) => (
              <div
                key={p.title}
                className="p-6 transition-shadow hover:shadow-md"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E2E5EA",
                  borderRadius: "12px",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex-shrink-0 w-9 h-9 rounded-[10px] flex items-center justify-center"
                    style={{ background: "#FEF2F2", color: "#EF4444" }}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[15px]" style={{ color: "#1A1D26" }}>{p.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed" style={{ color: "#5F6775" }}>{p.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#2563EB" }}>
              How it works
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight" style={{ color: "#1A1D26" }}>
              One system that runs your operations, end-to-end.
            </h2>
            <p className="mt-4 text-lg leading-relaxed" style={{ color: "#5F6775" }}>
              ServiceFlow isn't just a CRM — it's your operations engine. A lead that lands at 9:42 AM becomes a
              paid, tracked job by evening. Without you.
            </p>
          </div>

          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {flowSteps.map((s, i) => {
              const isLast = i === flowSteps.length - 1
              return (
                <div
                  key={s.num}
                  className="p-5 transition-shadow hover:shadow-md"
                  style={{
                    background: isLast ? "#2563EB" : "#FFFFFF",
                    color: isLast ? "#FFFFFF" : "#1A1D26",
                    border: isLast ? "1px solid #1D4ED8" : "1px solid #E2E5EA",
                    borderRadius: "12px",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-[10px] flex items-center justify-center text-sm font-bold"
                    style={{
                      background: isLast ? "rgba(255,255,255,0.15)" : "#EFF6FF",
                      color: isLast ? "#FFFFFF" : "#2563EB",
                    }}
                  >
                    {s.num}
                  </div>
                  <div className="mt-4 font-semibold text-[15px]">{s.label}</div>
                  <div className="mt-1 text-sm" style={{ color: isLast ? "rgba(255,255,255,0.8)" : "#5F6775" }}>
                    {s.detail}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Demo placeholder */}
          <div
            className="mt-14 relative overflow-hidden"
            style={{
              background: "#FFFFFF",
              border: "1px solid #E2E5EA",
              borderRadius: "16px",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.08)",
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ borderBottom: "1px solid #E2E5EA", background: "#F5F7FA" }}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#EF4444" }} />
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#F59E0B" }} />
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#22C55E" }} />
              </div>
              <div className="text-xs font-medium" style={{ color: "#8E95A2" }}>Product demo · 90s</div>
              <div className="w-10" />
            </div>
            <div className="aspect-video flex items-center justify-center" style={{ background: "#F5F7FA" }}>
              <button
                type="button"
                className="cursor-pointer flex flex-col items-center group"
                aria-label="Play product demo"
              >
                <span
                  className="w-20 h-20 rounded-full flex items-center justify-center text-white transition-all"
                  style={{ background: "#2563EB", boxShadow: "0 4px 12px rgba(37, 99, 235, 0.35)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#1D4ED8" }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#2563EB" }}
                >
                  <svg className="w-8 h-8 ml-1" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="6 4 20 12 6 20 6 4" />
                  </svg>
                </span>
                <div className="mt-5 text-base font-semibold" style={{ color: "#1A1D26" }}>
                  See ServiceFlow in action
                </div>
                <div className="text-sm mt-1" style={{ color: "#8E95A2" }}>
                  Lead → Conversation → Job → Payment
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 sm:py-24" style={{ borderTop: "1px solid #E2E5EA", background: "#FFFFFF" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#2563EB" }}>
              Core capabilities
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight" style={{ color: "#1A1D26" }}>
              Everything you need. Nothing you don't.
            </h2>
            <p className="mt-4 text-lg leading-relaxed" style={{ color: "#5F6775" }}>
              Six capabilities, deeply integrated — so a lead that lands at 9:42 AM becomes a paid job with no
              manual work in between.
            </p>
          </div>

          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="p-6 transition-shadow hover:shadow-md"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E2E5EA",
                  borderRadius: "12px",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                }}
              >
                <div className="flex items-center justify-between">
                  <div
                    className="w-10 h-10 rounded-[10px] flex items-center justify-center"
                    style={{ background: "#EFF6FF", color: "#2563EB" }}
                  >
                    {f.icon}
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "#F5F7FA", color: "#5F6775" }}>
                    {f.tag}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-bold" style={{ color: "#1A1D26" }}>{f.title}</h3>
                <ul className="mt-4 space-y-2">
                  {f.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm leading-relaxed" style={{ color: "#5F6775" }}>
                      <CheckIcon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#22C55E" }} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why different — simple three-column comparison */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#2563EB" }}>
              Why it's different
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight" style={{ color: "#1A1D26" }}>
              Most CRMs store contacts. ServiceFlow runs the work.
            </h2>
          </div>

          <div className="mt-12 grid md:grid-cols-3 gap-4">
            {[
              { from: "Contact storage + notes", to: "An execution system", desc: "ServiceFlow doesn't just remember your customers — it runs the work end-to-end." },
              { from: "Manual ops",              to: "Fully automated",    desc: "Every repetitive step — replies, follow-ups, status sync — happens without you." },
              { from: "Generic CRM",             to: "Built for home services", desc: "Jobs, cleaners, cancellations, reimbursements — modeled for how you actually operate." },
            ].map((d, i) => (
              <div
                key={i}
                className="p-7"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E2E5EA",
                  borderRadius: "12px",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                }}
              >
                <div className="flex items-center gap-2 text-sm" style={{ color: "#8E95A2" }}>
                  <span className="line-through">{d.from}</span>
                </div>
                <div className="mt-2 text-xl font-bold" style={{ color: "#1A1D26" }}>
                  {d.to}
                </div>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: "#5F6775" }}>{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Offer */}
      <section id="pricing" className="py-16 sm:py-24" style={{ borderTop: "1px solid #E2E5EA", background: "#FFFFFF" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 items-start">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#2563EB" }}>
                Early access
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight" style={{ color: "#1A1D26" }}>
                Start running your business like a system.
              </h2>
              <p className="mt-4 text-lg leading-relaxed" style={{ color: "#5F6775" }}>
                You don't pay for software — you pay for control over your business.
              </p>
              <ul className="mt-8 space-y-3">
                {["14-day free trial", "No setup cost", "Cancel anytime"].map((x) => (
                  <li key={x} className="flex items-center gap-3 text-sm font-medium" style={{ color: "#1A1D26" }}>
                    <span
                      className="inline-flex items-center justify-center w-5 h-5 rounded-full"
                      style={{ background: "#F0FDF4", color: "#22C55E" }}
                    >
                      <CheckIcon className="w-3 h-3" />
                    </span>
                    {x}
                  </li>
                ))}
              </ul>
            </div>

            <div
              className="p-8"
              style={{
                background: "#FFFFFF",
                border: "1px solid #E2E5EA",
                borderRadius: "16px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
              }}
            >
              <div className="text-xs font-bold uppercase tracking-wider" style={{ color: "#8E95A2" }}>
                What you get
              </div>
              <ul className="mt-5 space-y-3">
                {offerIncludes.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5" style={{ background: "#EFF6FF", color: "#2563EB" }}>
                      <CheckIcon className="w-3 h-3" />
                    </span>
                    <span className="text-sm font-medium" style={{ color: "#1A1D26" }}>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 pt-6 space-y-2.5" style={{ borderTop: "1px solid #E2E5EA" }}>
                <button
                  onClick={() => navigate("/signup")}
                  className="cursor-pointer w-full px-6 py-3 font-semibold text-white transition-all inline-flex items-center justify-center gap-2"
                  style={{
                    background: "#2563EB",
                    borderRadius: "10px",
                    boxShadow: "0 1px 3px rgba(37, 99, 235, 0.3)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#1D4ED8"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(37, 99, 235, 0.35)" }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#2563EB"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(37, 99, 235, 0.3)" }}
                >
                  Start free trial
                  <ArrowIcon />
                </button>
                <button
                  onClick={() => navigate("/signup")}
                  className="cursor-pointer w-full px-6 py-3 font-semibold transition-colors"
                  style={{
                    background: "#FFFFFF",
                    color: "#1A1D26",
                    border: "1px solid #D1D5DB",
                    borderRadius: "10px",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#F5F7FA" }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#FFFFFF" }}
                >
                  Connect your leads
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final push */}
      <section className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight" style={{ color: "#1A1D26" }}>
            If your leads live in one place, messages in another, and jobs in a spreadsheet — you're not scaling.
            You're surviving.
          </h2>
          <p className="mt-6 text-lg" style={{ color: "#5F6775" }}>
            ServiceFlow turns your business into a system that runs itself.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate("/signup")}
              className="cursor-pointer px-6 py-3 font-semibold text-white transition-all inline-flex items-center justify-center gap-2"
              style={{
                background: "#2563EB",
                borderRadius: "10px",
                boxShadow: "0 1px 3px rgba(37, 99, 235, 0.3)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#1D4ED8"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(37, 99, 235, 0.35)" }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#2563EB"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(37, 99, 235, 0.3)" }}
            >
              Start free trial
              <ArrowIcon />
            </button>
            <a
              href="#how-it-works"
              className="px-6 py-3 font-semibold transition-colors inline-flex items-center justify-center"
              style={{
                background: "#FFFFFF",
                color: "#1A1D26",
                border: "1px solid #D1D5DB",
                borderRadius: "10px",
              }}
            >
              See demo
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10" style={{ borderTop: "1px solid #E2E5EA", background: "#FFFFFF" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="ServiceFlow" className="h-7 w-auto" />
            <span className="text-sm" style={{ color: "#8E95A2" }}>
              © {new Date().getFullYear()} ServiceFlow. All rights reserved.
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium" style={{ color: "#5F6775" }}>
            <a href="#features" className="hover:text-[#2563EB] transition-colors">Features</a>
            <a href="#pricing" className="hover:text-[#2563EB] transition-colors">Pricing</a>
            <button
              onClick={() => navigate("/signin")}
              className="cursor-pointer hover:text-[#2563EB] transition-colors"
            >
              Sign in
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
