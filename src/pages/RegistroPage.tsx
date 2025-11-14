import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { REGIONS } from "../data/regions";
import { computeAge } from "../utils/dates";
import { cleanRun, isEmailAllowed, isRunValid } from "../utils/validators";

const SHIPPING_OPTIONS = [
  { value: 0, label: "Retiro en tienda (gratis)" },
  { value: 3000, label: "Envío urbano ($3.000)" },
  { value: 6000, label: "Envío regional ($6.000)" }
];

const NAME_SANITIZE_REGEX = /[^A-Za-zÁÉÍÓÚáéíóúÑñÜü' -]/g;

const sanitizeNameInput = (value: string) =>
  value.replace(NAME_SANITIZE_REGEX, " ").replace(/\s{2,}/g, " ");

export function RegistroPage() {
  const navigate = useNavigate();
  const { registerCustomer } = useAppContext();

  const [run, setRun] = useState("");
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [email, setEmail] = useState("");
  const [fecha, setFecha] = useState("");
  const [region, setRegion] = useState("");
  const [comuna, setComuna] = useState("");
  const [direccion, setDireccion] = useState("");
  const [fono, setFono] = useState("");
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [promo, setPromo] = useState("");
  const [defaultShip, setDefaultShip] = useState(0);
  const [defaultCoupon, setDefaultCoupon] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [saveAddress, setSaveAddress] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const regionOptions = useMemo(() => Object.keys(REGIONS).sort((a, b) => a.localeCompare(b, "es")), []);
  const comunaOptions = useMemo(() => {
    const list = REGIONS[region] || [];
    return list.slice().sort((a, b) => a.localeCompare(b, "es"));
  }, [region]);

  const focusField = (field: string) => {
    const map: Record<string, string> = {
      run: "run",
      nombres: "nombre",
      apellidos: "apellidos",
      email: "correo",
      fecha: "fnac",
      region: "region",
      comuna: "comuna",
      direccion: "direccion",
      pass: "pass",
      pass2: "pass2"
    };
    const targetId = map[field];
    if (!targetId) return;
    requestAnimationFrame(() => {
      document.getElementById(targetId)?.focus();
    });
  };

  const validate = () => {
    const next: Record<string, string> = {};

    if (!isRunValid(run)) {
      next.run = run ? "RUN inválido (7-9 caracteres, sin puntos ni guion)." : "Falta completar el RUN.";
    }
    const nombresNormalized = sanitizeNameInput(nombres).trim();
    const apellidosNormalized = sanitizeNameInput(apellidos).trim();
    if (nombres !== sanitizeNameInput(nombres)) {
      next.nombres = "El nombre no puede contener números ni símbolos.";
    } else if (!nombresNormalized) {
      next.nombres = "Falta completar los nombres.";
    } else if (nombresNormalized.length > 50) {
      next.nombres = "Máximo 50 caracteres.";
    }
    if (apellidos !== sanitizeNameInput(apellidos)) {
      next.apellidos = "Los apellidos no pueden contener números ni símbolos.";
    } else if (!apellidosNormalized) {
      next.apellidos = "Falta completar los apellidos.";
    } else if (apellidosNormalized.length > 100) {
      next.apellidos = "Máximo 100 caracteres.";
    }
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      next.email = "Falta completar el correo.";
    } else if (trimmedEmail.length > 100 || !isEmailAllowed(trimmedEmail)) {
      next.email = "Correo permitido (duoc.cl, profesor.duoc.cl o gmail).";
    }
    if (!direccion.trim()) {
      next.direccion = "Falta completar la dirección.";
    } else if (direccion.trim().length > 300) {
      next.direccion = "Máximo 300 caracteres.";
    }
    if (!region) {
      next.region = "Falta seleccionar una región.";
    }
    if (!comuna) {
      next.comuna = "Falta seleccionar una comuna.";
    }
    if (!fecha) {
      next.fecha = "Falta completar la fecha de nacimiento.";
    } else {
      const age = computeAge(fecha);
      if (typeof age !== "number") {
        next.fecha = "Fecha inválida.";
      } else if (age < 18) {
        next.fecha = "Debes ser mayor de edad (18+).";
      } else if (age > 110) {
        next.fecha = "Ingresa una fecha real (máximo 110 años).";
      }
    }
    if (!pass) {
      next.pass = "Falta ingresar una contraseña.";
    } else if (pass.length < 4 || pass.length > 10) {
      next.pass = "Debe tener entre 4 y 10 caracteres.";
    }
    if (!pass2) {
      next.pass2 = "Confirma tu contraseña.";
    } else if (pass2 !== pass) {
      next.pass2 = "La confirmación debe coincidir.";
    }

    if (Object.keys(next).length) {
      next.form = "Corrige los campos marcados antes de continuar.";
      setErrors(next);
      const orderedKeys: Array<keyof typeof next> = [
        "run",
        "nombres",
        "apellidos",
        "email",
        "fecha",
        "region",
        "comuna",
        "direccion",
        "pass",
        "pass2"
      ];
      const firstKey = orderedKeys.find((key) => Boolean(next[key]));
      if (firstKey) {
        focusField(firstKey as string);
      }
      return false;
    }

    setErrors({});
    return true;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    const nombresNormalized = sanitizeNameInput(nombres).trim();
    const apellidosNormalized = sanitizeNameInput(apellidos).trim();

    const result = registerCustomer({
      run,
      tipo: "Cliente",
      nombre: nombresNormalized,
      apellidos: apellidosNormalized,
      email: email.trim(),
      fnac: fecha,
      region,
      comuna,
      direccion: direccion.trim(),
      phone: fono.trim(),
      pass,
      promoCode: promo.trim().toUpperCase() || undefined,
      prefs: {
        defaultShip,
        defaultCoupon: defaultCoupon.trim().toUpperCase() || undefined,
        newsletter,
        saveAddress
      }
    });

    if (!result.ok) {
      setErrors(result.message ? { form: result.message } : { form: "No pudimos registrar la cuenta." });
      return;
    }

    window.alert("¡Registro exitoso! Sesión iniciada.");
    setErrors({});
    navigate("/", { replace: true });
  };

  return (
    <main className="container auth" style={{ padding: "32px 0 48px" }}>
      <section className="auth-hero">
        <h1 className="auth-hero__title font-brand">Pastelería Mil Sabores</h1>
      </section>

      <section className="auth-card">
        <div className="auth-card__header">Registro de usuario</div>

        <form className="auth-form reg-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="run">RUN (sin puntos ni guion)</label>
            <input
              id="run"
              className={`form-control${errors.run ? " form-control--error" : ""}`}
              type="text"
              value={run}
              onChange={(event) => setRun(cleanRun(event.target.value))}
              required
              autoComplete="off"
              aria-invalid={Boolean(errors.run)}
            />
            <small className={`help${errors.run ? " help--error" : ""}`}>{errors.run}</small>
          </div>

          <div className="form-group grid-2">
            <div>
              <label htmlFor="nombre">Nombres</label>
              <input
                id="nombre"
                className={`form-control${errors.nombres ? " form-control--error" : ""}`}
                type="text"
                value={nombres}
                onChange={(event) => setNombres(sanitizeNameInput(event.target.value))}
                maxLength={50}
                required
                autoComplete="given-name"
                aria-invalid={Boolean(errors.nombres)}
              />
              <small className={`help${errors.nombres ? " help--error" : ""}`}>{errors.nombres}</small>
            </div>
            <div>
              <label htmlFor="apellidos">Apellidos</label>
              <input
                id="apellidos"
                className={`form-control${errors.apellidos ? " form-control--error" : ""}`}
                type="text"
                value={apellidos}
                onChange={(event) => setApellidos(sanitizeNameInput(event.target.value))}
                maxLength={100}
                required
                autoComplete="family-name"
                aria-invalid={Boolean(errors.apellidos)}
              />
              <small className={`help${errors.apellidos ? " help--error" : ""}`}>{errors.apellidos}</small>
            </div>
          </div>

          <div className="form-group grid-2">
            <div>
              <label htmlFor="correo">
                Correo <span className="small muted">(usa tu <b>@duoc.cl</b> si eres estudiante)</span>
              </label>
              <input
                id="correo"
                type="email"
                className={`form-control${errors.email ? " form-control--error" : ""}`}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                maxLength={100}
                required
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
              />
              <small className={`help${errors.email ? " help--error" : ""}`}>
                {errors.email || "Si usas tu correo DUOC tendrás beneficios el día de tu cumpleaños."}
              </small>
            </div>
            <div>
              <label htmlFor="fnac">Fecha de nacimiento (recomendado)</label>
              <input
                id="fnac"
                type="date"
                className={`form-control${errors.fecha ? " form-control--error" : ""}`}
                value={fecha}
                onChange={(event) => setFecha(event.target.value)}
                required
                autoComplete="bday"
                aria-invalid={Boolean(errors.fecha)}
              />
              <small className={`help${errors.fecha ? " help--error" : ""}`}>
                {errors.fecha || "Necesaria para 50% 50+ y regalo de cumpleaños."}
              </small>
            </div>
          </div>

          <div className="form-group grid-2">
            <div>
              <label htmlFor="region">Región</label>
              <select
                id="region"
                className={`form-control${errors.region ? " form-control--error" : ""}`}
                value={region}
                onChange={(event) => {
                  setRegion(event.target.value);
                  setComuna("");
                }}
                aria-invalid={Boolean(errors.region)}
              >
                <option value="">Seleccione</option>
                {regionOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <small className={`help${errors.region ? " help--error" : ""}`}>{errors.region}</small>
            </div>
            <div>
              <label htmlFor="comuna">Comuna</label>
              <select
                id="comuna"
                className={`form-control${errors.comuna ? " form-control--error" : ""}`}
                value={comuna}
                onChange={(event) => setComuna(event.target.value)}
                disabled={!region}
                aria-invalid={Boolean(errors.comuna)}
              >
                <option value="">Seleccione</option>
                {comunaOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <small className={`help${errors.comuna ? " help--error" : ""}`}>{errors.comuna}</small>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="direccion">Dirección</label>
            <input
              id="direccion"
              className={`form-control${errors.direccion ? " form-control--error" : ""}`}
              type="text"
              value={direccion}
              onChange={(event) => setDireccion(event.target.value)}
              maxLength={300}
              required
              autoComplete="street-address"
              aria-invalid={Boolean(errors.direccion)}
            />
            <small className={`help${errors.direccion ? " help--error" : ""}`}>{errors.direccion}</small>
          </div>

          <div className="form-group grid-2">
            <div>
              <label htmlFor="pass">Contraseña</label>
              <input
                id="pass"
                type="password"
                className={`form-control${errors.pass ? " form-control--error" : ""}`}
                value={pass}
                onChange={(event) => setPass(event.target.value)}
                minLength={4}
                maxLength={10}
                required
                autoComplete="new-password"
                aria-invalid={Boolean(errors.pass)}
              />
              <small className={`help${errors.pass ? " help--error" : ""}`}>{errors.pass}</small>
            </div>
            <div>
              <label htmlFor="pass2">Confirmar contraseña</label>
              <input
                id="pass2"
                type="password"
                className={`form-control${errors.pass2 ? " form-control--error" : ""}`}
                value={pass2}
                onChange={(event) => setPass2(event.target.value)}
                minLength={4}
                maxLength={10}
                required
                autoComplete="new-password"
                aria-invalid={Boolean(errors.pass2)}
              />
              <small className={`help${errors.pass2 ? " help--error" : ""}`}>{errors.pass2}</small>
            </div>
          </div>

          <div className="form-group grid-2">
            <div>
              <label htmlFor="fono">Teléfono (opcional)</label>
              <input
                id="fono"
                className="form-control"
                type="tel"
                value={fono}
                onChange={(event) => setFono(event.target.value.replace(/[^0-9+\s-]/g, ""))}
                maxLength={30}
                autoComplete="tel"
              />
              <small className="help">{errors.fono}</small>
            </div>
            <div>
              <label htmlFor="promo">Código de promoción (opcional)</label>
              <input
                id="promo"
                className="form-control"
                type="text"
                value={promo}
                onChange={(event) => setPromo(event.target.value)}
                placeholder="FELICES50"
                maxLength={20}
              />
              <small className="help">Si usas FELICES50 tendrás 10% permanente.</small>
            </div>
          </div>

          <h3 className="about-subtitle" style={{ marginTop: "24px" }}>
            Preferencias de compra
          </h3>

          <div className="form-group grid-2">
            <div>
              <label htmlFor="prefShip">Envío por defecto</label>
              <select
                id="prefShip"
                className="form-control"
                value={defaultShip}
                onChange={(event) => setDefaultShip(Number(event.target.value))}
              >
                {SHIPPING_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <small className="help">Se usará en el carrito si no has elegido otro.</small>
            </div>

            <div>
              <label htmlFor="prefCoupon">Cupón por defecto (opcional)</label>
              <input
                id="prefCoupon"
                className="form-control"
                type="text"
                value={defaultCoupon}
                onChange={(event) => setDefaultCoupon(event.target.value)}
                placeholder="ENVIOGRATIS, 5000OFF..."
                maxLength={20}
              />
              <small className="help">Se aplicará automáticamente si está vacío el cupón del carrito.</small>
            </div>

            <div className="form-group span-2">
              <div className="chk">
                <input
                  id="prefNewsletter"
                  type="checkbox"
                  checked={newsletter}
                  onChange={(event) => setNewsletter(event.target.checked)}
                />
                <label htmlFor="prefNewsletter">Quiero recibir promociones por email</label>
              </div>
              <div className="chk">
                <input
                  id="prefSaveAddr"
                  type="checkbox"
                  checked={saveAddress}
                  onChange={(event) => setSaveAddress(event.target.checked)}
                />
                <label htmlFor="prefSaveAddr">Guardar dirección para próximos pedidos</label>
              </div>
            </div>
          </div>

          {errors.form && <p className="error" role="alert">{errors.form}</p>}

          <div className="form-actions">
            <button className="btn btn--primary" type="submit">
              Registrarse
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
