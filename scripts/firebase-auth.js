(function () {
    "use strict";

    function isFirebaseConfigReady() {
        if (typeof firebaseConfig === "undefined" || !firebaseConfig || !firebaseConfig.apiKey) {
            return false;
        }
        const key = String(firebaseConfig.apiKey);
        if (key.includes("YOUR_API_KEY") || key.length < 10) {
            return false;
        }
        return true;
    }

    function mapFirebaseAuthError(err) {
        const code = err && err.code ? err.code : "";
        const messages = {
            "auth/email-already-in-use":
                "This email is already registered. Try logging in instead.",
            "auth/invalid-email": "That email address is not valid.",
            "auth/operation-not-allowed":
                "Email/password sign-in is disabled in Firebase. Enable it in the console.",
            "auth/weak-password":
                "Password is too weak. Use at least 6 characters (this app also requires 8+ with upper, lower, and a number).",
            "auth/user-disabled": "This account has been disabled.",
            "auth/user-not-found": "No account found for this email.",
            "auth/wrong-password": "Incorrect password.",
            "auth/invalid-credential": "Invalid email or password.",
            "auth/invalid-login-credentials": "Invalid email or password.",
            "auth/too-many-requests": "Too many attempts. Wait a few minutes and try again.",
            "auth/network-request-failed": "Network error. Check your connection.",
            "auth/missing-password": "Enter your password.",
            "auth/internal-error": "Something went wrong. Try again later."
        };
        return (
            messages[code] ||
            (err && err.message) ||
            "Something went wrong. Please try again."
        );
    }

    window.mapFirebaseAuthError = mapFirebaseAuthError;

    window.__getPostAuthRedirect = function () {
        const r = new URLSearchParams(window.location.search).get("return");
        if (!r || r.includes("..") || r.includes("://") || r.includes("\\")) {
            return "index.html";
        }
        return r;
    };

    window.__appFirebaseAuth = null;
    window.__firebaseReady = false;

    if (typeof firebase === "undefined") {
        return;
    }

    try {
        if (!isFirebaseConfigReady()) {
            return;
        }
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        const auth = firebase.auth();
        auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        window.__appFirebaseAuth = auth;
        window.__firebaseReady = true;
    } catch (e) {
        console.error("Firebase initialization failed:", e);
    }
})();
