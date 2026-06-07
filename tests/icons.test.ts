import { describe, expect, test } from "vitest";
import { getSvgIconMarkup } from "../src/svg-icons";

describe("getSvgIconMarkup", () => {
  test("accepts plain svg markup", () => {
    expect(getSvgIconMarkup("<svg viewBox=\"0 0 24 24\"></svg>")).toBe(
      "<svg viewBox=\"0 0 24 24\"></svg>"
    );
  });

  test("strips xml declarations before svg markup", () => {
    expect(
      getSvgIconMarkup(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?><svg width=\"22\" height=\"22\"></svg>"
      )
    ).toBe("<svg width=\"22\" height=\"22\"></svg>");
  });

  test("strips a leading svg comment", () => {
    expect(getSvgIconMarkup("<!-- icon --><svg viewBox=\"0 0 48 48\"></svg>")).toBe(
      "<svg viewBox=\"0 0 48 48\"></svg>"
    );
  });

  test("rejects non-svg text", () => {
    expect(getSvgIconMarkup("settings")).toBeNull();
  });
});
