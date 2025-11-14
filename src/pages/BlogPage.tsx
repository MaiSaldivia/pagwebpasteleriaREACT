import { Link } from "react-router-dom";
import { BLOG_POSTS } from "../data/blogPosts";

export function BlogPage() {
  return (
    <div className="container contenedor-blog" style={{ padding: "32px 0" }}>
      <h1 className="titulo-principal-blog">Nuestro Blog de Noticias</h1>
      {BLOG_POSTS.map((post, index) => (
        <section key={post.id} className={`articulo-blog articulo-blog--${index + 1}`}>
          <div className="contenido-blog">
            <h2 className="titulo-articulo font-brand">CASO CURIOSO #{index + 1}</h2>
            <p className="resumen-articulo">{post.excerpt}</p>
            <Link className="btn btn--principal" to={`/blog/${post.slug}`}>
              Leer más
            </Link>
          </div>
        </section>
      ))}
    </div>
  );
}
