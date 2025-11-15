import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock the AppContext hook so we can assert addToCart is called
const mockAdd = vi.fn();
vi.mock("../../src/context/AppContext", () => ({
  useAppContext: () => ({ addToCart: mockAdd })
}));

// Mock react-router-dom Link to avoid importing router internals
vi.mock("react-router-dom", () => ({
  Link: ({ children, to }: any) => {
    return (
      // eslint-disable-next-line react/jsx-no-bind
      // simple anchor substitute
      <a href={to}>{children}</a>
    );
  }
}));

import { ProductCard } from "../../src/components/products/ProductCard";

// Verifies ProductCard renders product info and triggers addToCart
describe("ProductCard component", () => {
  it("renders name, price and calls addToCart on button click", () => {
    const product = {
      id: "P1",
      nombre: "Torta X",
      precio: 10000,
      categoria: "T",
      attr: "20 porciones",
      img: "/img/x.png",
      stock: 5,
      stockCritico: 1
    } as any;

    render(<ProductCard product={product} />);

    expect(screen.getByText(/Torta X/)).toBeDefined();
    const btn = screen.getByRole("button", { name: /Añadir/i });
    fireEvent.click(btn);
    expect(mockAdd).toHaveBeenCalledWith("P1", 1);
  });
});
