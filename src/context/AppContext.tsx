import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import type {
  AdminSession,
  AdminUser,
  BlogComment,
  CartItem,
  CartTotals,
  CustomerSession,
  CustomerUser,
  Order,
  Product,
  UserBenefits
} from "../types";
import { BASE_PRODUCTS } from "../data/products";
import { COUPONS } from "../data/coupons";
import { BASE_ADMIN_USERS } from "../data/adminUsers";
import { BASE_ORDERS } from "../data/orders";
import { computeAge, isBirthdayToday } from "../utils/dates";
import { readJSON, removeKey, writeJSON } from "../utils/storage";
import { cleanRun, isRunValid, isEmailAllowed } from "../utils/validators";
import { buildReceiptHTML } from "../utils/receipt";

const USERS_KEY = "USERS_V1";
const CURRENT_USER_KEY = "CURRENT_USER_V1";
const CART_KEY = "cart"; // legacy guest cart
const SHIP_KEY = "shipCost";
const COUPON_KEY = "couponCode_v1";
const ADMIN_PRODUCTS_KEY = "ADMIN_PRODUCTS_V1";
const ADMIN_USERS_KEY = "ADMIN_USERS_V1";
const ADMIN_SESSION_KEY = "session";
const BLOG_COMMENTS_KEY = "BLOG_COMMENTS_V1";
const ORDERS_KEY = "ORDERS_V1";

const EMAIL_DUOC_REGEX = /@duoc\.cl$/i;
const FELICES_CODE = "FELICES50";
const BDAY_CAKE_ID = "TE001";

function normalizeProduct(entry: any): Product | null {
  if (!entry) return null;
  const id = String(
    entry.id || entry.codigo || entry.code || entry.nombre || entry.name || ""
  ).trim();
  if (!id) return null;
  const baseImg = entry.img || entry.imagen || entry.image || entry.picture || "";
  const img = baseImg.startsWith("/") ? baseImg : baseImg ? `/${baseImg}` : "";
  return {
    id,
    nombre: entry.nombre || entry.name || entry.title || "",
    precio: Number(entry.precio ?? entry.price ?? 0),
    categoria: entry.categoria || entry.category || entry.categoryName || "",
    attr: entry.attr || entry.atributo || entry.attributes || "",
    img,
    stock: Number(entry.stock ?? 0),
    stockCritico: Number(entry.stockCritico ?? 0),
    descripcion: entry.descripcion || entry.longDesc || ""
  };
}

function toAdminRecord(product: Product) {
  const image = product.img.startsWith("/") ? product.img.slice(1) : product.img;
  return {
    codigo: product.id,
    nombre: product.nombre,
    precio: product.precio,
    categoria: product.categoria,
    attr: product.attr,
    imagen: image,
    stock: product.stock,
    stockCritico: product.stockCritico,
    descripcion: product.descripcion ?? ""
  };
}

function loadProducts(): Product[] {
  const storedRaw = readJSON<any[]>(ADMIN_PRODUCTS_KEY, []);
  if (!storedRaw.length) {
    writeJSON(ADMIN_PRODUCTS_KEY, BASE_PRODUCTS.map(toAdminRecord));
    return BASE_PRODUCTS;
  }
  const baseMap = new Map(BASE_PRODUCTS.map((p) => [p.id, { ...p }]));
  storedRaw
    .map(normalizeProduct)
    .filter((p): p is Product => Boolean(p))
    .forEach((p) => {
      const existing = baseMap.get(p.id) || {};
      baseMap.set(p.id, { ...existing, ...p });
    });
  return Array.from(baseMap.values());
}

function loadCustomers(): CustomerUser[] {
  return readJSON<CustomerUser[]>(USERS_KEY, []);
}

function loadCustomerSession(): CustomerSession | null {
  return readJSON<CustomerSession | null>(CURRENT_USER_KEY, null);
}

