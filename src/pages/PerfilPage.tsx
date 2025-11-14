import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { REGIONS } from "../data/regions";
import { computeAge } from "../utils/dates";

const SHIPPING_OPTIONS = [
  { value: 0, label: "Retiro en tienda (gratis)" },
  { value: 3000, label: "Envío urbano ($3.000)" },
  { value: 6000, label: "Envío regional ($6.000)" }
];

const NAME_SANITIZE_REGEX = /[^A-Za-zÁÉÍÓÚáéíóúÑñÜü' -]/g;

const normalizeNameInput = (value: string) =>
  value.replace(NAME_SANITIZE_REGEX, " ").replace(/\s{2,}/g, " ");

export function PerfilPage() {
  const navigate = useNavigate();
  const { customerSession, customers, updateCustomer, logoutCustomer } = useAppContext();

  const currentUser = useMemo(() => {
    if (!customerSession) return null;
    return (
      customers.find((user) => user.email.toLowerCase() === customerSession.email.toLowerCase()) || null
    );
  }, [customerSession, customers]);

  const [form, setForm] = useState({
    nombre: "",
    apellidos: "",
    direccion: "",
    region: "",
    comuna: "",
    phone: "",
    promoCode: "",
    defaultShip: 0,
    defaultCoupon: "",
    newsletter: false,
    saveAddress: false
  });

  const [passwordForm, setPasswordForm] = useState({
    current: "",
    next: "",
    confirm: ""
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passErrors, setPassErrors] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);

  const resetProfileForm = useCallback(() => {
    if (!currentUser) return;
    setForm({
      nombre: normalizeNameInput(currentUser.nombre || ""),
      apellidos: normalizeNameInput(currentUser.apellidos || ""),
      direccion: currentUser.direccion,
      region: currentUser.region,
      comuna: currentUser.comuna,
      phone: currentUser.phone || "",
      promoCode: currentUser.promoCode || "",
      defaultShip: currentUser.prefs?.defaultShip ?? 0,
      defaultCoupon: currentUser.prefs?.defaultCoupon || "",
      newsletter: Boolean(currentUser.prefs?.newsletter),
      saveAddress: Boolean(currentUser.prefs?.saveAddress)
    });
    setErrors({});
  }, [currentUser]);

  useEffect(() => {
    resetProfileForm();
  }, [resetProfileForm]);

  const regionOptions = useMemo(() => Object.keys(REGIONS).sort((a, b) => a.localeCompare(b, "es")), []);
  const comunaOptions = useMemo(() => {
    const list = REGIONS[form.region] || [];
    return list.slice().sort((a, b) => a.localeCompare(b, "es"));
  }, [form.region]);

  const defaultShipLabel = useMemo(() => {
    const value = currentUser?.prefs?.defaultShip ?? 0;
    return SHIPPING_OPTIONS.find((option) => option.value === value)?.label || SHIPPING_OPTIONS[0].label;
  }, [currentUser]);

  if (!customerSession) {
    return <Navigate to="/login" replace />;
  }

  if (!currentUser) {
    return (
      <main className="container" style={{ padding: "48px 0" }}>
        <div className="card" style={{ padding: "32px", textAlign: "center" }}>
          <p className="muted">Cargando información de tu cuenta…</p>
        </div>
      </main>
    );
  }

  const age = computeAge(currentUser.fnac);
  const benefitLabel = currentUser.felices50 ? "Beneficio FELICES50 activo" : "Sin beneficio permanente";
  const addressLine = [currentUser.direccion, currentUser.comuna, currentUser.region]
    .filter(Boolean)
    .join(", ") || "Sin dirección registrada";
  const phoneLabel = currentUser.phone || "Sin teléfono registrado";
  const defaultCouponLabel = currentUser.prefs?.defaultCoupon || "Sin cupón por defecto";
  const newsletterLabel = currentUser.prefs?.newsletter ? "Sí" : "No";
  const saveAddressLabel = currentUser.prefs?.saveAddress ? "Sí" : "No";

  const focusProfileField = (field: string) => {
    const map: Record<string, string> = {
      nombre: "profileNombre",
      apellidos: "profileApellidos",
      direccion: "profileDireccion",
      region: "profileRegion",
      comuna: "profileComuna",
      promoCode: "profilePromo",
      defaultCoupon: "profileCoupon"
    };
    const target = map[field];
    if (!target) return;
    requestAnimationFrame(() => {
      document.getElementById(target)?.focus();
    });
  };

  const handleProfileSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};

    const normalizedNombre = normalizeNameInput(form.nombre).trim();
    const normalizedApellidos = normalizeNameInput(form.apellidos).trim();

    if (!normalizedNombre) {
      nextErrors.nombre = "Falta completar los nombres.";
    } else if (normalizedNombre.length > 50) {
      nextErrors.nombre = "Máximo 50 caracteres.";
    }
    if (!normalizedApellidos) {
      nextErrors.apellidos = "Falta completar los apellidos.";
    } else if (normalizedApellidos.length > 100) {
      nextErrors.apellidos = "Máximo 100 caracteres.";
    }
    if (!form.direccion.trim()) {
      nextErrors.direccion = "Falta completar la dirección.";
    } else if (form.direccion.trim().length > 300) {
      nextErrors.direccion = "Máximo 300 caracteres.";
    }
    if (!form.region) {
      nextErrors.region = "Falta seleccionar una región.";
    }
    if (!form.comuna) {
      nextErrors.comuna = "Falta seleccionar una comuna.";
    }
    if (form.defaultCoupon.length > 20) {
      nextErrors.defaultCoupon = "Máximo 20 caracteres.";
    }
    if (form.promoCode && form.promoCode.length > 20) {
      nextErrors.promoCode = "Máximo 20 caracteres.";
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      const ordered: Array<keyof typeof nextErrors> = [
        "nombre",
        "apellidos",
        "direccion",
        "region",
        "comuna",
        "promoCode",
        "defaultCoupon"
      ];
      const first = ordered.find((key) => Boolean(nextErrors[key]));
      if (first) {
        focusProfileField(first as string);
      }
      return;
    }
    setErrors({});

    const promoCode = form.promoCode.trim().toUpperCase();
    const defaultCoupon = form.defaultCoupon.trim().toUpperCase();

    updateCustomer({
      nombre: normalizedNombre,
      apellidos: normalizedApellidos,
      direccion: form.direccion.trim(),
      region: form.region,
      comuna: form.comuna,
      phone: form.phone.trim() || undefined,
      promoCode,
      prefs: {
        defaultShip: form.defaultShip,
        defaultCoupon: defaultCoupon || undefined,
        newsletter: form.newsletter,
        saveAddress: form.saveAddress
      }
    });

    window.alert("Datos actualizados correctamente.");
    setIsEditing(false);
  };

  const handlePasswordSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next: Record<string, string> = {};

    if (!passwordForm.current) {
      next.current = "Ingresa tu contraseña actual.";
    } else if (passwordForm.current !== currentUser.pass) {
      next.current = "Contraseña actual incorrecta.";
    }

    if (!passwordForm.next) {
      next.next = "Ingresa una nueva contraseña.";
    } else if (passwordForm.next.length < 4 || passwordForm.next.length > 10) {
      next.next = "Debe tener entre 4 y 10 caracteres.";
    }

    if (passwordForm.confirm !== passwordForm.next) {
      next.confirm = "Debe coincidir.";
    }

    if (Object.keys(next).length) {
      setPassErrors(next);
      return;
    }

    setPassErrors({});
    updateCustomer({ pass: passwordForm.next });
    setPasswordForm({ current: "", next: "", confirm: "" });
    window.alert("Contraseña actualizada.");
  };

  const handleLogout = () => {
    setIsEditing(false);
    logoutCustomer();
    navigate("/", { replace: true });
  };

  const startEdit = () => {
    resetProfileForm();
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    resetProfileForm();
    setIsEditing(false);
  };

  return (
    <main className="container" style={{ padding: "32px 0 48px" }}>
      <div className="profile-page">
        <header className="profile-header">
          <div>
            <h1 className="section-title font-brand profile-header__title">Mi perfil</h1>
            <p className="muted">
              RUN <strong>{currentUser.run}</strong> · Registrado el {new Date(currentUser.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="profile-actions profile-actions--right">
            {!isEditing ? (
              <button className="btn btn--primary" type="button" onClick={startEdit}>
                Modificar datos
              </button>
            ) : (
              <button className="btn btn--ghost" type="button" onClick={handleCancelEdit}>
                Cancelar edición
              </button>
            )}
          </div>
        </header>

        <section className="profile-body">
          {!isEditing ? (
            <article className="profile-view-card active" aria-live="polite">
              <header>
                <h2 className="profile-card__title">{currentUser.nombre} {currentUser.apellidos}</h2>
                <p className="profile-inline">{currentUser.email}</p>
                <p className="profile-inline">
                  {age ? `${age} años` : "Sin fecha registrada"} · {benefitLabel}
                  {currentUser.promoCode ? ` · Cupón: ${currentUser.promoCode}` : ""}
                </p>
              </header>
              <ul>
                <li>
                  <strong>Dirección</strong>
                  <span>{addressLine}</span>
                </li>
                <li>
                  <strong>Teléfono</strong>
                  <span>{phoneLabel}</span>
                </li>
                <li>
                  <strong>Envío preferido</strong>
                  <span>{defaultShipLabel}</span>
                </li>
                <li>
                  <strong>Cupón por defecto</strong>
                  <span>{defaultCouponLabel}</span>
                </li>
                <li>
                  <strong>Novedades</strong>
                  <span>{newsletterLabel}</span>
                </li>
                <li>
                  <strong>Recordar dirección</strong>
                  <span>{saveAddressLabel}</span>
                </li>
              </ul>
              <div className="profile-summary__note">
                Mantén tus datos actualizados para agilizar las compras y recibir beneficios especiales.
              </div>
              <div className="profile-actions profile-actions--right">
                <Link className="btn" to="/carrito">
                  Revisar carrito
                </Link>
                <button className="btn btn--ghost" type="button" onClick={handleLogout}>
                  Cerrar sesión
                </button>
              </div>
            </article>
          ) : (
            <article className="profile-edit profile-view-card active">
              <header>
                <h2 className="profile-card__title">Modificar mis datos</h2>
                <p className="profile-inline">Revisa que todos los campos estén completos antes de guardar.</p>
              </header>

              <form className="profile-form" onSubmit={handleProfileSubmit} noValidate>
                <div className="profile-field-row">
                  <div className="profile-field">
                    <label htmlFor="profileNombre">Nombres</label>
                    <input
                      id="profileNombre"
                      className={`form-control${errors.nombre ? " form-control--error" : ""}`}
                      type="text"
                      value={form.nombre}
                      onChange={(event) => setForm((prev) => ({ ...prev, nombre: normalizeNameInput(event.target.value) }))}
                      maxLength={50}
                      required
                      aria-invalid={Boolean(errors.nombre)}
                    />
                    <small className={`help${errors.nombre ? " help--error" : ""}`}>{errors.nombre}</small>
                  </div>
                  <div className="profile-field">
                    <label htmlFor="profileApellidos">Apellidos</label>
                    <input
                      id="profileApellidos"
                      className={`form-control${errors.apellidos ? " form-control--error" : ""}`}
                      type="text"
                      value={form.apellidos}
                      onChange={(event) => setForm((prev) => ({ ...prev, apellidos: normalizeNameInput(event.target.value) }))}
                      maxLength={100}
                      required
                      aria-invalid={Boolean(errors.apellidos)}
                    />
                    <small className={`help${errors.apellidos ? " help--error" : ""}`}>{errors.apellidos}</small>
                  </div>
                </div>

                <div className="profile-field">
                  <label htmlFor="profileDireccion">Dirección</label>
                  <input
                    id="profileDireccion"
                    className={`form-control${errors.direccion ? " form-control--error" : ""}`}
                    type="text"
                    value={form.direccion}
                    onChange={(event) => setForm((prev) => ({ ...prev, direccion: event.target.value }))}
                    maxLength={300}
                    required
                    aria-invalid={Boolean(errors.direccion)}
                  />
                  <small className={`help${errors.direccion ? " help--error" : ""}`}>{errors.direccion}</small>
                </div>

                <div className="profile-field-row">
                  <div className="profile-field">
                    <label htmlFor="profileRegion">Región</label>
                    <select
                      id="profileRegion"
                      className={`form-control${errors.region ? " form-control--error" : ""}`}
                      value={form.region}
                      onChange={(event) => {
                        const value = event.target.value;
                        setForm((prev) => ({
                          ...prev,
                          region: value,
                          comuna: value === prev.region ? prev.comuna : ""
                        }));
                      }}
                      aria-invalid={Boolean(errors.region)}
                    >
                      <option value="">Seleccione</option>
                      {regionOptions.map((region) => (
                        <option key={region} value={region}>
                          {region}
                        </option>
                      ))}
                    </select>
                    <small className={`help${errors.region ? " help--error" : ""}`}>{errors.region}</small>
                  </div>
                  <div className="profile-field">
                    <label htmlFor="profileComuna">Comuna</label>
                    <select
                      id="profileComuna"
                      className={`form-control${errors.comuna ? " form-control--error" : ""}`}
                      value={form.comuna}
                      onChange={(event) => setForm((prev) => ({ ...prev, comuna: event.target.value }))}
                      disabled={!form.region}
                      aria-invalid={Boolean(errors.comuna)}
                    >
                      <option value="">Seleccione</option>
                      {comunaOptions.map((comuna) => (
                        <option key={comuna} value={comuna}>
                          {comuna}
                        </option>
                      ))}
                    </select>
                    <small className={`help${errors.comuna ? " help--error" : ""}`}>{errors.comuna}</small>
                  </div>
                </div>

                <div className="profile-field-row">
                  <div className="profile-field">
                    <label htmlFor="profilePhone">Teléfono</label>
                    <input
                      id="profilePhone"
                      className="form-control"
                      type="tel"
                      value={form.phone}
                      onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value.replace(/[^0-9+\s-]/g, "") }))}
                      maxLength={30}
                    />
                    <small className={`help${errors.phone ? " help--error" : ""}`}>{errors.phone}</small>
                  </div>
                  <div className="profile-field">
                    <label htmlFor="profilePromo">Código de promoción</label>
                    <input
                      id="profilePromo"
                      className={`form-control${errors.promoCode ? " form-control--error" : ""}`}
                      type="text"
                      value={form.promoCode}
                      onChange={(event) => setForm((prev) => ({ ...prev, promoCode: event.target.value.toUpperCase() }))}
                      maxLength={20}
                      disabled
                    />
                    <small className={`help${errors.promoCode ? " help--error" : ""}`}>
                      {errors.promoCode || "El código FELICES50 sólo se aplica al registrarte. Puedes editar sólo el cupón por defecto."}
                    </small>
                  </div>
                </div>

                <div className="profile-field-row">
                  <div className="profile-field">
                    <label htmlFor="profileShip">Envío por defecto</label>
                    <select
                      id="profileShip"
                      className="form-control"
                      value={form.defaultShip}
                      onChange={(event) => setForm((prev) => ({ ...prev, defaultShip: Number(event.target.value) }))}
                    >
                      {SHIPPING_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="profile-field">
                    <label htmlFor="profileCoupon">Cupón por defecto</label>
                    <input
                      id="profileCoupon"
                      className={`form-control${errors.defaultCoupon ? " form-control--error" : ""}`}
                      type="text"
                      value={form.defaultCoupon}
                      onChange={(event) => setForm((prev) => ({ ...prev, defaultCoupon: event.target.value.toUpperCase() }))}
                      maxLength={20}
                      aria-invalid={Boolean(errors.defaultCoupon)}
                    />
                    <small className={`help${errors.defaultCoupon ? " help--error" : ""}`}>{errors.defaultCoupon}</small>
                  </div>
                </div>

                <div className="profile-field-row">
                  <div className="chk">
                    <input
                      id="profileNewsletter"
                      type="checkbox"
                      checked={form.newsletter}
                      onChange={(event) => setForm((prev) => ({ ...prev, newsletter: event.target.checked }))}
                    />
                    <label htmlFor="profileNewsletter">Recibir novedades y descuentos</label>
                  </div>
                  <div className="chk">
                    <input
                      id="profileSaveAddress"
                      type="checkbox"
                      checked={form.saveAddress}
                      onChange={(event) => setForm((prev) => ({ ...prev, saveAddress: event.target.checked }))}
                    />
                    <label htmlFor="profileSaveAddress">Recordar dirección para próximos pedidos</label>
                  </div>
                </div>

                <div className="form-actions form-actions--split">
                  <button className="btn btn--primary" type="submit">
                    Guardar cambios
                  </button>
                  <button className="btn" type="button" onClick={handleCancelEdit}>
                    Cancelar
                  </button>
                </div>
              </form>
            </article>
          )}

          <article className="profile-edit card profile-pass-panel">
            <h2 className="profile-card__title">Cambiar contraseña</h2>
            <form className="profile-form" onSubmit={handlePasswordSubmit} noValidate>
              <div className="form-group">
                <label htmlFor="profilePassCurrent">Contraseña actual</label>
                <input
                  id="profilePassCurrent"
                  className={`form-control${passErrors.current ? " form-control--error" : ""}`}
                  type="password"
                  value={passwordForm.current}
                  onChange={(event) => setPasswordForm((prev) => ({ ...prev, current: event.target.value }))}
                  maxLength={10}
                  required
                  aria-invalid={Boolean(passErrors.current)}
                />
                <small className={`help${passErrors.current ? " help--error" : ""}`}>{passErrors.current}</small>
              </div>
              <div className="form-group grid-2">
                <div>
                  <label htmlFor="profilePassNew">Nueva contraseña</label>
                  <input
                    id="profilePassNew"
                    className={`form-control${passErrors.next ? " form-control--error" : ""}`}
                    type="password"
                    value={passwordForm.next}
                    onChange={(event) => setPasswordForm((prev) => ({ ...prev, next: event.target.value }))}
                    maxLength={10}
                    required
                    aria-invalid={Boolean(passErrors.next)}
                  />
                  <small className={`help${passErrors.next ? " help--error" : ""}`}>{passErrors.next}</small>
                </div>
                <div>
                  <label htmlFor="profilePassConfirm">Confirmar contraseña</label>
                  <input
                    id="profilePassConfirm"
                    className={`form-control${passErrors.confirm ? " form-control--error" : ""}`}
                    type="password"
                    value={passwordForm.confirm}
                    onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirm: event.target.value }))}
                    maxLength={10}
                    required
                    aria-invalid={Boolean(passErrors.confirm)}
                  />
                  <small className={`help${passErrors.confirm ? " help--error" : ""}`}>{passErrors.confirm}</small>
                </div>
              </div>

              <div className="form-actions">
                <button className="btn" type="submit">
                  Actualizar contraseña
                </button>
              </div>
            </form>
          </article>
        </section>
      </div>
    </main>
  );
}
