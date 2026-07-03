// Shared helpers for share actions (used by ShareButton, group invites and
// the standings share menu).

// Copy text to the clipboard, with a fallback for older browsers.
// Resolves true on success.
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      return true
    } catch {
      return false
    }
  }
}

// Open WhatsApp with a prefilled message. whatsapp:// preserves the full
// prefilled text on iOS where wa.me sometimes drops everything but the URL.
export function openWhatsApp(text) {
  const encoded = encodeURIComponent(text)
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  const target = isMobile
    ? `whatsapp://send?text=${encoded}`
    : `https://api.whatsapp.com/send?text=${encoded}`
  window.open(target, '_blank')
}

// The app's base URL for building shareable hash links.
export function appBaseUrl() {
  return `${window.location.origin}${window.location.pathname}`
}
