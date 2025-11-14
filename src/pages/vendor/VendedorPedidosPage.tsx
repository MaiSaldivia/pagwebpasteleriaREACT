import { Fragment, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { formatMoney } from "../../utils/format";

const ESTADOS = ["Pendiente", "Preparando", "Despachado", "Entregado"];

export function VendedorPedidosPage() {
  const { orders, updateOrders } = useAppContext();
  const [selected, setSelected] = useState<string | null>(null);

  const toggleDetail = (id: string) => {
    setSelected((prev) => (prev === id ? null : id));
  };

  const advanceStatus = (id: string) => {
    const order = orders.find((item) => item.id === id);
    if (!order) return;
    const currentIndex = ESTADOS.indexOf(order.estado);
    const nextEstado = ESTADOS[currentIndex + 1] || ESTADOS[currentIndex];
    if (nextEstado === order.estado) {
      window.alert("Este pedido ya está entregado.");
      return;
    }
    updateOrders(
      orders.map((item) => (item.id === id ? { ...item, estado: nextEstado } : item))
    );
  };

  return (
    <section>
      <header className="admin-header">
        <h1 className="admin-title">Gestión de pedidos</h1>
        <p className="admin-subtitle">Actualiza estados y revisa detalle de productos</p>
      </header>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Cliente</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <Fragment key={order.id}>
                <tr>
                  <td>{order.id}</td>
                  <td>{order.cliente}</td>
                  <td>{formatMoney(order.total)}</td>
                  <td>{order.estado}</td>
                  <td>
                    <div className="table-actions">
                      <button className="btn-edit" type="button" onClick={() => toggleDetail(order.id)}>
                        {selected === order.id ? "Ocultar" : "Detalle"}
                      </button>
                      <button className="btn-edit" type="button" onClick={() => advanceStatus(order.id)}>
                        Avanzar estado
                      </button>
                    </div>
                  </td>
                </tr>
                {selected === order.id && (
                  <tr>
                    <td colSpan={5}>
                      <div style={{ background: "#fafafa", padding: "16px", borderRadius: "8px" }}>
                        <h4>Ítems</h4>
                        <ul style={{ paddingLeft: "20px" }}>
                          {order.items.map((item) => (
                            <li key={`${order.id}-${item.codigo}`}>
                              {item.nombre} — {item.qty} × {formatMoney(item.price)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {!orders.length && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "24px" }}>
                  No hay pedidos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
