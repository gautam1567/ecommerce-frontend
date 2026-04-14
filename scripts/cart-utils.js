const CART_STORAGE_KEY = "cart";

function lineKey(line) {
    if (!line) return "";
    if (line.variantKey) return String(line.variantKey);
    const id = line.id != null ? String(line.id) : "";
    const size = line.size != null ? String(line.size) : "";
    const color = line.color != null ? String(line.color) : "";
    return `${id}::${size}::${color}`;
}

function normalizeQuantity(q) {
    const n = Math.floor(Number(q));
    return Number.isFinite(n) && n > 0 ? n : 0;
}

function getCart() {
    try {
        const raw = localStorage.getItem(CART_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter((line) => line && line.id != null)
            .map((line) => {
                const mq = line.maxQty;
                const maxQty =
                    mq != null && Number.isFinite(Number(mq)) ? Math.floor(Number(mq)) : undefined;
                return {
                    id: line.id,
                    title: line.title,
                    price: Number(line.price) || 0,
                    image: line.image || "",
                    quantity: normalizeQuantity(line.quantity),
                    size: line.size,
                    color: line.color,
                    variantKey: line.variantKey,
                    maxQty
                };
            })
            .filter((line) => line.quantity > 0);
    } catch {
        return [];
    }
}

function saveCart(cart) {
    const clean = cart.filter((l) => l && normalizeQuantity(l.quantity) > 0);
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(clean));
    updateCartCountDisplay();
    refreshCartPanelIfOpen();
}

function getCartQuantitySum() {
    return getCart().reduce((sum, line) => sum + line.quantity, 0);
}

function updateCartCountDisplay() {
    const count = getCartQuantitySum();
    document.querySelectorAll(".cart-count").forEach((el) => {
        el.textContent = String(count);
    });
}

/**
 * Adds a line or merges quantity for the same variant (variantKey / id+size+color).
 * @param {object} line - product fields including quantity >= 1
 * @param {number} [maxTotalForVariant] - cap total units per variant (e.g. stock)
 * @returns {{ merged: boolean, newTotal: number, capped: boolean, added: number }}
 */
function addOrMergeCartLine(line, maxTotalForVariant) {
    const addQty = normalizeQuantity(line.quantity);
    if (addQty < 1) {
        return { merged: false, newTotal: 0, capped: false, added: 0 };
    }

    const cart = getCart();
    const key = lineKey(line);
    const idx = cart.findIndex((l) => lineKey(l) === key);

    const existingQty = idx >= 0 ? cart[idx].quantity : 0;
    const desiredTotal = existingQty + addQty;
    let finalTotal = desiredTotal;
    let capped = false;

    if (maxTotalForVariant != null && Number.isFinite(maxTotalForVariant)) {
        const cap = Math.floor(maxTotalForVariant);
        if (cap < 1) {
            return { merged: false, newTotal: existingQty, capped: true, added: 0 };
        }
        if (finalTotal > cap) {
            finalTotal = cap;
            capped = desiredTotal > cap;
        }
    }

    const added = finalTotal - existingQty;
    if (added < 1) {
        saveCart(cart);
        return { merged: idx >= 0, newTotal: existingQty, capped: true, added: 0 };
    }

    const existingLine = idx >= 0 ? cart[idx] : null;
    let lineMax = 99;
    if (maxTotalForVariant != null && Number.isFinite(maxTotalForVariant)) {
        lineMax = Math.floor(maxTotalForVariant);
    } else if (line.maxQty != null && Number.isFinite(Number(line.maxQty))) {
        lineMax = Math.floor(Number(line.maxQty));
    } else if (existingLine?.maxQty != null && Number.isFinite(Number(existingLine.maxQty))) {
        lineMax = Math.floor(Number(existingLine.maxQty));
    }

    const mergedLine = {
        ...(existingLine || {}),
        ...line,
        quantity: finalTotal,
        variantKey: line.variantKey || existingLine?.variantKey,
        maxQty: lineMax
    };

    if (idx >= 0) {
        cart[idx] = mergedLine;
    } else {
        cart.push(mergedLine);
    }

    saveCart(cart);
    return { merged: idx >= 0, newTotal: finalTotal, capped, added };
}

function removeCartLine(variantKey) {
    if (variantKey == null || variantKey === "") return;
    const cart = getCart().filter((l) => lineKey(l) !== String(variantKey));
    saveCart(cart);
}

/**
 * @param {string} variantKey
 * @param {number} delta - +1 or -1 from cart page controls
 */
function changeCartLineQuantity(variantKey, delta) {
    const d = Math.trunc(Number(delta));
    if (!Number.isFinite(d) || d === 0) return;

    const cart = getCart();
    const idx = cart.findIndex((l) => lineKey(l) === String(variantKey));
    if (idx < 0) return;

    const line = cart[idx];
    const next = line.quantity + d;
    if (next < 1) return;

    const max =
        line.maxQty != null && Number.isFinite(Number(line.maxQty))
            ? Math.floor(Number(line.maxQty))
            : 99;
    if (next > max) return;

    cart[idx] = { ...line, quantity: next };
    saveCart(cart);
}