function loadAdminUsers(): AdminUser[] {
  const stored = readJSON<AdminUser[]>(ADMIN_USERS_KEY, []);
  if (!stored.length) {
    writeJSON(ADMIN_USERS_KEY, BASE_ADMIN_USERS);
    return BASE_ADMIN_USERS;
  }
  const map = new Map(
    BASE_ADMIN_USERS.map((u) => [u.run.toUpperCase(), { ...u }])
  );
  stored.forEach((user) => {
    map.set((user.run || "").toUpperCase(), { ...map.get(user.run.toUpperCase()), ...user });
  });
  return Array.from(map.values());
}

function loadAdminSession(): AdminSession | null {
  return readJSON<AdminSession | null>(ADMIN_SESSION_KEY, null);
}

function loadOrders(): Order[] {
  const stored = readJSON<Order[]>(ORDERS_KEY, []);
  if (!stored.length) {
    writeJSON(ORDERS_KEY, BASE_ORDERS);
    return BASE_ORDERS;
  }
  return stored;
}

function loadComments(): Record<string, BlogComment[]> {
  const raw = readJSON<Record<string, any[]>>(BLOG_COMMENTS_KEY, {});
  const ensure = (list?: any[]) =>
    Array.isArray(list)
      ? list.map((c) => {
          const comment = c as any;
          const owner = (comment.ownerId || comment.authorEmail || comment.email || "").toLowerCase();
          return {
            id:
              comment.id || `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            ownerId: owner,
            authorEmail: owner,
            authorName: comment.authorName || comment.name || comment.author || "",
            text: comment.text || "",
            ts: Number(comment.ts || Date.now()),
            editedAt: comment.editedAt ?? null
          } satisfies BlogComment;
        })
      : [];
  const result: Record<string, BlogComment[]> = {};
  for (const key of Object.keys(raw)) {
    result[key] = ensure(raw[key]);
  }
  writeJSON(BLOG_COMMENTS_KEY, result);
  return result;
}

type CouponEval = {
  valid: boolean;
  discount: number;
  shipAfter: number;
  label?: string;
  code?: string;
};

type ContextValue = {
  products: Product[];
  refreshProducts: () => void;
  upsertProduct: (product: Product) => void;
  removeProduct: (id: string) => void;
  cart: CartItem[];
  addToCart: (id: string, qty?: number, msg?: string) => void;
  setCartQty: (id: string, qty: number, msg?: string) => void;
  removeFromCart: (id: string, msg?: string) => void;
  clearCart: () => void;
  cartTotals: CartTotals;
  shippingCost: number;
  setShippingCost: (value: number) => void;
  coupon: string;
  setCoupon: (code: string) => void;
  evaluateCoupon: (subTotal: number, shipCost: number) => CouponEval;
  benefitsForCart: (items: CartTotals["items"], subTotal: number) => UserBenefits;
  customerSession: CustomerSession | null;
  customers: CustomerUser[];
  registerCustomer: (
    payload: Omit<CustomerUser, "createdAt" | "bdayRedeemedYear"> & {
      createdAt?: number;
      bdayRedeemedYear?: number | null;
    }
  ) => { ok: boolean; message?: string };
  loginCustomer: (email: string, password: string) => { ok: boolean; message?: string };
  logoutCustomer: () => void;
  updateCustomer: (updates: Partial<CustomerUser>) => void;
  upsertCustomer: (user: CustomerUser) => void;
  removeCustomer: (email: string) => void;
  adminUsers: AdminUser[];
  upsertAdminUser: (user: AdminUser) => void;
  removeAdminUser: (run: string) => void;
  adminSession: AdminSession | null;
  adminLogin: (email: string, password: string) => { ok: boolean; message?: string };
  adminLogout: () => void;
  orders: Order[];
  updateOrders: (orders: Order[]) => void;
  comments: Record<string, BlogComment[]>;
  addComment: (postId: string, text: string) => { ok: boolean; message?: string };
  editComment: (postId: string, id: string, text: string) => void;
  deleteComment: (postId: string, id: string) => void;
  openReceiptWindow: (payload: {
    items: CartTotals["items"];
    subTotal: number;
    benefits: UserBenefits;
    coupon: CouponEval;
    shipCost: number;
    total: number;
    contactEmail?: string | null;
  }) => void;
};

const AppContext = createContext<ContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(() => loadProducts());
  const [customers, setCustomers] = useState<CustomerUser[]>(() => loadCustomers());
  const [customerSession, setCustomerSession] = useState<CustomerSession | null>(() => loadCustomerSession());
  // Make cart unique per customer (if logged) otherwise use guest key
  const cartStorageKey = customerSession?.email ? `${CART_KEY}_${customerSession.email.toLowerCase()}` : CART_KEY;
  const [cart, setCart] = useState<CartItem[]>(() => readJSON<CartItem[]>(cartStorageKey, []));
  const [shippingCost, setShippingCostState] = useState<number>(() => readJSON<number>(SHIP_KEY, 0));
  const [coupon, setCouponState] = useState<string>(() => readJSON<string>(COUPON_KEY, ""));
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>(() => loadAdminUsers());
  const [adminSession, setAdminSession] = useState<AdminSession | null>(() => loadAdminSession());
  const [orders, setOrders] = useState<Order[]>(() => loadOrders());
  const [comments, setComments] = useState<Record<string, BlogComment[]>>(() => loadComments());

  useEffect(() => {
    // Persist cart to a per-user key when possible
    const key = customerSession?.email ? `${CART_KEY}_${customerSession.email.toLowerCase()}` : CART_KEY;
    writeJSON(key, cart);
  }, [cart]);

  useEffect(() => {
    writeJSON(SHIP_KEY, shippingCost);
  }, [shippingCost]);

  useEffect(() => {
    writeJSON(COUPON_KEY, coupon.trim().toUpperCase());
  }, [coupon]);

  useEffect(() => {
    writeJSON(USERS_KEY, customers);
  }, [customers]);

  useEffect(() => {
    customerSession
      ? writeJSON(CURRENT_USER_KEY, customerSession)
      : removeKey(CURRENT_USER_KEY);
  }, [customerSession]);

  useEffect(() => {
    writeJSON(ADMIN_USERS_KEY, adminUsers);
  }, [adminUsers]);

  useEffect(() => {
    adminSession
      ? writeJSON(ADMIN_SESSION_KEY, adminSession)
      : removeKey(ADMIN_SESSION_KEY);
  }, [adminSession]);

  useEffect(() => {
    writeJSON(ORDERS_KEY, orders);
  }, [orders]);

  useEffect(() => {
    writeJSON(BLOG_COMMENTS_KEY, comments);
  }, [comments]);

  useEffect(() => {
    const handler = (event: StorageEvent) => {
      if (event.key === ADMIN_PRODUCTS_KEY) {
        setProducts(loadProducts());
      }
      if (event.key === USERS_KEY) {
        setCustomers(loadCustomers());
      }
      if (event.key === CURRENT_USER_KEY) {
        setCustomerSession(loadCustomerSession());
      }
      if (event.key === ADMIN_USERS_KEY) {
        setAdminUsers(loadAdminUsers());
      }
      if (event.key === ADMIN_SESSION_KEY) {
        setAdminSession(loadAdminSession());
      }
      if (event.key === BLOG_COMMENTS_KEY) {
        setComments(loadComments());
      }
      if (event.key === ORDERS_KEY) {
        setOrders(loadOrders());
      }
      // React to cart changes for other tabs (guest or user-specific)
      if (event.key && event.key.startsWith(CART_KEY)) {
        // if it's the current user's cart key, reload
        const myKey = customerSession?.email ? `${CART_KEY}_${customerSession.email.toLowerCase()}` : CART_KEY;
        if (event.key === myKey) {
          setCart(readJSON<CartItem[]>(myKey, []));
        }
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  // Prune cart items when products change (evita huérfanos)
  useEffect(() => {
    const ids = new Set(products.map((p) => p.id));
    setCart((prev) => {
      const filtered = prev.filter((item) => ids.has(item.id));
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [products]);

  const refreshProducts = useCallback(() => {
    setProducts(loadProducts());
  }, []);

  const upsertProduct = useCallback(
    (product: Product) => {
      setProducts((prev) => {
        const map = new Map(prev.map((p) => [p.id, p]));
        map.set(product.id, product);
        const next = Array.from(map.values());
        writeJSON(ADMIN_PRODUCTS_KEY, next.map(toAdminRecord));
        return next;
      });
    },
    []
  );

  const removeProduct = useCallback((id: string) => {
    setProducts((prev) => {
      const next = prev.filter((p) => p.id !== id);
      writeJSON(ADMIN_PRODUCTS_KEY, next.map(toAdminRecord));
      return next;
    });
  }, []);

  const addToCart = useCallback(
    (id: string, qty = 1, msg = "") => {
      const product = products.find((p) => p.id === id);
      if (!product) {
        window.alert("Este producto ya no está disponible.");
        return;
      }
      if (product.stock <= 0) {
        window.alert("Sin stock disponible.");
        return;
      }
      const desired = Math.max(1, Number(qty));
      setCart((prev) => {
        const idx = prev.findIndex((item) => item.id === id && (item.msg || "") === msg);
        const currentQty = idx >= 0 ? prev[idx].qty : 0;
        const remaining = Math.max(0, product.stock - currentQty);
        if (remaining <= 0) {
          window.alert("Sin stock disponible.");
          return prev;
        }
        const toAdd = Math.min(desired, remaining);
        if (toAdd < desired) {
          window.alert(`Solo quedan ${product.stock} unidad(es). Se agregaron ${toAdd}.`);
        }
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], qty: next[idx].qty + toAdd };
          return next;
        }
        return [...prev, { id, qty: toAdd, msg }];
      });
    },
    [products]
  );

  const setCartQty = useCallback(
    (id: string, qty: number, msg = "") => {
      const product = products.find((p) => p.id === id);
      if (!product) return;
      const desired = Math.max(0, Math.floor(Number.isFinite(qty) ? qty : 0));
      const max = product.stock;
      const nextQty = Math.min(desired, max);
      if (desired > max) {
        window.alert(`Stock disponible: ${max}`);
      }
      setCart((prev) => {
        const idx = prev.findIndex((item) => item.id === id && (item.msg || "") === msg);
        if (idx === -1) return prev;
        const next = [...prev];
        if (nextQty === 0) {
          next.splice(idx, 1);
        } else {
          next[idx] = { ...next[idx], qty: nextQty };
        }
        return next;
      });
    },
    [products]
  );

  const removeFromCart = useCallback((id: string, msg = "") => {
    setCart((prev) => prev.filter((item) => !(item.id === id && (item.msg || "") === msg)));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const cartTotals = useMemo<CartTotals>(() => {
    const items = cart
      .map((item) => {
        const product = products.find((p) => p.id === item.id);
        if (!product) return null;
        const subtotal = product.precio * item.qty;
        return { product, qty: item.qty, msg: item.msg, subtotal };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
    const subTotal = items.reduce((sum, entry) => sum + entry.subtotal, 0);
    const totalQty = items.reduce((sum, entry) => sum + entry.qty, 0);
    return { items, subTotal, totalQty };
  }, [cart, products]);

  const setShippingCost = useCallback((value: number) => {
    setShippingCostState(Math.max(0, Number(value) || 0));
  }, []);

  const setCoupon = useCallback((code: string) => {
    setCouponState(code.trim().toUpperCase());
  }, []);

  const evaluateCoupon = useCallback(
    (subTotal: number, shipCost: number): CouponEval => {
      const code = coupon.trim().toUpperCase();
      if (!code || code === FELICES_CODE) {
        return { valid: false, discount: 0, shipAfter: shipCost };
      }
      const definition = COUPONS[code];
      if (!definition) {
        return { valid: false, discount: 0, shipAfter: shipCost };
      }
      if (definition.type === "amount") {
        const discount = Math.max(0, Math.min(subTotal, definition.value));
        return { valid: true, discount, shipAfter: shipCost, label: definition.label, code };
      }
      if (definition.type === "ship") {
        return { valid: true, discount: 0, shipAfter: 0, label: definition.label, code };
      }
      return { valid: false, discount: 0, shipAfter: shipCost };
    },
    [coupon]
  );

  const benefitsForCart = useCallback(
    (items: CartTotals["items"], subTotal: number): UserBenefits => {
      const session = customerSession;
      if (!session) {
        return {
          userDisc: 0,
          userLabel: "",
          bdayDisc: 0,
          bdayLabel: "",
          bdayEligible: false,
          bdayApplied: false
        };
      }
      const thisYear = new Date().getFullYear();
      const eligibleToday = EMAIL_DUOC_REGEX.test(session.email || "") &&
        isBirthdayToday(session.fnac) &&
        (session.bdayRedeemedYear ?? null) !== thisYear;

      const cake = items.find(
        (item) => item.product.id === BDAY_CAKE_ID || /torta especial de cumpleaños/i.test(item.product.nombre)
      );

      let bdayDisc = 0;
      let bdayLabel = "";
      let bdayApplied = false;
      if (eligibleToday && cake && cake.qty > 0) {
        bdayDisc = cake.product.precio;
        bdayLabel = "Beneficio DUOC: Torta de Cumpleaños gratis";
        bdayApplied = true;
      }

      const age = computeAge(session.fnac ?? "");
      const percent = typeof age === "number" && age > 50
        ? 0.5
        : session.promoCode === FELICES_CODE || session.felices50
          ? 0.1
          : 0;
      const base = Math.max(0, subTotal - bdayDisc);
      const userDisc = Math.round(base * percent);
      const userLabel = percent ? `Beneficio de usuario (${Math.round(percent * 100)}% OFF)` : "";

      return {
        userDisc,
        userLabel,
        bdayDisc,
        bdayLabel,
        bdayEligible: eligibleToday,
        bdayApplied
      };
    },
    [customerSession]
  );

  const registerCustomer = useCallback<ContextValue["registerCustomer"]>(
    (payload) => {
      const email = payload.email.trim().toLowerCase();
      if (!isEmailAllowed(email)) {
        return { ok: false, message: "Correo no permitido." };
      }
      if (!isRunValid(payload.run)) {
        return { ok: false, message: "RUN inválido." };
      }
      if (customers.some((u) => u.email.toLowerCase() === email)) {
        return { ok: false, message: "Este correo ya está registrado." };
      }
      const now = Date.now();
      const nuevo: CustomerUser = {
        run: cleanRun(payload.run),
        tipo: payload.tipo,
        nombre: payload.nombre,
        apellidos: payload.apellidos,
        email,
        fnac: payload.fnac,
        region: payload.region,
        comuna: payload.comuna,
        direccion: payload.direccion,
        phone: payload.phone,
        pass: payload.pass,
        promoCode: payload.promoCode?.toUpperCase() || "",
        // FELICES50 is only applied at registration
        felices50: payload.promoCode?.toUpperCase() === FELICES_CODE,
        createdAt: payload.createdAt ?? now,
        bdayRedeemedYear: payload.bdayRedeemedYear ?? null,
        prefs: payload.prefs
      };
      setCustomers((prev) => [...prev, nuevo]);
      setCustomerSession({
        email: nuevo.email,
        nombre: nuevo.nombre,
        fnac: nuevo.fnac,
        promoCode: nuevo.promoCode,
        felices50: nuevo.felices50,
        bdayRedeemedYear: nuevo.bdayRedeemedYear,
        prefs: nuevo.prefs
      });
      return { ok: true };
    },
    [customers]
  );

  const loginCustomer = useCallback<ContextValue["loginCustomer"]>(
    (email, password) => {
      const normalized = email.trim().toLowerCase();
      const user = customers.find(
        (u) => u.email.toLowerCase() === normalized && u.pass === password
      );
      if (!user) {
        return { ok: false, message: "Credenciales inválidas." };
      }
      // Merge guest cart into user cart on login
      try {
        const guest = readJSON<CartItem[]>(CART_KEY, []);
        const userKey = `${CART_KEY}_${normalized}`;
        const existing = readJSON<CartItem[]>(userKey, []);
        const map = new Map<string, CartItem>();
        const push = (item: CartItem) => {
          const key = `${item.id}::${item.msg || ""}`;
          const prev = map.get(key);
          if (prev) map.set(key, { ...prev, qty: prev.qty + item.qty });
          else map.set(key, { ...item });
        };
        existing.forEach(push);
        guest.forEach(push);
        const merged = Array.from(map.values());
        writeJSON(userKey, merged);
        // remove guest cart to avoid duplicates
        removeKey(CART_KEY);
        setCart(merged);
      } catch (err) {
        // ignore merge errors
        console.warn("Cart merge failed:", err);
      }

      setCustomerSession({
        email: user.email,
        nombre: user.nombre,
        fnac: user.fnac,
        promoCode: user.promoCode,
        felices50: user.felices50,
        bdayRedeemedYear: user.bdayRedeemedYear,
        prefs: user.prefs
      });
      return { ok: true };
    },
    [customers]
  );

  const logoutCustomer = useCallback(() => {
    setCustomerSession(null);
  }, []);

  const updateCustomer = useCallback(
    (updates: Partial<CustomerUser>) => {
      if (!customerSession) return;
      setCustomers((prev) => {
        const idx = prev.findIndex((u) => u.email.toLowerCase() === customerSession.email.toLowerCase());
        if (idx === -1) return prev;
        // Prevent enabling FELICES50 via profile edit: only preserve existing felices50
        const safeUpdates = { ...updates } as Partial<CustomerUser>;
        if (typeof safeUpdates.promoCode === "string" && safeUpdates.promoCode.toUpperCase() === FELICES_CODE && !prev[idx].felices50) {
          // ignore attempt to set FELICES50 on edit
          delete (safeUpdates as any).promoCode;
        }
        const merged: CustomerUser = { ...prev[idx], ...safeUpdates };
        // ensure felices50 flag isn't accidentally enabled
        merged.felices50 = !!prev[idx].felices50;
        const next = [...prev];
        next[idx] = merged;
        setCustomerSession({
          email: merged.email,
          nombre: merged.nombre,
          fnac: merged.fnac,
          promoCode: merged.promoCode,
          felices50: merged.felices50,
          bdayRedeemedYear: merged.bdayRedeemedYear,
          prefs: merged.prefs
        });
        return next;
      });
    },
    [customerSession]
  );

  // Admin helpers to manage customers (edit/delete from admin)
  const upsertCustomer = useCallback((user: CustomerUser) => {
    setCustomers((prev) => {
      const idx = prev.findIndex((u) => u.email.toLowerCase() === user.email.toLowerCase());
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...user };
        return next;
      }
      return [...prev, user];
    });
  }, []);

  const removeCustomer = useCallback((email: string) => {
    setCustomers((prev) => prev.filter((u) => u.email.toLowerCase() !== email.toLowerCase()));
  }, []);

  const upsertAdminUser = useCallback(
    (user: AdminUser) => {
      setAdminUsers((prev) => {
        const idx = prev.findIndex((u) => u.run.toUpperCase() === user.run.toUpperCase());
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...user };
          return next;
        }
        return [...prev, user];
      });
    },
    []
  );

  const removeAdminUser = useCallback(
    (run: string) => {
      setAdminUsers((prev) => prev.filter((u) => u.run.toUpperCase() !== run.toUpperCase()));
    },
    []
  );

  const adminLogin = useCallback<ContextValue["adminLogin"]>(
    (email, _password) => {
      const normalized = email.trim().toLowerCase();
      const user = adminUsers.find((u) => (u.correo || "").toLowerCase() === normalized);
      if (!user) {
        return { ok: false, message: "Usuario no encontrado." };
      }
      const session: AdminSession = {
        correo: user.correo,
        nombre: user.nombre,
        rol: user.rol
      };
      setAdminSession(session);
      return { ok: true };
    },
    [adminUsers]
  );

  const adminLogout = useCallback(() => setAdminSession(null), []);

  const updateOrders = useCallback((nextOrders: Order[]) => {
    setOrders(nextOrders);
  }, []);

  const addComment = useCallback<ContextValue["addComment"]>(
    (postId, text) => {
      const session = customerSession;
      if (!session) {
        return { ok: false, message: "Debes iniciar sesión para comentar." };
      }
      const body = text.trim();
      if (!body) {
        return { ok: false, message: "Escribe algo." };
      }
      if (body.length > 300) {
        return { ok: false, message: "Máximo 300 caracteres." };
      }
      const ownerId = session.email.toLowerCase();
      const comment: BlogComment = {
        id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        ownerId,
        authorEmail: ownerId,
        authorName: session.nombre?.trim() || session.email.split("@")[0],
        text: body,
        ts: Date.now(),
        editedAt: null
      };
      setComments((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), comment]
      }));
      return { ok: true };
    },
    [customerSession]
  );

  const editComment = useCallback(
    (postId: string, id: string, text: string) => {
      const session = customerSession;
      if (!session) return;
      const normalized = session.email.toLowerCase();
      setComments((prev) => {
        const list = prev[postId] || [];
        const updated = list.map((comment) =>
          comment.id === id && comment.ownerId === normalized
            ? { ...comment, text: text.trim(), editedAt: Date.now() }
            : comment
        );
        return { ...prev, [postId]: updated };
      });
    },
    [customerSession]
  );

  const deleteComment = useCallback(
    (postId: string, id: string) => {
      const session = customerSession;
      if (!session) return;
      const normalized = session.email.toLowerCase();
      setComments((prev) => {
        const list = prev[postId] || [];
        const filtered = list.filter((comment) => !(comment.id === id && comment.ownerId === normalized));
        return { ...prev, [postId]: filtered };
      });
    },
    [customerSession]
  );

  const openReceiptWindow = useCallback<ContextValue["openReceiptWindow"]>(
    ({ items, subTotal, benefits, coupon, shipCost, total, contactEmail }) => {
      const normalizedEmail =
        typeof contactEmail === "string" && contactEmail.trim()
          ? contactEmail.trim()
          : customerSession?.email || null;
      const html = buildReceiptHTML({
        items: items.map((entry) => ({
          product: entry.product,
          qty: entry.qty,
          msg: entry.msg,
          subtotal: entry.subtotal
        })),
        subTotal,
        benefits,
        coupon,
        shipCost,
        total,
        currentEmail: normalizedEmail
      });
      const win = window.open("", "_blank");
      if (!win) {
        window.alert("Permite las ventanas emergentes para ver el detalle.");
        return;
      }
      win.document.open();
      win.document.write(html);
      win.document.close();
    },
    [customerSession]
  );

  const value = useMemo<ContextValue>(
    () => ({
      products,
      refreshProducts,
      upsertProduct,
      removeProduct,
      cart,
      addToCart,
      setCartQty,
      removeFromCart,
      clearCart,
      cartTotals,
      shippingCost,
      setShippingCost,
      coupon,
      setCoupon,
      evaluateCoupon,
      benefitsForCart,
      customerSession,
      customers,
      registerCustomer,
      loginCustomer,
      logoutCustomer,
      updateCustomer,
  upsertCustomer,
  removeCustomer,
      adminUsers,
      upsertAdminUser,
      removeAdminUser,
      adminSession,
      adminLogin,
      adminLogout,
      orders,
      updateOrders,
      comments,
      addComment,
      editComment,
      deleteComment,
      openReceiptWindow
    }),
    [
      products,
      refreshProducts,
      upsertProduct,
      removeProduct,
      cart,
      addToCart,
      setCartQty,
      removeFromCart,
      clearCart,
      cartTotals,
      shippingCost,
      setShippingCost,
      coupon,
      setCoupon,
      evaluateCoupon,
      benefitsForCart,
      customerSession,
      customers,
      registerCustomer,
      loginCustomer,
      logoutCustomer,
      updateCustomer,
  upsertCustomer,
  removeCustomer,
  upsertCustomer,
  removeCustomer,
      adminUsers,
      upsertAdminUser,
      removeAdminUser,
      adminSession,
      adminLogin,
      adminLogout,
      orders,
      updateOrders,
      comments,
      addComment,
      editComment,
      deleteComment,
      openReceiptWindow
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): ContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
