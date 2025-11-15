import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock AppContext registerCustomer to avoid real changes
const mockRegister = vi.fn(() => ({ ok: true }));
vi.mock("../../src/context/AppContext", () => ({
  useAppContext: () => ({ registerCustomer: mockRegister })
}));

import { RegistroPage } from "../../src/pages/RegistroPage";

// Ensure region select populates comuna options and form validation blocks submission when missing fields
describe("RegistroPage", () => {
  it("populates comuna select when region chosen and blocks submit on invalid data", () => {
    render(<RegistroPage />);
    const region = screen.getByLabelText(/Región/i);
    // Choose a known region that exists in REGIONS
    fireEvent.change(region, { target: { value: "Metropolitana" } });
    const comuna = screen.getByLabelText(/Comuna/i);
    // After selecting region, comuna should be enabled
    expect((comuna as HTMLSelectElement).disabled).toBe(false);

    // Try to submit with missing required fields
    const btn = screen.getByRole("button", { name: /Registrarse/i });
    fireEvent.click(btn);
    // registerCustomer should not have been called due to validation
    expect(mockRegister).not.toHaveBeenCalled();
  });
});
