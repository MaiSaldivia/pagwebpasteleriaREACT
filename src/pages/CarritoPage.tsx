import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { formatMoney } from "../utils/format";

const SHIPPING_OPTIONS = [
  { value: 0, label: "Retiro en tienda (gratis)" },
  { value: 3000, label: "Envío urbano ($3.000)" },
  { value: 6000, label: "Envío regional ($6.000)" }
];

const SIMPLE_EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function CarritoPage() {
  const {
    cartTotals,
    removeFromCart,
    setCartQty,
    clearCart,
    shippingCost,
    setShippingCost,
    coupon,
    setCoupon,
    evaluateCoupon,
    benefitsForCart,
    customerSession,
    updateCustomer,
    openReceiptWindow,
    products,
    upsertProduct,
    orders,
    updateOrders
  } = useAppContext();

  const { items, subTotal } = cartTotals;
  const [guestInfo, setGuestInfo] = useState({ nombre: "", email: "" });
  const [guestErrors, setGuestErrors] = useState<{ nombre?: string; email?: string }>({});

  const benefits = useMemo(() => benefitsForCart(items, subTotal), [benefitsForCart, items, subTotal]);
  const baseAfterBenefits = Math.max(0, subTotal - benefits.bdayDisc - benefits.userDisc);
  const couponInfo = evaluateCoupon(baseAfterBenefits, shippingCost);
  const effectiveShip = couponInfo.valid ? couponInfo.shipAfter : shippingCost;
  const total = Math.max(0, baseAfterBenefits - (couponInfo.valid ? couponInfo.discount : 0) + effectiveShip);

  const handleCheckout = () => {
    if (!items.length) return;
    if (!customerSession) {
      const nextErrors: typeof guestErrors = {};
      if (!guestInfo.nombre.trim()) {
        nextErrors.nombre = "Ingresa tu nombre.";
      }
      const emailValue = guestInfo.email.trim();
  if (!emailValue || !SIMPLE_EMAIL_REGEX.test(emailValue)) {
        nextErrors.email = "Ingresa un correo válido.";
      }
      if (Object.keys(nextErrors).length) {
        setGuestErrors(nextErrors);
        return;
      }
      setGuestErrors({});
    }
    const contactEmail = customerSession ? customerSession.email : guestInfo.email.trim();
    openReceiptWindow({
      items,
      subTotal,
      benefits,
      coupon: couponInfo,
      shipCost: effectiveShip,
      total,
      contactEmail
    });
    // Decrement stock for each item and persist as product updates
    items.forEach((entry) => {
      const p = products.find((x) => x.id === entry.product.id);
      if (!p) return;
      const nextStock = Math.max(0, p.stock - entry.qty);
      upsertProduct({ ...p, stock: nextStock });
    });

    // Save order record
    try {
      const orderId = `PED${Date.now()}`;
      const newOrder = {
        id: orderId,
        cliente: customerSession ? customerSession.nombre || customerSession.email : guestInfo.nombre,
        total,
        estado: "Pendiente",
        items: items.map((it) => ({ codigo: it.product.id, nombre: it.product.nombre, qty: it.qty, price: it.product.precio }))
      };
      updateOrders([...(orders || []), newOrder]);
    } catch (err) {
      // non-fatal
      console.error("No se pudo guardar el pedido:", err);
    }
    if (benefits.bdayApplied && customerSession) {
      const currentYear = new Date().getFullYear();
      updateCustomer({ bdayRedeemedYear: currentYear });
    }
    if (!customerSession) {
      setGuestInfo({ nombre: "", email: "" });
    }
    // Clear cart after purchase
    clearCart();
  };

  if (!items.length) {
    return (
      <div className="container" style={{ padding: "32px 0" }}>
        <p>Tu carrito está vacío.</p>
        <Link className="btn btn--primary" to="/productos">
          Ir a productos
        </Link>
      </div>
    );
  }

  return (
    <div className="container" id="cartPage">
      <div className="cart-layout">
        <section>
          <table className="cart-table">
            <thead>
              <tr>
                <th className="w-50">Producto</th>
                <th className="ta-right">Precio</th>
                <th className="ta-center">Cant.</th>
                <th className="ta-right">Subtotal</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={`${item.product.id}-${item.msg || ""}`}>
                  <td>
                    <div className="cart-prodname">{item.product.nombre}</div>
                    <small className="muted">
                      {item.product.categoria}
                      {item.product.attr ? ` • ${item.product.attr}` : ""}
                    </small>
                    {item.msg && <div className="small muted">🎂 Mensaje: {item.msg}</div>}
                  </td>
                  <td className="ta-right">{formatMoney(item.product.precio)}</td>
                  <td className="ta-center">
                    <input
                      className="qty-input"
                      type="number"
                      min={1}
                      value={item.qty}
                      onChange={(event) =>
                        setCartQty(item.product.id, Number(event.target.value), item.msg)
                      }
                    />
                  </td>
                  <td className="ta-right">
                    <strong>{formatMoney(item.subtotal)}</strong>
                  </td>
                  <td className="ta-right">
                    <button
                      className="btn btn--ghost btn-sm"
                      type="button"
                      onClick={() => removeFromCart(item.product.id, item.msg)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: "10px", display: "flex", gap: "10px" }}>
            <button className="btn btn--ghost" type="button" onClick={clearCart}>
              Vaciar carrito
            </button>
            <Link className="btn btn--primary" to="/productos">
              Seguir comprando
            </Link>
          </div>
        </section>

        <aside className="cart-summary" data-cart-summary>
          <h3>Total del carrito</h3>
          {customerSession && (
            <div className="sum-row">
              <span className="small muted">Sesión</span>
              <strong className="small">{customerSession.email}</strong>
            </div>
          )}
          {!customerSession && (
            <div className="guest-checkout">
              <h4 className="guest-checkout__title">Compra como invitado</h4>
              <label className="guest-checkout__label" htmlFor="guestName">
                Nombre completo
              </label>
              <input
                id="guestName"
                className="input"
                type="text"
                value={guestInfo.nombre}
                onChange={(event) => setGuestInfo((prev) => ({ ...prev, nombre: event.target.value }))}
                placeholder="Ej: Camila Fuentes"
                maxLength={80}
              />
              <small className="help">{guestErrors.nombre}</small>

              <label className="guest-checkout__label" htmlFor="guestEmail">
                Correo electrónico
              </label>
              <input
                id="guestEmail"
                className="input"
                type="email"
                value={guestInfo.email}
                onChange={(event) => setGuestInfo((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="tucorreo@ejemplo.com"
                maxLength={100}
              />
              <small className="help">{guestErrors.email}</small>
            </div>
          )}
          <div className="sum-row">
            <span>Subtotal</span>
            <strong id="sum-sub">{formatMoney(subTotal)}</strong>
          </div>
          {benefits.bdayDisc > 0 && (
            <div className="sum-row">
              <span>{benefits.bdayLabel}</span>
              <strong>- {formatMoney(benefits.bdayDisc)}</strong>
            </div>
          )}
          {benefits.userDisc > 0 && (
            <div className="sum-row">
              <span>{benefits.userLabel}</span>
              <strong>- {formatMoney(benefits.userDisc)}</strong>
            </div>
          )}

          <div className="sum-row">
            <label htmlFor="shipping">Envío</label>
            <select
              id="shipping"
              className="input"
              value={shippingCost}
              onChange={(event) => setShippingCost(Number(event.target.value))}
              disabled={couponInfo.valid && couponInfo.code === "ENVIOGRATIS"}
            >
              {SHIPPING_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <strong style={{ marginLeft: "auto" }}>{formatMoney(effectiveShip)}</strong>
          </div>

          <div className="coupon-box">
            <label className="coupon-label" htmlFor="couponInput">
              Ingrese el cupón de descuento
            </label>
            <div className="coupon-row">
              <input
                id="couponInput"
                className="coupon-input"
                type="text"
                placeholder="Ej: ENVIOGRATIS, 5000OFF"
                value={coupon}
                onChange={(event) => setCoupon(event.target.value)}
              />
              <button className="coupon-btn" type="button" onClick={() => setCoupon(coupon)}>
                {couponInfo.valid ? "REAPLICAR" : "APLICAR"}
              </button>
              {couponInfo.valid && (
                <button
                  className="coupon-btn"
                  type="button"
                  style={{ marginLeft: "6px", background: "#eee", color: "#333" }}
                  onClick={() => setCoupon("")}
                >
                  Quitar
                </button>
              )}
            </div>
            <small id="couponMsg" className="muted">
              {couponInfo.valid ? "Cupón aplicado" : "Puedes usar ENVIOGRATIS o 5000OFF"}
            </small>
          </div>

          <div className="sum-row total">
            <span>Total</span>
            <strong id="sum-total">{formatMoney(total)}</strong>
          </div>

          <button className="btn btn--primary btn-block" type="button" onClick={handleCheckout}>
            Finalizar compra
          </button>
          <p className="muted small">* No procesa pago real.</p>
        </aside>
      </div>
    </div>
  );
}
