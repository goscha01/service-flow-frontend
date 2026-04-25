# TASK — ServiceFlow: Connected Email Integration for Communications Hub

## Goal

Build **Email Integration** as a real **connected mailbox system** for the Communications Hub.

This is for:

* connecting a user’s real email account
* syncing email conversations into the communication dashboard
* replying from the dashboard
* showing email alongside SMS / WhatsApp / calls

This is NOT:

* not SendGrid notification email
* not transactional/system email
* not a fake inbox built on outbound-only sending
* not part of Sigcore

This IS:

* mailbox connection
* real inbox sync
* two-way email communication
* unified communication UI

---

# Core Principles

1. Email integration is a **connected mailbox system**, not a notification sender
2. Notification Email and Connected Email are **separate systems**
3. Connected Email is **NOT implemented through Sigcore**
4. ServiceFlow communication tables remain the **shared UI communication layer**
5. A connected mailbox may be Gmail, Outlook/Microsoft 365, and later generic IMAP
6. Conversations are mailbox-native email threads, normalized into the existing communication model
7. Job/customer/lead linking is optional metadata, not identity

---

# Product Boundary

## System 1 — Notification Email

Already exists.
Used for:

* account setup
* invites
* alerts
* invoices
* receipts
* reminders
* system/customer notifications

Provider:

* SendGrid

This task must NOT modify or replace that system.

## System 2 — Connected Email

This task builds the real email channel for the Communications Hub.

Used for:

* connecting inboxes
* viewing conversations
* replying from dashboard
* syncing inbound/outbound messages
* showing email in timeline with other channels

---

# Phase 1 — Provider Strategy

## 1.1 Initial providers

Build Connected Email with provider-specific mailbox integrations:

* Gmail (Google OAuth + Gmail API)
* Outlook / Microsoft 365 (Microsoft Graph)

Future:

* IMAP/SMTP generic provider

## 1.2 Critical rule

Do NOT use SendGrid as the primary inbox connection model.

SendGrid may remain only for Notification Email.
Connected Email must use real mailbox providers.

---

# Phase 2 — Data Model

Reuse existing communication tables.

## 2.1 `communication_conversations`

Support email conversations with fields like:

* `channel = 'email'`
* `provider = 'gmail' | 'outlook'`
* `participant_email`
* `endpoint_email`
* `email_thread_id`
* optional:

  * `lead_id`
  * `customer_id`
  * `job_id`
  * `conversation_type`

## 2.2 `communication_messages`

Support email messages with:

* `channel = 'email'`
* `provider`
* `conversation_id`
* `direction`
* `from_email`
* `to_email`
* `email_subject`
* `body_html`
* `body_text`
* `email_message_id`
* `email_in_reply_to`
* `email_references`
* `timestamp`
* optional linking:

  * `lead_id`
  * `customer_id`
  * `job_id`

## 2.3 Provider connection storage

Create mailbox connection tables, for example:

### `connected_email_accounts`

* `id`
* `user_id`
* `provider` (`gmail`, `outlook`)
* `email_address`
* `display_name`
* `status` (`connected`, `expired`, `error`, `syncing`, `disconnected`)
* `access_token` or provider token reference
* `refresh_token` or secure token reference
* `token_expires_at`
* `last_sync_at`
* `last_history_id` / provider sync cursor
* `created_at`
* `updated_at`

### `connected_email_sync_state`

* per connected account sync cursor/state
* sync errors
* retry metadata

Token storage must be treated as sensitive and encrypted at rest.

---

# Phase 3 — Conversation Identity

## 3.1 Identity rule (MANDATORY)

Email conversation identity must include:

* `user_id`
* `provider`
* `endpoint_email`
* `participant_email`

Thread metadata is also used, but identity must not rely on participant alone.

## 3.2 NEVER

* never group by `participant_email` only
* never merge same participant across different endpoint mailboxes
* never assume subject alone defines a conversation

## 3.3 Multi-mailbox isolation

Same participant email across two connected inboxes must create two separate conversations if `endpoint_email` differs.

---

# Phase 4 — Mailbox Connection Flow

## 4.1 Settings UI

Add a dedicated settings section:

**Settings → Connected Inboxes**

Options:

* Connect Gmail
* Connect Outlook / Microsoft 365
* show connected inboxes
* show sync status
* show last sync time
* disconnect mailbox

## 4.2 Gmail connect flow

* OAuth connect with Google
* request minimum scopes for read/send/thread sync
* store secure connection record
* fetch account email/display name
* create connected account row

## 4.3 Outlook connect flow

