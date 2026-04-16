import { describe, it, expect } from "vitest";
import { cleanDescription } from "../cleanDescription";

describe("cleanDescription", () => {
  it("returns plain text unchanged", () => {
    expect(cleanDescription("Come enjoy the festival!")).toBe(
      "Come enjoy the festival!"
    );
  });

  it("strips basic HTML tags", () => {
    expect(cleanDescription("<p>Hello world</p>")).toBe("Hello world");
  });

  it("strips nested tags", () => {
    expect(cleanDescription("<div><p>Text <strong>here</strong></p></div>")).toBe(
      "Text here"
    );
  });

  it("decodes &lt;p&gt; double-encoded HTML (the original bug)", () => {
    // The raw DB value was &lt;p&gt;Some text&lt;/p&gt;
    // Old code stripped tags first, THEN decoded → left "<p>Some text</p>"
    // Correct: decode FIRST → <p>Some text</p>, then strip → "Some text"
    expect(cleanDescription("&lt;p&gt;Some text&lt;/p&gt;")).toBe("Some text");
  });

  it("decodes &amp; to &", () => {
    expect(cleanDescription("Tom &amp; Jerry")).toBe("Tom & Jerry");
  });

  it("decodes &nbsp; to space", () => {
    expect(cleanDescription("Hello&nbsp;World")).toBe("Hello World");
  });

  it("decodes numeric entities", () => {
    expect(cleanDescription("&#9829; Fun")).toBe("Fun");
  });

  it("collapses multiple spaces", () => {
    expect(cleanDescription("Hello   world")).toBe("Hello world");
  });

  it("trims leading/trailing whitespace", () => {
    expect(cleanDescription("  hello  ")).toBe("hello");
  });

  it("handles empty string", () => {
    expect(cleanDescription("")).toBe("");
  });

  it("strips Divi/WordPress shortcodes", () => {
    expect(
      cleanDescription("[et_pb_section fb_built= 1 _builder_version= 4.20.4]Join us for a great event.[/et_pb_section]")
    ).toBe("Join us for a great event.");
  });

  it("strips shortcodes and leaves surrounding text", () => {
    expect(
      cleanDescription("[et_pb_row][et_pb_column type= 4_4 ][et_pb_text] Come join us for fun. [/et_pb_text][/et_pb_column][/et_pb_row]")
    ).toBe("Come join us for fun.");
  });
});
