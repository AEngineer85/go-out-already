/**
 * Strips HTML tags and decodes entities from a raw event description string.
 * Entities are decoded FIRST so that double-encoded HTML (e.g. &lt;p&gt;)
 * becomes a tag that can then be stripped.
 */
export function cleanDescription(raw: string): string {
  let text = raw
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, " ");
  text = text.replace(/<[^>]+>/g, " ");
  return text.replace(/\s{2,}/g, " ").trim();
}
