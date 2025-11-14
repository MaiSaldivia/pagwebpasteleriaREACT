import { Link } from "react-router-dom";
import type { Product } from "../../types";
import { useAppContext } from "../../context/AppContext";
import { formatMoney } from "../../utils/format";

type Props = {
  product: Product;
};

export function ProductCard({ product }: Props) {
  const { addToCart } = useAppContext();

  return (
    <article className="tarjeta" data-id={product.id}>
      <Link className="tarjeta__imagen" to={`/producto/${encodeURIComponent(product.id)}`} aria-label={product.nombre}>
        <img loading="lazy" src={product.img || "/img/placeholder.png"} alt={product.nombre} />
      </Link>
      <Link className="tarjeta__titulo" to={`/producto/${encodeURIComponent(product.id)}`}>
        {product.nombre}
      </Link>
      <p className="tarjeta__atributo">{product.attr || "\u00A0"}</p>
      <p className="tarjeta__precio">
        <strong>{formatMoney(product.precio)}</strong>
      </p>
      <button
        className="btn btn--fantasma boton-a\u00f1adir-carrito"
        type="button"
        onClick={() => addToCart(product.id, 1)}
      >
        Añadir
      </button>
    </article>
  );
}
