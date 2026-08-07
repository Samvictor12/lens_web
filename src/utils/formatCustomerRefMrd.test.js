import { describe, it, expect } from "vitest";
import {
  formatCustomerRefMrd,
  formatCustomerRefMrdLabel,
} from "../formatCustomerRefMrd.js";

describe("formatCustomerRefMrd", () => {
  it("returns customer ref only when MRD is empty", () => {
    expect(formatCustomerRefMrd("CUST-1023", "")).toBe("CUST-1023");
    expect(formatCustomerRefMrd("CUST-1023", null)).toBe("CUST-1023");
    expect(formatCustomerRefMrd("CUST-1023", undefined)).toBe("CUST-1023");
    expect(formatCustomerRefMrd("CUST-1023", "   ")).toBe("CUST-1023");
  });

  it("joins with slash only when both have values", () => {
    expect(formatCustomerRefMrd("CUST-1023", "MRD-5562")).toBe(
      "CUST-1023 / MRD-5562"
    );
  });

  it("does not leave trailing separators", () => {
    expect(formatCustomerRefMrd("CUST-1023", "")).not.toContain("/");
    expect(formatCustomerRefMrd("CUST-1023", "-")).toBe("CUST-1023 / -");
  });

  it("trims whitespace", () => {
    expect(formatCustomerRefMrd("  CUST-1023  ", "  MRD-5562  ")).toBe(
      "CUST-1023 / MRD-5562"
    );
  });
});

describe("formatCustomerRefMrdLabel", () => {
  it("formats labelled line when both present", () => {
    expect(formatCustomerRefMrdLabel("CUST-1023", "MRD-5562")).toBe(
      "Customer Ref : CUST-1023 / MRD-5562"
    );
  });

  it("formats labelled line when MRD empty", () => {
    expect(formatCustomerRefMrdLabel("CUST-1023", "")).toBe(
      "Customer Ref : CUST-1023"
    );
  });

  it("returns empty when customer ref missing", () => {
    expect(formatCustomerRefMrdLabel("", "MRD-5562")).toBe("Customer Ref : MRD-5562");
    expect(formatCustomerRefMrdLabel("", "")).toBe("");
  });
});
