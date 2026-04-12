function getCartQuantitySum() {
    try {
        const cart = JSON.parse(localStorage.getItem("cart") || "[]");
        return cart.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);
    } catch {
        return 0;
    }
}

function updateCartCountDisplay() {
    const count = getCartQuantitySum();
    document.querySelectorAll(".cart-count").forEach((el) => {
        el.textContent = String(count);
    });
}
