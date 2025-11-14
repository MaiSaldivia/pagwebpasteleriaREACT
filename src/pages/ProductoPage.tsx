import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { formatMoney } from "../utils/format";
import { computeAge, isBirthdayToday } from "../utils/dates";

const BDAY_CAKE_ID = "TE001";

export function ProductoPage() {
  const navigate = useNavigate();
  const { productId } = useParams<{ productId: string }>();
  const { products, addToCart, customerSession } = useAppContext();
  const product = products.find((p) => p.id === productId);

  const [qty, setQty] = useState<number>(1);
  const [customMessage, setCustomMessage] = useState<string>("");
  const [shareMsg, setShareMsg] = useState<string>("");

  if (!product) {
    return (
      <div className="container" style={{ padding: "32px 0" }}>
        <p>Este producto no está disponible.</p>
        <button className="btn btn--primary" type="button" onClick={() => navigate("/productos")}>
          Ir al catálogo
        </button>
      </div>
    );
  }

  const isCake = /torta/i.test(product.nombre);
  const maxQty = Math.max(0, product.stock);

  const percentDiscount = useMemo(() => {
    if (!customerSession) return 0;
    const age = computeAge(customerSession.fnac ?? "") ?? null;
    if (typeof age === "number" && age > 50) return 0.5;
    if (customerSession.promoCode === "FELICES50" || customerSession.felices50) return 0.1;
    return 0;
  }, [customerSession]);

  const eligibleBirthday = useMemo(() => {
    if (!customerSession) return false;
    const thisYear = new Date().getFullYear();
    const alreadyRedeemed = customerSession.bdayRedeemedYear === thisYear;
    return !alreadyRedeemed && /@duoc\.cl$/i.test(customerSession.email) && isBirthdayToday(customerSession.fnac);
  }, [customerSession]);

  const usesBirthdayCake = eligibleBirthday && product.id === BDAY_CAKE_ID;

  const discountedPrice = usesBirthdayCake
    ? 0
    : Math.round(product.precio * (1 - percentDiscount));

  const related = products
    .filter((p) => p.categoria === product.categoria && p.id !== product.id)
    .slice(0, 4);

  const handleAdd = () => {
    if (maxQty <= 0) return;
    addToCart(product.id, qty, customMessage.trim());
  };

  const finalUrl = useMemo(() => {
    const base = window.location.origin + `/producto/${encodeURIComponent(product.id)}`;
    const params = new URLSearchParams({
      utm_source: "share",
      utm_medium: "social",
      utm_campaign: "share_product"
    });
    return `${base}?${params.toString()}`;
  }, [product.id]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(finalUrl);
      setShareMsg("¡Enlace copiado!");
    } catch (error) {
      console.error(error);
      setShareMsg("No se pudo copiar 😕");
    } finally {
      setTimeout(() => setShareMsg(""), 2000);
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${product.nombre} · Mil Sabores`,
          text: product.nombre,
          url: finalUrl
        });
      } else {
        await handleCopy();
        window.open("https://www.instagram.com/", "_blank", "noopener");
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="container producto">
      <nav className="breadcrumb" aria-label="Ruta de navegación">
        <Link to="/">Inicio</Link>
        <span className="sep">/</span>
        <Link to="/productos">Productos</Link>
        {product.categoria && (
          <>
            <span className="sep">/</span>
            <Link to={`/productos#${encodeURIComponent(product.categoria)}`}>{product.categoria}</Link>
          </>
        )}
        <span className="sep">/</span>
        <span>{product.nombre}</span>
      </nav>

      <section className="pdp">
        <div className="pdp__gallery">
          <img id="heroImg" src={product.img || "/img/placeholder.png"} alt={product.nombre} />
        </div>

        <div className="pdp__info">
          <h1>{product.nombre}</h1>
          {product.attr && <p className="muted">• {product.attr}</p>}
          <div className="pdp__price">
            {percentDiscount > 0 && !usesBirthdayCake ? (
              <>
                <s className="muted">{formatMoney(product.precio)}</s>
                <strong>{formatMoney(discountedPrice)}</strong>
              </>
            ) : (
              <strong>{formatMoney(discountedPrice)}</strong>
            )}
            {usesBirthdayCake && <span className="badge">Beneficio cumpleaños</span>}
          </div>
          <p id="pLong">
            {product.descripcion || "Deliciosa preparación de la casa, ideal para tus celebraciones."}
          </p>
          <p id="pStock" className="muted">
            {maxQty > 0 ? `Stock disponible: ${maxQty}` : "Sin stock"}
          </p>

          <div className="pdp__actions">
            <label className="muted" htmlFor="qty">
              Cantidad
            </label>
            <input
              id="qty"
              type="number"
              min={1}
              max={Math.max(1, maxQty)}
              value={qty}
              onChange={(event) => {
                const value = Number(event.target.value) || 1;
                setQty(Math.min(Math.max(1, value), Math.max(1, maxQty)));
              }}
              disabled={maxQty <= 0}
            />
          </div>

          {isCake && (
            <div id="customBox" className="pdp__custom">
              <label htmlFor="customMsg">Mensaje para la torta</label>
              <textarea
                id="customMsg"
                rows={3}
                maxLength={120}
                placeholder="Ej: ¡Feliz cumpleaños, Nico!"
                value={customMessage}
                onChange={(event) => setCustomMessage(event.target.value)}
              />
            </div>
          )}

          <button
            id="addBtn"
            className="btn btn--primary"
            type="button"
            disabled={maxQty <= 0}
            onClick={handleAdd}
          >
            {maxQty > 0 ? "Añadir al carrito" : "Sin stock"}
          </button>

          <div className="share">
            <p className="small muted" id="shareMsg">
              {shareMsg || "Comparte este producto"}
            </p>
            <div className="share__buttons">
              <button className="btn btn--ghost" type="button" onClick={handleShare}>
                Compartir
              </button>
              <button className="btn btn--ghost" type="button" onClick={handleCopy}>
                Copiar enlace
              </button>
            </div>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="related" aria-labelledby="relatedTitle">
          <h2 id="relatedTitle" className="section-title">
            También podría interesarte
          </h2>
          <div className="related__grid" id="related">
            {related.map((item) => (
              <article className="tarjeta" key={item.id}>
                <Link className="tarjeta__imagen" to={`/producto/${encodeURIComponent(item.id)}`}>
                  <img src={item.img || "/img/placeholder.png"} alt={item.nombre} loading="lazy" />
                </Link>
                <Link className="tarjeta__titulo" to={`/producto/${encodeURIComponent(item.id)}`}>
                  {item.nombre}
                </Link>
                <p className="tarjeta__atributo">{item.attr || "\u00A0"}</p>
                <p className="tarjeta__precio">
                  <strong>{formatMoney(item.precio)}</strong>
                </p>
                <Link className="btn btn--fantasma" to={`/producto/${encodeURIComponent(item.id)}`}>
                  Ver detalle
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
