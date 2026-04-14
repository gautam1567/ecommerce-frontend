(function () {
    "use strict";

    function mount() {
        const auth = window.__appFirebaseAuth;
        const guest = document.getElementById("authNavGuest");
        const userBlock = document.getElementById("authNavUser");
        const nameEl = document.getElementById("authNavName");
        const logoutBtn = document.getElementById("authLogoutBtn");

        if (!guest || !userBlock) {
            return;
        }

        if (!auth) {
            guest.hidden = false;
            userBlock.hidden = true;
            return;
        }

        const path = (window.location.pathname || "").toLowerCase();
        const isLoginPage = path.endsWith("login.html");
        const isSignupPage = path.endsWith("signup.html");
        const authRequired = document.body && document.body.dataset.authRequired === "true";

        auth.onAuthStateChanged((user) => {
            if (user && (isLoginPage || isSignupPage)) {
                const target = window.__getPostAuthRedirect
                    ? window.__getPostAuthRedirect()
                    : "index.html";
                window.location.replace(target);
                return;
            }

            if (authRequired && !user) {
                const file =
                    window.location.pathname.split("/").pop() || "index.html";
                window.location.replace(
                    "login.html?return=" + encodeURIComponent(file)
                );
                return;
            }

            if (user) {
                guest.hidden = true;
                userBlock.hidden = false;
                if (nameEl) {
                    nameEl.textContent =
                        user.displayName || user.email || "Account";
                }
            } else {
                guest.hidden = false;
                userBlock.hidden = true;
            }
        });

        if (logoutBtn) {
            logoutBtn.addEventListener("click", () => {
                auth
                    .signOut()
                    .then(() => {
                        window.location.href = "login.html";
                    })
                    .catch((err) => {
                        console.error(err);
                    });
            });
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", mount);
    } else {
        mount();
    }
})();
