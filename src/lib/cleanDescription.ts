/**
 * Strips HTML tags, WordPress/Divi shortcodes, and decodes entities from a
 * raw event description string.
 *
 * Order matters:
 * 1. Decode entities first — so &#8220; inside shortcode attrs becomes a plain
 *    char and the shortcode regex can match to the closing ]
 * 2. Strip WordPress shortcodes (Divi et_pb_* etc.)
 * 3. Strip remaining HTML tags
 * 4. Collapse whitespace
 */
export function cleanDescription(raw: string): string {
  // 1. Decode HTML entities
  let text = raw
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, " ");
  // 2. Strip WordPress/Divi shortcodes — closed [et_pb_section ...] and
  //    unclosed fragments [et_pb_text _builder... (truncated, no closing ])
  text = text.replace(/\[\/?\w[\w-]*[^\]]*\]?/g, " ");
  // 3. Strip HTML tags
  text = text.replace(/<[^>]+>/g, " ");
  // 4. Collapse whitespace
  return text.replace(/\s{2,}/g, " ").trim();
}
