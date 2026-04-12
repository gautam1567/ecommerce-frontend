const productDetail = document.getElementById("productDetail");

const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

const COLOR_NAMES = ["Graphite", "Ocean", "Sand", "Rose", "Slate"];
const SIZE_OPTIONS = [
    { id: "S", label: "S", multiplier: 0.92 },
    { id: "M", label: "M", multiplier: 1 },
    { id: "L", label: "L", multiplier: 1.08 },
    { id: "XL", label: "XL", multiplier: 1.15 }
];

let quantity = 1;
let currentProduct = null;
let colorVariants = [];
let selectedColorIndex = 0;
let selectedSizeId = "M";
let sizeAvailability = {};
let maxQuantity = 99;

function escapeHtml(text) {
    if (text == null) return "";
    const div = document.createElement("div");
    div.textContent = String(text);
    return div.innerHTML;
}

function showProductError(message) {
    if (productDetail) {
        productDetail.innerHTML = `<p class="product-error">${escapeHtml(message)}</p>`;
    }
}

function buildColorVariants(product) {
    const urls = Array.isArray(product.images) && product.images.length
        ? [...product.images]
        : [product.thumbnail];
    const unique = [...new Set(urls.filter(Boolean))];
    return unique.slice(0, 4).map((url, i) => ({
        url,
        label: COLOR_NAMES[i % COLOR_NAMES.length]
    }));
}

function computeSizeAvailability(stock) {
    const s = Number(stock) || 0;
    const avail = {};
    SIZE_OPTIONS.forEach((opt) => {
        if (s <= 0) {
            avail[opt.id] = false;
        } else if (opt.id === "XL") {
            avail[opt.id] = s > 15;
        } else if (opt.id === "L") {
            avail[opt.id] = s > 5;
        } else {
            avail[opt.id] = true;
        }
    });
    return avail;
}

function pickDefaultSize(avail) {
    const firstOk = SIZE_OPTIONS.find((o) => avail[o.id]);
    return firstOk ? firstOk.id : SIZE_OPTIONS[0].id;
}

function getSizeMultiplier() {
    const opt = SIZE_OPTIONS.find((o) => o.id === selectedSizeId);
    return opt ? opt.multiplier : 1;
}

function getUnitPrice() {
    if (!currentProduct) return 0;
    const base = Number(currentProduct.price) || 0;
    return base * getSizeMultiplier();
}

function getSelectedImageUrl() {
    const v = colorVariants[selectedColorIndex];
    return v ? v.url : currentProduct?.thumbnail || "";
}

function updatePriceDisplay() {
    const unit = getUnitPrice();
    const total = maxQuantity <= 0 ? 0 : unit * quantity;

    const priceEl = document.getElementById("unitPrice");
    const totalEl = document.getElementById("lineTotal");
    const qtyEl = document.getElementById("qtyDisplay");
    const minusBtn = document.getElementById("qtyMinus");
    const plusBtn = document.getElementById("qtyPlus");

    if (priceEl) priceEl.textContent = unit.toFixed(2);
    if (totalEl) totalEl.textContent = total.toFixed(2);
    if (qtyEl) qtyEl.textContent = maxQuantity <= 0 ? "—" : String(quantity);
    if (minusBtn) minusBtn.disabled = maxQuantity <= 0 || quantity <= 1;
    if (plusBtn) plusBtn.disabled = maxQuantity <= 0 || quantity >= maxQuantity;
}

function setupImageZoom(viewport, img) {
    if (!viewport || !img) return;

    const scale = 2.25;
    const canFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    function setOrigin(clientX, clientY) {
        const rect = viewport.getBoundingClientRect();
        const x = ((clientX - rect.left) / rect.width) * 100;
        const y = ((clientY - rect.top) / rect.height) * 100;
        const clamp = (n) => Math.max(0, Math.min(100, n));
        img.style.transformOrigin = `${clamp(x)}% ${clamp(y)}%`;
    }

    function applyZoom(on) {
        viewport.classList.toggle("is-zoomed", on);
        img.style.transform = on ? `scale(${scale})` : "scale(1)";
        if (!on) img.style.transformOrigin = "50% 50%";
    }

    if (canFinePointer) {
        viewport.addEventListener("pointerenter", () => applyZoom(true));
        viewport.addEventListener("pointerleave", () => applyZoom(false));
        viewport.addEventListener("pointermove", (e) => {
            if (!viewport.classList.contains("is-zoomed")) return;
            setOrigin(e.clientX, e.clientY);
        });
    } else {
        let locked = false;
        viewport.setAttribute("tabindex", "0");
        viewport.addEventListener("click", () => {
            locked = !locked;
            applyZoom(locked);
            viewport.classList.toggle("is-zoom-locked", locked);
        });
        viewport.addEventListener("pointermove", (e) => {
            if (!locked) return;
            setOrigin(e.clientX, e.clientY);
        });
    }
}

