/**
 * Strips HTML tags, WordPress/Divi shortcodes, and decodes entities from a
 * raw event description string.
 * Entities are decoded FIRST so that double-encoded HTML (e.g. &lt;p&gt;)
 * becomes a tag that can then be stripped.
 */
export function cleanDescription(raw: string): string {
  // Strip WordPress shortcodes like [et_pb_section ...] or [/et_pb_section]
  let text = raw.replace(/\[\/?\w[\w\-]*[^\]]*\]/g, " ");
  // Decode HTML entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, " ");
  // Strip HTML tags after entity decoding
  text = text.replace(/<[^>]+>/g, " ");
  return text.replace(/\s{2,}/g, " ").trim();
}