function refreshCartPanelIfOpen() {
    const panel = document.getElementById("cartPanel");
    if (panel && panel.classList.contains("is-open")) {
        renderCartPanel();
    }
}

function ensureCartPanel() {
    if (document.getElementById("cartPanel")) return;

    const root = document.createElement("div");
    root.id = "cartPanel";
    root.className = "cart-panel";
    root.setAttribute("aria-hidden", "true");
    root.innerHTML = `
        <div class="cart-panel__backdrop" aria-hidden="true"></div>
        <aside class="cart-panel__aside">
            <div class="cart-panel__head">
                <h2 class="cart-panel__heading">Your cart</h2>
                <button type="button" class="cart-panel__close" aria-label="Close cart">×</button>
            </div>
            <ul class="cart-panel__list" id="cartPanelLines"></ul>
            <p class="cart-panel__empty" id="cartPanelEmpty" hidden>Your cart is empty.</p>
            <div class="cart-panel__footer">
                <a href="cart.html" class="cart-panel__full-cart">View full cart</a>
            </div>
        </aside>
    `;
    document.body.appendChild(root);
}

function renderCartPanel() {
    const list = document.getElementById("cartPanelLines");
    const empty = document.getElementById("cartPanelEmpty");
    if (!list || !empty) return;

    const cart = getCart();
    list.replaceChildren();

    if (cart.length === 0) {
        empty.hidden = false;
        return;
    }

    empty.hidden = true;

    cart.forEach((line) => {
        const key = lineKey(line);
        const li = document.createElement("li");
        li.className = "cart-panel__item";

        const thumb = document.createElement("img");
        thumb.className = "cart-panel__thumb";
        thumb.src = line.image || "";
        thumb.alt = line.title || "Product";
        thumb.draggable = false;
        thumb.loading = "lazy";
        thumb.decoding = "async";
        thumb.sizes = "72px";
        thumb.width = 72;
        thumb.height = 72;

        const body = document.createElement("div");
        body.className = "cart-panel__body";

        const titleEl = document.createElement("p");
        titleEl.className = "cart-panel__title";
        titleEl.textContent = line.title || "";

        const meta = document.createElement("p");
        meta.className = "cart-panel__meta";
        const parts = [];
        if (line.color) parts.push(line.color);
        if (line.size) parts.push(`Size ${line.size}`);
        meta.textContent = parts.length ? parts.join(" · ") : "Standard";

        const qtyRow = document.createElement("p");
        qtyRow.className = "cart-panel__qty";
        const unit = Number(line.price) || 0;
        const q = line.quantity;
        qtyRow.textContent = `${q} × $${unit.toFixed(2)} = $${(unit * q).toFixed(2)}`;

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "cart-panel__remove";
        removeBtn.textContent = "Remove";
        removeBtn.setAttribute("data-remove-variant", key);

        body.append(titleEl, meta, qtyRow, removeBtn);
        li.append(thumb, body);
        list.appendChild(li);
    });
}

function openCartPanel() {
    ensureCartPanel();
    renderCartPanel();
    const panel = document.getElementById("cartPanel");
    if (!panel) return;
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
}

function closeCartPanel() {
    const panel = document.getElementById("cartPanel");
    if (!panel) return;
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
}

function initCartUI() {
    ensureCartPanel();

    document.querySelectorAll(".cart").forEach((cartEl) => {
        cartEl.setAttribute("role", "button");
        cartEl.setAttribute("tabindex", "0");
        if (!cartEl.getAttribute("aria-label")) {
            cartEl.setAttribute("aria-label", "Open shopping cart");
        }
        cartEl.addEventListener("click", (e) => {
            e.preventDefault();
            openCartPanel();
        });
        cartEl.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openCartPanel();
            }
        });
    });

    const panel = document.getElementById("cartPanel");
    if (panel && !panel.dataset.cartUiBound) {
        panel.dataset.cartUiBound = "1";
        panel.addEventListener("click", (e) => {
            if (e.target.classList.contains("cart-panel__backdrop")) {
                closeCartPanel();
                return;
            }
            if (e.target.closest(".cart-panel__close")) {
                closeCartPanel();
                return;
            }
            const rm = e.target.closest("[data-remove-variant]");
            if (rm && panel.contains(rm)) {
                const key = rm.getAttribute("data-remove-variant");
                if (key) {
                    removeCartLine(key);
                    renderCartPanel();
                }
            }
        });
    }

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeCartPanel();
    });

    updateCartCountDisplay();
}

if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initCartUI);
    } else {
        initCartUI();
    }
}