function wireDetailInteractions() {
    const viewport = document.getElementById("imageZoomViewport");
    const mainImage = document.getElementById("mainImage");
    setupImageZoom(viewport, mainImage);

    document.querySelectorAll("[data-size]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-size");
            if (!sizeAvailability[id]) return;
            selectedSizeId = id;
            document.querySelectorAll("[data-size]").forEach((b) => {
                b.classList.toggle("is-selected", b.getAttribute("data-size") === id);
            });
            updatePriceDisplay();
        });
    });

    document.querySelectorAll("[data-color-index]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const idx = Number(btn.getAttribute("data-color-index"));
            if (Number.isNaN(idx) || idx < 0 || idx >= colorVariants.length) return;
            selectedColorIndex = idx;
            document.querySelectorAll("[data-color-index]").forEach((b) => {
                b.classList.toggle(
                    "is-selected",
                    Number(b.getAttribute("data-color-index")) === idx
                );
            });
            if (mainImage) {
                mainImage.src = colorVariants[idx].url;
                mainImage.alt = `${currentProduct.title} — ${colorVariants[idx].label}`;
            }
        });
    });

    const minusBtn = document.getElementById("qtyMinus");
    const plusBtn = document.getElementById("qtyPlus");
    if (minusBtn) {
        minusBtn.addEventListener("click", () => {
            if (quantity > 1) {
                quantity--;
                updatePriceDisplay();
            }
        });
    }
    if (plusBtn) {
        plusBtn.addEventListener("click", () => {
            if (quantity < maxQuantity) {
                quantity++;
                updatePriceDisplay();
            }
        });
    }

    const addBtn = document.getElementById("addToCartBtn");
    if (addBtn) {
        addBtn.addEventListener("click", addToCart);
    }
}

