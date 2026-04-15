

# Notification Email Consolidation Plan

## Goal

Unify the two existing SendGrid-based systems into **one tenant-configurable Notification Email service** for outbound system and transactional emails.

This system will handle:

* internal alerts
* account setup emails
* team invites
* paystubs
* invoices
* receipts
* appointment reminders
* customer transactional notifications

This system will **not** handle:

* mailbox sync
* email inbox/history
* two-way conversation hub
* user mailbox connection

---

## Target end state

### One system only

A single **Notification Email Service** powered by SendGrid.

### Configuration moves from env to settings

Instead of one global:

* `SENDGRID_API_KEY`
* `SENDGRID_FROM_EMAIL`

move to **tenant/business-level settings** in the app.

### Existing communication-hub email path is repurposed

The current `email-service.js` and related SendGrid communication setup should be reduced or repurposed so it supports notification delivery settings only, not two-way inbox email.

---

## Architecture

## 1. New ownership model

### Notification Email Service

Owned by ServiceFlow backend.

Responsibilities:

* send transactional emails
* send internal alerts
* send customer notifications
* support per-tenant sender configuration
* provide test-send and status checks
* maintain delivery logs

### Not responsible for

* inbound parse
* conversation threading
* unified inbox storage
* connected mailbox sync

---

## 2. Configuration model

Create tenant-level notification email settings.

### Suggested settings table

`notification_email_settings`

Fields:

* `user_id` or `business_id` depending on your tenant model
* `provider` default `sendgrid`
* `is_enabled`
* `sendgrid_api_key`
* `from_email`
* `from_name`
* `reply_to_email`
* `reply_to_name`
* `use_for_customer_notifications` boolean
* `use_for_internal_notifications` boolean
* `created_at`
* `updated_at`

### Optional

* `last_tested_at`
* `last_test_status`
* `last_test_error`

---

## 3. Delivery log table

Create outbound log storage.

### Suggested table

`notification_email_logs`

Fields:

* `id`
* `user_id` or `business_id`
* `email_type`
* `recipient_email`
* `recipient_name`
* `subject`
* `status` (`queued`, `sent`, `failed`)
* `provider`
* `provider_message_id`
* `error_message`
* `metadata` jsonb
* `sent_at`
* `created_at`

This gives you:

* troubleshooting
* audit trail
* resend potential later

---

## 4. Refactor current code into one service

You currently have:

### System 1

* `sendEmail()`
* `sendTeamMemberEmail()`

### System 2

* `email-service.js` with per-user SendGrid integration and inbound logic

### Refactor target

Create one reusable service such as:

* `notification-email.service.js`
  or
* `mailer.service.js`

This service should expose methods like:

* `sendCustomerEmail()`
* `sendInternalEmail()`
* `sendTemplateEmail()`
* `sendTestEmail()`

All existing endpoints should call this shared service instead of using ad hoc SendGrid logic in different places.

---

## 5. Migrate System 1 into shared service

Take current `server.js` email logic and extract:

* SendGrid initialization
* sender resolution
* subject/body sending
* error handling
* test send

Then route all current transactional endpoints through the new service:

* estimates
* invoices
* receipts
* reminders
* custom messages
* invitations
* activation
* paystubs
* health alerts

This preserves current behavior while centralizing logic.

---

## 6. De-scope current communication email system

For the current `email-service.js` system:

### Remove from scope

* inbound webhook
* email threading
* conversation insertion into `communication_messages`
* unified inbox behavior
* per-user connected sender mailboxes for communication hub

### Keep only if useful

If parts of it are useful for settings UI, keep:

* connect / disconnect
* test API key
* sender configuration UI patterns

But repurpose them for **Notification Email Settings**, not communications inbox.

---

## 7. Settings UI

Create or update a settings section:

## Settings → Notification Email

Fields:

* provider = SendGrid
* API key
* From email
* From name
* Reply-to email
* Reply-to name
* toggles:

  * use for customer notifications
  * use for internal notifications
* Send test email button

### Status states

* Not configured
* Connected
* Test successful
* Test failed

This replaces the idea of “connect multiple sender emails for communication inbox.”

---

## 8. Sender model

For Notification Email, keep sender logic simple.

### Recommended

One default sender per tenant:

* `from_email`
* `from_name`

Optional later:

* different sender profiles by email type

For example:

* billing emails from `billing@company.com`
* alerts from `alerts@company.com`

But do not start there unless needed.

---

## 9. Endpoint refactor

Current endpoints should remain, but internally call the unified service.

Examples:

* `/api/send-invoice-email`
* `/api/send-receipt-email`
* `/api/send-appointment-notification`
* team invite flows
* paystub email flow
* health monitoring alerts

