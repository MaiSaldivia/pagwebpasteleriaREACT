import { it, expect, describe } from "vitest";
import { formatMoney } from "../../src/utils/format";

// Verifies currency formatting behavior (environment-agnostic)
describe("formatMoney", () => {
  it("formats numbers as currency-like string without decimal cents", () => {
    const s = formatMoney(45000);
    // Contains digits
    expect(s).toMatch(/\d/);
    // No fractional cents (no decimal separator followed by digits)
    expect(/\.\d{1,}/.test(s)).toBe(false);
  });
});