* OAuth connect with Microsoft
* request minimum Graph scopes for mail read/send
* store secure connection record
* fetch mailbox identity
* create connected account row

## 4.4 Disconnect flow

* revoke/disconnect mailbox
* stop sync
* keep historical messages in communications tables
* mark account as disconnected, do not hard-delete message history

---

# Phase 5 — Sync Engine

## 5.1 Initial sync

On first connect:

* import recent email history for a bounded window, e.g. last 30–90 days
* create/update conversations
* create messages
* attempt optional linking to customer/lead/job

## 5.2 Incremental sync

Use provider-native sync cursors:

* Gmail history ID
* Outlook delta/query state

Schedule background sync:

* periodic polling or webhook-assisted sync depending on provider capability

## 5.3 Sync rules

* dedupe by provider message ID
* skip already imported messages
* update conversation last activity
* preserve mailbox thread identity
* log sync errors per account

---

# Phase 6 — Message Guard

## 6.1 Guard (MANDATORY)

Only attach a message to a conversation if mailbox ownership matches:

### Inbound

* connected mailbox email appears in recipients / mailbox owner side

### Outbound

* connected mailbox email is sender

Prevents:

* cross-mailbox contamination
* wrong conversation assignment
* merged history across multiple connected inboxes

## 6.2 Email normalization

All email comparisons must be:

* lowercased
* trimmed
* canonicalized from display-name format

Example:

* `"John Smith <John@Email.com>"` → `john@email.com`

---

# Phase 7 — Sending / Replying

## 7.1 Sending rule

Replies from Communications Hub must send through the connected mailbox provider:

* Gmail API for Gmail
* Microsoft Graph for Outlook

Do NOT send communication-hub replies through SendGrid.

## 7.2 Composer behavior

When channel is Email:

* show subject input
* prefill `Re: [subject]` for replies
* send from the selected connected mailbox
* preserve thread headers where provider supports them

## 7.3 Multiple mailboxes

If user has multiple connected inboxes:

* conversation must retain its `endpoint_email`
* replies must default to the mailbox that owns the thread

---

# Phase 8 — Communications UI

## 8.1 Unified UI rule

Email must appear as a first-class channel in the unified communications UI:

* visible in All
* filterable as Email
* shown in same timeline as SMS/WhatsApp/calls
* replyable from same screen

## 8.2 Rendering

Email events should show:

* subject
* from/to email
* body preview
* HTML-safe rendered body when expanded
* attachment indicator later

## 8.3 Settings surface

Connected inboxes belong in:

* Settings → Connected Inboxes

NOT:

* Notification Email settings
* Communication Hub provider cards tied to SendGrid

---

# Phase 9 — Linking

## 9.1 Optional linking

After sync/import, attempt to link emails to:

* customer
* lead
* job

Based on:

* matching known contact email
* linked estimate/invoice/job metadata
* prior conversation linkage

## 9.2 Important rule

Linking is optional metadata.
It must not define mailbox identity.

---

# Phase 10 — Security

1. Tokens must be encrypted at rest
2. OAuth scopes should be minimal
3. Provider access must be tenant-scoped
4. Message import must be isolated per connected mailbox
5. Disconnect must revoke or invalidate future sync
6. No SendGrid dependency for connected mailbox send/receive

---

# Phase 11 — Tests

## Identity

* same participant + 2 connected inboxes → 2 conversations

## Isolation

* foreign mailbox message is not attached to wrong thread

## Sync

* reconnect does not duplicate imported messages
* incremental sync imports only new changes

## Reply

* reply sends from correct connected mailbox
* thread remains attached to same conversation

## UI

* email appears in All
* email filter works
* subject rendering works
* removing notification email does not affect connected inbox email

---

# Out of Scope

* SendGrid notification system changes
* email marketing / campaigns
* generic IMAP in first phase if Gmail/Outlook is enough
* attachments upload/download in first phase
* advanced shared mailbox delegation
* full Gmail-style label/folder management
* mailbox analytics/reporting

---

# Acceptance Criteria

1. User can connect Gmail mailbox
2. User can connect Outlook / Microsoft 365 mailbox
3. Recent mailbox history syncs into communications dashboard
4. Email appears in unified communications UI as a real channel
5. Replies send through the connected mailbox provider
6. Same participant across different connected inboxes stays isolated
7. Email is not routed through Sigcore
8. Notification Email remains separate and unchanged

---

# Summary

We are building:

→ **Connected Email as a real mailbox integration for Communications Hub**

NOT:

→ SendGrid notification email
→ Sigcore email channel
→ fake inbox built from outbound-only email