All become thin wrappers around:

* load tenant settings
* build template/body
* send via notification service
* log result

---

## 10. Remove communication coupling

Delete or disable any Notification Email assumptions that touch:

* `communication_messages`
* `communication_conversations`
* inbox UI
* `availableSendChannels`

Notification Email should not appear as a communications channel.

That is a crucial cleanup.

---

## 11. Template normalization

Right now you said templates are inline in endpoints.

Do not try to redesign all templates immediately, but start centralizing gradually.

### Phase 1

Keep current HTML/text generation where it is.

### Phase 2

Move templates into reusable functions/files:

* invoice template
* receipt template
* invite template
* reminder template

That makes the service easier to maintain.

---

## 12. Migration strategy

## Phase A — Data/settings foundation

* add `notification_email_settings`
* add `notification_email_logs`
* add settings UI

## Phase B — Service extraction

* create shared notification email service
* move current `sendEmail()` and `sendTeamMemberEmail()` into it

## Phase C — Endpoint migration

* update all existing email-sending endpoints to use shared service

## Phase D — Disable communication-email SendGrid path

* remove email from unified communications flow
* stop using `email-service.js` for communication hub
* remove inbound parse requirement
* remove email from `availableSendChannels`

## Phase E — Cleanup

* remove obsolete SendGrid communication config pieces
* keep only notification email config
* update docs and labels

---

## 13. What to do with the existing communication email DB work

If already implemented:

* leave migrations in place if removal is risky
* mark feature as inactive
* do not surface it in UI
* do not continue building on it

If not implemented yet:

* stop before adding:

  * inbound parse webhook
  * communication threading
  * email channel in inbox

---

## 14. Acceptance criteria

The consolidation is complete when:

1. All current outbound emails use one shared notification service
2. Notification email settings are configurable per tenant in UI
3. Global env-only sender dependency is no longer required for tenant sending
4. Notification sends are logged
5. No SendGrid email appears in unified communications inbox
6. No inbound parse or threading is required
7. Existing customer and internal email flows still work

---

## 15. Recommended naming

Use clear names to prevent future confusion.

### Product/UI

* Notification Email
* System Email Delivery

### Backend

* `notification-email.service`
* `notification_email_settings`
* `notification_email_logs`

Avoid naming it:

* email channel
* inbox email
* communication email

because that will blur it with the future mailbox integration system.

# AI-agent task version

## TASK — Consolidate Existing SendGrid Email Systems into One Notification Email Service

### Goal

Merge the current two SendGrid-based email implementations into a single tenant-configurable outbound Notification Email service. This service is for transactional, internal, and customer notification emails only. It must not support inbox sync, inbound parsing, threading, or communications hub integration.

### Scope

Unify:

* existing `sendEmail()` and `sendTeamMemberEmail()` logic in `server.js`
* useful outbound SendGrid configuration pieces from `email-service.js`

Remove from this system:

* inbound parse webhook
* unified inbox integration
* communication message storage
* email channel behavior in communications UI

### Required work

#### 1. Create notification settings storage

Add table `notification_email_settings` with:

* tenant/business ownership field
* provider
* is_enabled
* sendgrid_api_key
* from_email
* from_name
* reply_to_email
* reply_to_name
* use_for_customer_notifications
* use_for_internal_notifications
* timestamps

#### 2. Create delivery logs

Add table `notification_email_logs` with:

* tenant/business ownership field
* email_type
* recipient
* subject
* status
* provider
* provider_message_id
* error_message
* metadata
* sent_at
* timestamps

#### 3. Extract shared service

Create `notification-email.service.js` that:

* loads tenant settings
* initializes SendGrid
* sends email
* logs success/failure
* exposes helpers for customer/internal/test emails

#### 4. Refactor current endpoints

Update all existing email-sending endpoints to use the shared notification service.

#### 5. Build settings UI

Add Notification Email settings page/card with:

* API key
* from email
* from name
* reply-to
* toggles
* test send button
* status display

#### 6. De-scope communication email

Disable/remove:

* inbound webhook
* threading behavior
* communication table insertion
* email channel in communications inbox
* `availableSendChannels` email behavior

#### 7. Preserve existing functionality

Ensure current flows still work:

* invoices
* receipts
* reminders
* estimates
* invitations
* activation
* paystubs
* alerts

### Non-goals

* mailbox sync
* Gmail/Outlook connection
* email inbox UI
* communication hub email
* IMAP/SMTP integration

### Acceptance criteria

* one shared outbound email service
* tenant-configurable SendGrid settings
* delivery logs
* no inbox/threading/email-channel behavior
* all existing notification emails continue to work

