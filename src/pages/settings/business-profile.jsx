"use client"

import { useState, useEffect, useRef } from "react"
import {
  Mail as MailIcon,
  Phone as PhoneIcon,
  Globe as GlobeIcon,
  Upload as UploadIcon,
  X as XIcon,
  Tag as TagIcon,
} from "lucide-react"
import { businessDetailsAPI } from "../../services/api"
import { useAuth } from "../../context/AuthContext"
import { useTimeFormat } from "../../context/TimeFormatContext"
import SettingsRailLayout from "../../components/settings-rail-layout"
import { SfCard, SfCardHeader } from "../../components/sf-primitives"

/**
 * Business profile sub-page (was the Business Details modal). Identity
 * + contact info that appears on customer-facing surfaces (bookings,
 * invoices, emails). Saves via businessDetailsAPI — same endpoint the
 * modal used.
 */

const INDUSTRIES = [
  "Residential cleaning",
  "Commercial cleaning",
  "Move-in / move-out cleaning",
  "Carpet cleaning",
  "Window washing",
  "Lawn care / landscaping",
  "Pool service",
  "Pest control",
  "HVAC / appliance",
  "Handyman / general services",
  "Other",
]

const BUSINESS_TYPES = [
  "Sole proprietor",
  "LLC · Limited Liability Company",
  "Partnership",
  "C-corp",
  "S-corp",
  "Non-profit",
]

