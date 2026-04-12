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
    productGrid.innerHTML = "";

    products.forEach(product => {
        const card = document.createElement("div");
        card.classList.add("product-card");

        card.innerHTML = `
            <img src="${product.thumbnail}">
            <h3>${product.title}</h3>
            <p>$${product.price}</p>
            <button onclick="viewProduct(${product.id})">View</button>
        `;

        productGrid.appendChild(card);
    });
}

// Redirect to product page
function viewProduct(id) {
    window.location.href = `product.html?id=${id}`;
}

// Run fetch
fetchProducts();

if (typeof updateCartCountDisplay === "function") {
    updateCartCountDisplay();
}