// Shared short-code / token generators.
//
// The alphabet excludes visually confusing characters (I, O, 0, 1) so codes
// are safe to read aloud or copy from a screenshot.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomFrom(alphabet: string, length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return out;
}

// A short 6-character code for sharing (match links, group invites). Callers
// that need uniqueness must check for collisions and regenerate (see the retry
// loop in matches.create / groups.generateInvite).
export function generateShortCode(): string {
  return randomFrom(ALPHABET, 6);
}

// A longer, unguessable token for the public (unauthenticated) group page.
// 20 chars over a 32-symbol alphabet ≈ 100 bits — not enumerable, unlike the
// 6-char share code. Rotatable via groups.rotate/… to revoke public access.
export function generatePublicToken(): string {
  return randomFrom(ALPHABET, 20);
}
