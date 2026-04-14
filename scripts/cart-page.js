const cartItemsEl = document.getElementById("cartItems");
const cartPageEmpty = document.getElementById("cartPageEmpty");
const cartPageContent = document.getElementById("cartPageContent");
const cartSubtotalEl = document.getElementById("cartSubtotal");
const cartSummaryItemCountEl = document.getElementById("cartSummaryItemCount");
const checkoutBtn = document.getElementById("checkoutBtn");

function getLineMax(line) {
    if (line.maxQty != null && Number.isFinite(Number(line.maxQty))) {
        return Math.floor(Number(line.maxQty));
    }
    return 99;
}

function renderCartPage() {
    if (!cartItemsEl || !cartPageEmpty || !cartPageContent) return;

    const cart = typeof getCart === "function" ? getCart() : [];

    if (cart.length === 0) {
        cartPageEmpty.hidden = false;
        cartPageContent.hidden = true;
        cartItemsEl.replaceChildren();
        if (checkoutBtn) {
            checkoutBtn.disabled = true;
        }
        if (cartSubtotalEl) cartSubtotalEl.textContent = "$0.00";
        if (cartSummaryItemCountEl) cartSummaryItemCountEl.textContent = "0";
        return;
    }

    cartPageEmpty.hidden = true;
    cartPageContent.hidden = false;

    cartItemsEl.replaceChildren();

    let subtotal = 0;
    let itemCount = 0;

    cart.forEach((line) => {
        const key = lineKey(line);
        const unit = Number(line.price) || 0;
        const q = line.quantity;
        const lineTotal = unit * q;
        subtotal += lineTotal;
        itemCount += q;

        const max = getLineMax(line);
        const metaParts = [];
        if (line.color) metaParts.push(line.color);
        if (line.size) metaParts.push(`Size ${line.size}`);

        const article = document.createElement("article");
        article.className = "cart-row";
        article.setAttribute("data-key", key);

        const img = document.createElement("img");
        img.className = "cart-row__img";
        img.src = line.image || "";
        img.alt = line.title || "Product";
        img.draggable = false;
        img.loading = "lazy";
        img.decoding = "async";
        img.sizes = "(max-width: 900px) 88px, 100px";
        img.width = 100;
        img.height = 100;

        const main = document.createElement("div");
        main.className = "cart-row__main";

        const title = document.createElement("h3");
        title.className = "cart-row__title";
        title.textContent = line.title || "";

        const meta = document.createElement("p");
        meta.className = "cart-row__meta";
        meta.textContent = metaParts.length ? metaParts.join(" · ") : "Standard";

        const unitP = document.createElement("p");
        unitP.className = "cart-row__unit";
        unitP.textContent = `$${unit.toFixed(2)} each`;

        main.append(title, meta, unitP);

        const qtyWrap = document.createElement("div");
        qtyWrap.className = "cart-row__qty";

        const decBtn = document.createElement("button");
        decBtn.type = "button";
        decBtn.className = "cart-row__qty-btn";
        decBtn.setAttribute("data-act", "dec");
        decBtn.setAttribute("aria-label", "Decrease quantity");
        decBtn.textContent = "−";
        decBtn.disabled = q <= 1;

        const qtySpan = document.createElement("span");
        qtySpan.className = "cart-row__qty-value";
        qtySpan.textContent = String(q);

        const incBtn = document.createElement("button");
        incBtn.type = "button";
        incBtn.className = "cart-row__qty-btn";
        incBtn.setAttribute("data-act", "inc");
        incBtn.setAttribute("aria-label", "Increase quantity");
        incBtn.textContent = "+";
        incBtn.disabled = q >= max;

        qtyWrap.append(decBtn, qtySpan, incBtn);

        const lineTotalEl = document.createElement("p");
        lineTotalEl.className = "cart-row__line-total";
        lineTotalEl.textContent = `$${lineTotal.toFixed(2)}`;

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "cart-row__remove";
        removeBtn.setAttribute("data-act", "remove");
        removeBtn.textContent = "Remove";

        article.append(img, main, qtyWrap, lineTotalEl, removeBtn);
        cartItemsEl.appendChild(article);
    });

    if (cartSubtotalEl) cartSubtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    if (cartSummaryItemCountEl) cartSummaryItemCountEl.textContent = String(itemCount);
    if (checkoutBtn) checkoutBtn.disabled = false;
}

if (cartItemsEl) {
    cartItemsEl.addEventListener("click", (e) => {
        const row = e.target.closest(".cart-row");
        if (!row) return;
        const key = row.getAttribute("data-key");
        if (!key) return;

        const btn = e.target.closest("button[data-act]");
        if (!btn) return;
        const act = btn.getAttribute("data-act");

        if (act === "inc" && typeof changeCartLineQuantity === "function") {
            changeCartLineQuantity(key, 1);
        } else if (act === "dec" && typeof changeCartLineQuantity === "function") {
            changeCartLineQuantity(key, -1);
        } else if (act === "remove" && typeof removeCartLine === "function") {
            removeCartLine(key);
        }

        renderCartPage();
    });
}

if (checkoutBtn) {
    checkoutBtn.addEventListener("click", () => {
        if (checkoutBtn.disabled) return;
        window.location.href = "checkout.html";
    });
}

window.addEventListener("storage", (e) => {
    if (e.key === "cart") renderCartPage();
});

renderCartPage();