const BusinessProfile = () => {
  const { user } = useAuth()
  const { setTimeFormat: setCtxTimeFormat } = useTimeFormat()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [dirty, setDirty] = useState(false)
  const initialRef = useRef(null)

  const [form, setForm] = useState({
    businessName: "",
    tagline: "",
    industry: "",
    businessType: "",
    logoUrl: "",
    businessEmail: "",
    phone: "",
    website: "",
    supportEmail: "",
    location: "",
    timezone: "America/New_York",
    currency: "US Dollar - USD",
    timeFormat: "12h",
    firstName: "",
    lastName: "",
    email: "",
  })

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const data = await businessDetailsAPI.getBusinessDetails(user.id)
        if (cancelled) return
        const next = {
          businessName:   data.businessName   || "",
          tagline:        data.tagline        || "",
          industry:       data.industry       || "",
          businessType:   data.businessType   || "",
          logoUrl:        data.logoUrl        || "",
          businessEmail:  data.businessEmail  || "",
          phone:          data.phone          || "",
          website:        data.website        || "",
          supportEmail:   data.supportEmail   || "",
          location:       data.location       || "",
          timezone:       data.timezone       || "America/New_York",
          currency:       data.currency       || "US Dollar - USD",
          timeFormat:     data.timeFormat === "24h" ? "24h" : "12h",
          firstName:      data.firstName      || "",
          lastName:       data.lastName       || "",
          email:          data.email          || "",
        }
        setForm(next)
        initialRef.current = next
        setDirty(false)
      } catch (e) {
        setMessage({ type: "error", text: "Failed to load business profile" })
      } finally {
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [user?.id])

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setDirty(true)
  }

  const handleDiscard = () => {
    if (initialRef.current) {
      setForm(initialRef.current)
      setDirty(false)
      setMessage(null)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      await businessDetailsAPI.updateBusinessDetails({
        userId: user.id,
        businessName: form.businessName,
        businessEmail: form.businessEmail,
        phone: form.phone,
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        timeFormat: form.timeFormat,
        // Forward the new fields; backend may ignore unknown ones until
        // the schema is extended — they don't break the save.
        tagline: form.tagline,
        industry: form.industry,
        businessType: form.businessType,
        website: form.website,
        supportEmail: form.supportEmail,
        location: form.location,
        timezone: form.timezone,
        currency: form.currency,
        logoUrl: form.logoUrl,
      })
      setCtxTimeFormat(form.timeFormat)
      initialRef.current = form
      setDirty(false)
      setMessage({ type: "success", text: "Saved" })
      setTimeout(() => setMessage(null), 2500)
    } catch (e) {
      setMessage({ type: "error", text: e?.response?.data?.error || "Failed to save" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsRailLayout
      title="Business profile"
      section="Account"
      subtitle="How your business appears to customers and on documents"
      onSave={dirty ? handleSave : undefined}
      onDiscard={dirty ? handleDiscard : undefined}
      saving={saving}
    >
      {message && (
        <div
          className="mb-4 rounded-md px-3 py-2 text-[12.5px] font-semibold"
          style={{
            background:
              message.type === "success" ? "var(--sf-green-soft)" : "var(--sf-red-soft)",
            color:
              message.type === "success" ? "var(--sf-green-dark)" : "var(--sf-red-dark)",
            border: `1px solid ${
              message.type === "success" ? "rgba(22,163,74,.25)" : "rgba(220,38,38,.25)"
            }`,
          }}
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <SfCard>
          <div className="py-16 text-center text-[12.5px] text-[var(--sf-ink-3)]">
            Loading business profile…
          </div>
        </SfCard>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Identity */}
          <SfCard padding={0}>
            <SfCardHeader title="Identity" />
            <div className="px-5 pb-5 flex flex-col gap-4">
              <Field
                label="Business name"
                hint="Shown on bookings, invoices, emails"
              >
                <TextInput
                  value={form.businessName}
                  onChange={(v) => update("businessName", v)}
                  placeholder="e.g. Sparkle Cleaning Co."
                />
              </Field>

              <Field
                label="Logo"
                hint="Square PNG/SVG · min 128×128"
              >
                <LogoUploader
                  url={form.logoUrl}
                  onChange={(v) => update("logoUrl", v)}
                />
              </Field>

              <Field
                label="Tagline"
                hint="Optional · displayed on booking page"
              >
                <TextInput
                  value={form.tagline}
                  onChange={(v) => update("tagline", v)}
                  placeholder="e.g. Sparkle-clean homes, every visit."
                />
              </Field>

              <Field label="Industry">
                <SelectInput
                  value={form.industry}
                  onChange={(v) => update("industry", v)}
                  options={INDUSTRIES}
                  placeholder="Select an industry"
                  icon={TagIcon}
                />
              </Field>

              <Field label="Business type">
                <SelectInput
                  value={form.businessType}
                  onChange={(v) => update("businessType", v)}
                  options={BUSINESS_TYPES}
                  placeholder="Select a business type"
                />
              </Field>
            </div>
          </SfCard>

          {/* Contact */}
          <SfCard padding={0}>
            <SfCardHeader title="Contact" />
            <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Business email">
                <TextInput
                  value={form.businessEmail}
                  onChange={(v) => update("businessEmail", v)}
                  placeholder="hello@yourbusiness.com"
                  icon={MailIcon}
                  type="email"
                />
              </Field>
              <Field label="Business phone">
                <TextInput
                  value={form.phone}
                  onChange={(v) => update("phone", v)}
                  placeholder="(555) 555-0000"
                  icon={PhoneIcon}
                  type="tel"
                />
              </Field>
              <Field label="Website">
                <TextInput
                  value={form.website}
                  onChange={(v) => update("website", v)}
                  placeholder="yourbusiness.com"
                  icon={GlobeIcon}
                />
              </Field>
              <Field label="Customer support email">
                <TextInput
                  value={form.supportEmail}
                  onChange={(v) => update("supportEmail", v)}
                  placeholder="support@yourbusiness.com"
                  icon={MailIcon}
                  type="email"
                />
              </Field>
            </div>
          </SfCard>

          {/* Address & regional */}
          <SfCard padding={0}>
            <SfCardHeader title="Address & regional" />
            <div className="px-5 pb-5 flex flex-col gap-4">
              <Field
                label="Business address"
                hint="Used for timezone and service-area defaults"
              >
                <TextInput
                  value={form.location}
                  onChange={(v) => update("location", v)}
                  placeholder="123 Main Street, City, ST 00000"
                />
              </Field>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Timezone">
                  <SelectInput
                    value={form.timezone}
                    onChange={(v) => update("timezone", v)}
                    options={[
                      "America/New_York",
                      "America/Chicago",
                      "America/Denver",
                      "America/Los_Angeles",
                      "America/Anchorage",
                      "Pacific/Honolulu",
                    ]}
                  />
                </Field>
                <Field label="Currency">
                  <SelectInput
                    value={form.currency}
                    onChange={(v) => update("currency", v)}
                    options={[
                      "US Dollar - USD",
                      "Canadian Dollar - CAD",
                      "British Pound - GBP",
                      "Euro - EUR",
                      "Australian Dollar - AUD",
                    ]}
                  />
                </Field>
                <Field label="Time format">
                  <div className="flex gap-2">
                    {["12h", "24h"].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => update("timeFormat", opt)}
                        className="flex-1 rounded-md"
                        style={{
                          padding: "8px",
                          fontSize: 12.5,
                          fontWeight: 600,
                          background:
                            form.timeFormat === opt
                              ? "var(--sf-blue-soft)"
                              : "var(--sf-panel)",
                          color:
                            form.timeFormat === opt
                              ? "var(--sf-blue-dark)"
                              : "var(--sf-ink-2)",
                          border: `1.5px solid ${
                            form.timeFormat === opt
                              ? "var(--sf-blue)"
                              : "var(--sf-border-soft)"
                          }`,
                          cursor: "pointer",
                          fontFamily: "var(--sf-font-ui)",
                        }}
                      >
                        {opt === "12h" ? "12-hour" : "24-hour"}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
            </div>
          </SfCard>
        </div>
      )}
    </SettingsRailLayout>
  )
}

// ── Form primitives ────────────────────────────────────────

const Field = ({ label, hint, children }) => (
  <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 items-start">
    <div>
      <div className="text-[12.5px] font-semibold text-[var(--sf-ink)]">
        {label}
      </div>
      {hint && (
        <div className="text-[11px] text-[var(--sf-ink-3)] mt-0.5 leading-snug">
          {hint}
        </div>
      )}
    </div>
    <div>{children}</div>
  </div>
)

const TextInput = ({ value, onChange, placeholder, icon: Icon, type = "text" }) => (
  <div
    className="flex items-center gap-2 rounded-md bg-[var(--sf-panel)] border border-[var(--sf-border-soft)] px-3"
    style={{ padding: "6px 10px" }}
  >
    {Icon && <Icon size={14} className="text-[var(--sf-ink-3)] flex-shrink-0" />}
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="flex-1 bg-transparent border-none outline-none text-[13px] text-[var(--sf-ink)]"
      style={{ padding: 0, boxShadow: "none", fontFamily: "var(--sf-font-ui)" }}
    />
  </div>
)

const SelectInput = ({ value, onChange, options, placeholder, icon: Icon }) => (
  <div
    className="flex items-center gap-2 rounded-md bg-[var(--sf-panel)] border border-[var(--sf-border-soft)] px-3"
    style={{ padding: "2px 10px" }}
  >
    {Icon && <Icon size={14} className="text-[var(--sf-ink-3)] flex-shrink-0" />}
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex-1 bg-transparent border-none outline-none text-[13px] text-[var(--sf-ink)]"
      style={{
        padding: "6px 0",
        boxShadow: "none",
        fontFamily: "var(--sf-font-ui)",
        appearance: "none",
        WebkitAppearance: "none",
      }}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  </div>
)

const LogoUploader = ({ url, onChange }) => {
  const [previewing, setPreviewing] = useState(false)
  // Upload integration is out of scope here — we accept a URL string
  // and surface the preview/remove controls so the layout matches the
  // prototype. Wiring this to the existing logo upload endpoint
  // (uploadToStorage / branding API) is a follow-up.
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-[64px] h-[64px] rounded-md flex items-center justify-center flex-shrink-0"
        style={{
          background: url ? "transparent" : "var(--sf-blue)",
          border: "1px solid var(--sf-border-soft)",
          overflow: "hidden",
        }}
      >
        {url ? (
          // eslint-disable-next-line jsx-a11y/img-redundant-alt
          <img src={url} alt="Logo preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span className="text-white font-bold text-[18px]" style={{ letterSpacing: "-0.02em" }}>
            S
          </span>
        )}
      </div>
      <div
        className="flex-1 rounded-md flex flex-col items-center justify-center"
        style={{
          padding: "16px",
          background: "var(--sf-panel-alt)",
          border: "1.5px dashed var(--sf-border-soft)",
          cursor: "pointer",
          minHeight: 64,
        }}
        onClick={() => setPreviewing(true)}
      >
        <UploadIcon size={14} className="text-[var(--sf-ink-3)] mb-1" />
        <span className="text-[11.5px] text-[var(--sf-ink-2)] font-medium">
          Drop new logo or click to browse
        </span>
      </div>
      {url && (
        <button
          onClick={() => onChange("")}
          className="text-[12px] font-semibold text-[var(--sf-red-dark)]"
          style={{ background: "transparent", border: "none", cursor: "pointer" }}
        >
          Remove
        </button>
      )}
      {previewing && (
        <div className="hidden">
          <XIcon />
        </div>
      )}
    </div>
  )
}

export default BusinessProfile
