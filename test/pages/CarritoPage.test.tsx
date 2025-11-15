import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock useAppContext to provide cart state and spies for actions
const mockOpenReceipt = vi.fn();
const mockUpdateCustomer = vi.fn();
const mockClearCart = vi.fn();
const mockUpsertProduct = vi.fn();
vi.mock("../../src/context/AppContext", () => ({
  useAppContext: () => ({
    cartTotals: { items: [ { product: { id: 'P1', nombre: 'T1', precio: 1000, categoria: 'C', attr: '', img: '', stock: 5, stockCritico: 0 }, qty: 1, subtotal: 1000 } ], subTotal: 1000, totalQty: 1 },
    removeFromCart: vi.fn(),
    setCartQty: vi.fn(),
    clearCart: mockClearCart,
    shippingCost: 0,
    setShippingCost: vi.fn(),
    coupon: '',
    setCoupon: vi.fn(),
    evaluateCoupon: () => ({ valid: false, discount: 0, shipAfter: 0 }),
    benefitsForCart: () => ({ userDisc: 0, userLabel: '', bdayDisc: 0, bdayLabel: '', bdayEligible: false, bdayApplied: false }),
    customerSession: { email: 'a@a.com', nombre: 'A' },
    updateCustomer: mockUpdateCustomer,
    openReceiptWindow: mockOpenReceipt,
    products: [{ id: 'P1', nombre: 'T1', precio: 1000, categoria: 'C', attr: '', img: '', stock: 5, stockCritico: 0 }],
    upsertProduct: mockUpsertProduct,
    orders: [],
    updateOrders: vi.fn()
  })
}));

import { MemoryRouter } from "react-router-dom";
import { CarritoPage } from "../../src/pages/CarritoPage";

// Verify checkout triggers openReceiptWindow, product stock update and clearCart
describe("CarritoPage checkout flow", () => {
  it("opens receipt, updates product stock and clears cart on checkout", () => {
    render(
      <MemoryRouter>
        <CarritoPage />
      </MemoryRouter>
    );
    const btn = screen.getByRole("button", { name: /Finalizar compra/i });
    fireEvent.click(btn);
    expect(mockOpenReceipt).toHaveBeenCalled();
    expect(mockUpsertProduct).toHaveBeenCalled();
    expect(mockClearCart).toHaveBeenCalled();
  });
});
