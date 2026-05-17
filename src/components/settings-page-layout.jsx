"use client"

import { Link } from "react-router-dom"
import { ArrowLeft, ChevronRight } from "lucide-react"
import MobileHeader from "./mobile-header"
import { SfPageHeader } from "./sf-primitives"

/**
 * Shared Service Blue chrome for every Settings sub-page.
 *
 * Settings routes live inside <AppLayout /> so the global topbar +
 * sidebar are already mounted by the router. This wrapper provides
 * only the per-page chrome: v2 PageHeader with a 'Settings › title'
 * breadcrumb plus a centered content container.
 *
 * Replaces the per-page Sidebar import + custom header that every
 * sub-page used to roll on its own.
 */
export const SettingsPageLayout = ({
  title,
  subtitle,
  actions,
  children,
  maxWidth = 960,
}) => (
  <div
    className="min-h-screen bg-[var(--sf-bg-page)]"
    style={{ fontFamily: "var(--sf-font-ui)" }}
  >
    <MobileHeader pageTitle={title} />

    <SfPageHeader
      eyebrow={
        <Link
          to="/settings"
          className="inline-flex items-center gap-1 text-[var(--sf-ink-3)] hover:text-[var(--sf-ink-2)] transition-colors"
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: ".06em",
            textTransform: "uppercase",
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={11} />
          <span>Settings</span>
          <ChevronRight size={11} className="text-[var(--sf-ink-4)]" />
          <span>{title}</span>
        </Link>
      }
      title={title}
      subtitle={subtitle}
      actions={actions}
    />

    <div
      className="px-4 sm:px-6 lg:px-8 py-5 mx-auto w-full"
      style={{ maxWidth }}
    >
      {children}
    </div>
  </div>
)

export default SettingsPageLayout
