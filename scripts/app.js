// 🔹 Navbar (Hamburger Menu)
const hamburger = document.getElementById("hamburger");
const navMenu = document.getElementById("navMenu");

if (hamburger && navMenu) {
    hamburger.addEventListener("click", () => {
        navMenu.classList.toggle("active");
    });
}

const ctaShop = document.querySelector(".cta-btn");
const productsSection = document.getElementById("products");
if (ctaShop && productsSection) {
    ctaShop.addEventListener("click", () => {
        productsSection.scrollIntoView({ behavior: "smooth" });
    });
}

// 🔹 Product Grid
const productGrid = document.getElementById("productGrid");

// Fetch products
async function fetchProducts() {
    if (!productGrid) return; // prevent error on other pages

    try {
        const res = await fetch("https://dummyjson.com/products");
        const data = await res.json();

        displayProducts(data.products.slice(0, 12));

    } catch (error) {
        if (productGrid) {
            productGrid.innerHTML = "<p>Error loading products</p>";
        }
    }
}

// Display products
function displayProducts(products) {
    productGrid.replaceChildren();

    products.forEach((product) => {
        const card = document.createElement("div");
        card.classList.add("product-card");

        const img = document.createElement("img");
        img.src = product.thumbnail || "";
        img.alt = product.title || "";
        img.loading = "lazy";
        img.decoding = "async";
        img.sizes = "(max-width: 768px) 90vw, (max-width: 992px) 45vw, 22vw";
        img.width = 300;
        img.height = 200;

        const h3 = document.createElement("h3");
        h3.textContent = product.title || "";

        const price = document.createElement("p");
        price.textContent = `$${product.price}`;

        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = "View";
        btn.addEventListener("click", () => {
            window.location.href = `product.html?id=${product.id}`;
        });

        card.append(img, h3, price, btn);
        productGrid.appendChild(card);
    });
}

// Redirect to product page (kept for any legacy onclick references)
function viewProduct(id) {
    window.location.href = `product.html?id=${id}`;
}

// Run fetch
fetchProducts();

if (typeof updateCartCountDisplay === "function") {
    updateCartCountDisplay();
}