function displayProduct(product) {
    colorVariants = buildColorVariants(product);
    selectedColorIndex = 0;
    sizeAvailability = computeSizeAvailability(product.stock);
    selectedSizeId = pickDefaultSize(sizeAvailability);
    quantity = 1;
    const stockNum = Number(product.stock) || 0;
    maxQuantity = stockNum <= 0 ? 0 : Math.min(99, stockNum);
    quantity = 1;

    const sizeButtonsHtml = SIZE_OPTIONS.map((opt) => {
        const ok = sizeAvailability[opt.id];
        const selected = opt.id === selectedSizeId;
        return `
            <button type="button"
                class="variation-btn size-btn${selected ? " is-selected" : ""}${ok ? "" : " is-disabled"}"
                data-size="${opt.id}"
                ${ok ? "" : "disabled"}>
                ${escapeHtml(opt.label)}
            </button>`;
    }).join("");

    const swatchesHtml = colorVariants
        .map(
            (v, i) => `
        <button type="button"
            class="swatch${i === 0 ? " is-selected" : ""}"
            data-color-index="${i}"
            title="${escapeHtml(v.label)}"
            aria-label="${escapeHtml(v.label)}">
            <img src="${escapeHtml(v.url)}" alt="" draggable="false">
        </button>`
        )
        .join("");

    const mainSrc = escapeHtml(colorVariants[0]?.url || product.thumbnail);
    const title = escapeHtml(product.title);
    const desc = escapeHtml(product.description);
    const stockNote =
        Number(product.stock) > 0
            ? `<p class="stock-note">${escapeHtml(String(product.stock))} in stock</p>`
            : `<p class="stock-note stock-note--out">Out of stock</p>`;

    productDetail.innerHTML = `
        <div class="detail-container">
            <div class="detail-media">
                <p class="zoom-hint" aria-hidden="true"></p>
                <div class="image-zoom-viewport" id="imageZoomViewport">
                    <img id="mainImage" src="${mainSrc}" alt="${title}" draggable="false">
                </div>
                <div class="variation-group variation-group--swatches">
                    <span class="variation-label">Color</span>
                    <div class="swatch-row" role="group" aria-label="Color">${swatchesHtml}</div>
                </div>
            </div>

            <div class="detail-info">
                <h2>${title}</h2>
                <p class="price">$<span id="unitPrice">${getUnitPrice().toFixed(2)}</span> <span class="price-each">each</span></p>
                ${stockNote}
                <p class="detail-desc">${desc}</p>

                <div class="variation-group">
                    <span class="variation-label">Size</span>
                    <div class="size-row" role="group" aria-label="Size">${sizeButtonsHtml}</div>
                </div>

                <div class="quantity quantity--modern">
                    <span class="variation-label">Quantity</span>
                    <div class="quantity-controls">
                        <button type="button" class="qty-btn" id="qtyMinus" aria-label="Decrease quantity">−</button>
                        <span class="qty-value" id="qtyDisplay">1</span>
                        <button type="button" class="qty-btn" id="qtyPlus" aria-label="Increase quantity">+</button>
                    </div>
                </div>

                <p class="line-total">Total: $<span id="lineTotal">${getUnitPrice().toFixed(2)}</span></p>

                <button type="button" class="add-to-cart-btn" id="addToCartBtn" ${stockNum <= 0 ? "disabled" : ""}>Add to Cart</button>
            </div>
        </div>
        <div class="cart-toast" id="cartToast" role="status" aria-live="polite"></div>
    `;

    const hint = productDetail.querySelector(".zoom-hint");
    if (hint) {
        hint.textContent = window.matchMedia("(hover: hover) and (pointer: fine)").matches
            ? "Hover to zoom"
            : "Tap image to zoom · drag to pan focal point";
    }

    wireDetailInteractions();
    updatePriceDisplay();

    if (typeof updateCartCountDisplay === "function") {
        updateCartCountDisplay();
    }
}

async function fetchProduct() {
    if (!productDetail) return;

    if (!productId) {
        showProductError("No product selected. Go back to the shop and choose a product.");
        return;
    }

    try {
        const res = await fetch(`https://dummyjson.com/products/${productId}`);
        if (!res.ok) {
            showProductError("Product not found.");
            return;
        }
        const product = await res.json();

        if (product.message) {
            showProductError("Product not found.");
            return;
        }

        currentProduct = product;

        displayProduct(product);
    } catch (error) {
        showProductError("Error loading product");
    }
}

function showCartToast(message) {
    const toast = document.getElementById("cartToast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(showCartToast._t);
    showCartToast._t = window.setTimeout(() => {
        toast.classList.remove("is-visible");
    }, 2600);
}

function addToCart() {
    if (!currentProduct || maxQuantity <= 0 || quantity < 1) return;

    const addBtn = document.getElementById("addToCartBtn");
    const sizeLabel = SIZE_OPTIONS.find((o) => o.id === selectedSizeId)?.label || selectedSizeId;
    const colorLabel = colorVariants[selectedColorIndex]?.label || "Default";

    const line = {
        id: currentProduct.id,
        title: currentProduct.title,
        price: getUnitPrice(),
        image: getSelectedImageUrl(),
        quantity,
        size: sizeLabel,
        color: colorLabel,
        variantKey: `${currentProduct.id}-${selectedSizeId}-${selectedColorIndex}`
    };

    let cart = [];
    try {
        cart = JSON.parse(localStorage.getItem("cart") || "[]");
    } catch {
        cart = [];
    }

    cart.push(line);
    localStorage.setItem("cart", JSON.stringify(cart));

    if (typeof updateCartCountDisplay === "function") {
        updateCartCountDisplay();
    }

    const cartIcon = document.querySelector(".header .cart");
    if (cartIcon) {
        cartIcon.classList.remove("cart--bump");
        void cartIcon.offsetWidth;
        cartIcon.classList.add("cart--bump");
    }

    if (addBtn) {
        addBtn.classList.add("is-success");
        window.setTimeout(() => addBtn.classList.remove("is-success"), 700);
    }

    showCartToast(`Added ${quantity} × ${currentProduct.title} (${colorLabel}, ${sizeLabel})`);
}

fetchProduct();
