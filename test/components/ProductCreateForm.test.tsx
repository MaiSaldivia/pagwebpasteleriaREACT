import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock useAppContext so upsertProduct is observed
const mockUpsert = vi.fn();
vi.mock("../../src/context/AppContext", () => ({ useAppContext: () => ({ products: [], upsertProduct: mockUpsert }) }));

import { ProductCreateForm } from "../../src/components/admin/ProductCreateForm";

// Ensure the form validates price minimum and does not call upsertProduct on invalid
describe("ProductCreateForm", () => {
  it("shows error when precio is below minimum and does not call upsertProduct", () => {
    render(<ProductCreateForm />);
    fireEvent.change(screen.getByLabelText(/Código/i), { target: { value: "X1" } });
    fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: "Prod" } });
    fireEvent.change(screen.getByLabelText(/Categoría/i), { target: { value: "Tortas Cuadradas" } });
    fireEvent.change(screen.getByLabelText(/Precio/i), { target: { value: "500" } });
    const submit = screen.getByRole("button", { name: /Guardar producto/i });
    fireEvent.click(submit);
    expect(screen.getByText(/Precio inválido/)).toBeDefined();
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});
