/**
 * Web Push helpers for the team-member PWA.
 *
 * Flow:
 *   1. registerServiceWorker() — registers /sw.js on first call (idempotent)
 *   2. subscribeUserToPush()   — asks permission, subscribes to PushManager, POSTs to backend
 *   3. unsubscribeUserFromPush() — reverses (2) and tells backend to forget the endpoint
 *
 * iOS note: Web Push works on iOS 16.4+ only when the app has been added to the
 * Home Screen (PWA standalone mode). Subscribing inside Safari before "Add to
 * Home Screen" will silently fail with NotAllowedError.
 */

const API_BASE =
  process.env.REACT_APP_API_URL?.replace(/\/api\/?$/, '') ||
  'https://service-flow-backend-production-4568.up.railway.app'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i)
  return out
}

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function getPermission() {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

export async function registerServiceWorker() {
  if (!isPushSupported()) throw new Error('Push not supported in this browser')
  const reg = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready
  return reg
}

async function fetchPublicKey() {
  const res = await fetch(`${API_BASE}/api/push/public-key`)
  if (!res.ok) throw new Error('Server has no VAPID public key configured')
  const body = await res.json()
  if (!body.publicKey) throw new Error('Server returned empty public key')
  return body.publicKey
}

export async function subscribeUserToPush() {
  if (!isPushSupported()) throw new Error('Push not supported in this browser')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    const err = new Error('Notification permission denied')
    err.code = 'PERMISSION_DENIED'
    throw err
  }

  const reg = await registerServiceWorker()
  const publicKey = await fetchPublicKey()

  let subscription = await reg.pushManager.getSubscription()
  if (!subscription) {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })
  }

  const token = localStorage.getItem('teamMemberToken')
  if (!token) throw new Error('Not signed in as a team member')

  const res = await fetch(`${API_BASE}/api/push/subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  })

  if (!res.ok) {
    let detail = ''
    try { detail = (await res.json()).error || '' } catch (_) {}
    throw new Error(`Failed to save subscription on server${detail ? `: ${detail}` : ''}`)
  }

  return subscription
}

export async function unsubscribeUserFromPush() {
  if (!isPushSupported()) return false
  const reg = await navigator.serviceWorker.getRegistration()
  if (!reg) return false
  const subscription = await reg.pushManager.getSubscription()
  if (!subscription) return false

  const token = localStorage.getItem('teamMemberToken')
  if (token) {
    try {
      await fetch(`${API_BASE}/api/push/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      })
    } catch (_) {
      // best-effort
    }
  }

  await subscription.unsubscribe()
  return true
}

export async function isCurrentlySubscribed() {
  if (!isPushSupported()) return false
  const reg = await navigator.serviceWorker.getRegistration()
  if (!reg) return false
  const sub = await reg.pushManager.getSubscription()
  return !!sub
}

export async function sendTestPush() {
  const token = localStorage.getItem('teamMemberToken')
  if (!token) throw new Error('Not signed in as a team member')
  const res = await fetch(`${API_BASE}/api/push/test`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    let detail = ''
    try { detail = (await res.json()).error || '' } catch (_) {}
    throw new Error(`Failed to send test${detail ? `: ${detail}` : ''}`)
  }
  return res.json()
}
