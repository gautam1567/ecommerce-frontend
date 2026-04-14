(function () {
    "use strict";

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function setFieldError(input, errorEl, message) {
        if (!input || !errorEl) return;
        const hasError = Boolean(message);
        input.setAttribute("aria-invalid", hasError ? "true" : "false");
        if (hasError) {
            errorEl.textContent = message;
            errorEl.hidden = false;
        } else {
            errorEl.textContent = "";
            errorEl.hidden = true;
        }
    }

    function isValidEmail(value) {
        const v = String(value || "").trim();
        return v.length > 0 && EMAIL_RE.test(v);
    }

    function passwordPolicyCheck(password) {
        const pw = String(password || "");
        const errors = [];
        if (pw.length < 8) errors.push("Use at least 8 characters.");
        if (!/[a-z]/.test(pw)) errors.push("Include a lowercase letter.");
        if (!/[A-Z]/.test(pw)) errors.push("Include an uppercase letter.");
        if (!/[0-9]/.test(pw)) errors.push("Include a number.");
        return { ok: errors.length === 0, errors };
    }

    /** @returns {"weak"|"medium"|"strong"} */
    function passwordStrength(password) {
        const pw = String(password || "");
        if (pw.length === 0) return "weak";
        const { ok } = passwordPolicyCheck(pw);
        if (ok) return "strong";
        if (pw.length >= 8) return "medium";
        return "weak";
    }

    function bindPasswordToggle(button, input) {
        if (!button || !input) return;
        button.addEventListener("click", () => {
            const show = input.type === "password";
            input.type = show ? "text" : "password";
            button.setAttribute("aria-pressed", show ? "true" : "false");
            button.setAttribute("aria-label", show ? "Hide password" : "Show password");
            button.textContent = show ? "Hide" : "Show";
        });
    }

    function setSubmitLoading(button, loading) {
        if (!button) return;
        if (!button.dataset.idleLabel) {
            button.dataset.idleLabel = button.textContent.trim();
        }
        button.disabled = loading;
        button.setAttribute("aria-busy", loading ? "true" : "false");
        button.textContent = loading ? "Please wait…" : button.dataset.idleLabel;
    }

    function applyFirebaseLoginError(err, emailIn, passIn, emailErr, passErr) {
        const msg =
            typeof window.mapFirebaseAuthError === "function"
                ? window.mapFirebaseAuthError(err)
                : err.message || "Sign-in failed.";
        const code = err && err.code ? err.code : "";
        setFieldError(emailIn, emailErr, "");
        setFieldError(passIn, passErr, "");
        if (code === "auth/user-not-found") {
            setFieldError(emailIn, emailErr, "No account found for this email.");
        } else if (code === "auth/invalid-email") {
            setFieldError(emailIn, emailErr, msg);
        } else {
            setFieldError(passIn, passErr, msg);
        }
    }

    /* ---------- Login ---------- */
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        const emailIn = document.getElementById("loginEmail");
        const passIn = document.getElementById("loginPassword");
        const emailErr = document.getElementById("loginEmailError");
        const passErr = document.getElementById("loginPasswordError");
        const successEl = document.getElementById("loginSuccess");
        const toggle = document.getElementById("loginPwToggle");
        const submitBtn = document.getElementById("loginSubmitBtn");

        bindPasswordToggle(toggle, passIn);

        function validateLoginEmail() {
            const v = emailIn.value.trim();
            if (!v) {
                setFieldError(emailIn, emailErr, "Enter your email address.");
                return false;
            }
            if (!isValidEmail(v)) {
                setFieldError(emailIn, emailErr, "Enter a valid email address.");
                return false;
            }
            setFieldError(emailIn, emailErr, "");
            return true;
        }

        function validateLoginPassword() {
            const v = passIn.value;
            if (!v) {
                setFieldError(passIn, passErr, "Enter your password.");
                return false;
            }
            setFieldError(passIn, passErr, "");
            return true;
        }

        emailIn.addEventListener("blur", validateLoginEmail);
        emailIn.addEventListener("input", () => {
            if (!emailErr.hidden) validateLoginEmail();
        });

        passIn.addEventListener("blur", validateLoginPassword);
        passIn.addEventListener("input", () => {
            if (!passErr.hidden) validateLoginPassword();
        });

        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            if (successEl) successEl.hidden = true;

            const okE = validateLoginEmail();
            const okP = validateLoginPassword();
            if (!okE || !okP) return;

            const auth = window.__appFirebaseAuth;
            if (auth) {
                setSubmitLoading(submitBtn, true);
                const email = emailIn.value.trim();
                const password = passIn.value;
                auth
                    .signInWithEmailAndPassword(email, password)
                    .then(() => {
                        const target = window.__getPostAuthRedirect
                            ? window.__getPostAuthRedirect()
                            : "index.html";
                        window.location.href = target;
                    })
                    .catch((err) => {
                        applyFirebaseLoginError(
                            err,
                            emailIn,
                            passIn,
                            emailErr,
                            passErr
                        );
                    })
                    .finally(() => {
                        setSubmitLoading(submitBtn, false);
                    });
                return;
            }

            if (successEl) {
                successEl.textContent =
                    "Add your Firebase config in scripts/firebase-config.js to sign in with Firebase.";
                successEl.hidden = false;
            }
        });
    }

    /* ---------- Signup ---------- */
    const signupForm = document.getElementById("signupForm");
    if (signupForm) {
        const nameIn = document.getElementById("signupName");
        const emailIn = document.getElementById("signupEmail");
        const passIn = document.getElementById("signupPassword");
        const confirmIn = document.getElementById("signupConfirm");
        const nameErr = document.getElementById("signupNameError");
        const emailErr = document.getElementById("signupEmailError");
        const passErr = document.getElementById("signupPasswordError");
        const confirmErr = document.getElementById("signupConfirmError");
        const successEl = document.getElementById("signupSuccess");
        const strengthText = document.getElementById("signupStrengthText");
        const strengthBars = signupForm.querySelector(".auth-strength__bars");
        const submitBtn = document.getElementById("signupSubmitBtn");

        bindPasswordToggle(document.getElementById("signupPwToggle"), passIn);
        bindPasswordToggle(document.getElementById("signupConfirmToggle"), confirmIn);

        function updateStrengthUI() {
            const level = passwordStrength(passIn.value);
            if (strengthText) {
                const labels = { weak: "Weak", medium: "Medium", strong: "Strong" };
                strengthText.textContent = passIn.value ? labels[level] : "—";
            }
            if (strengthBars) {
                strengthBars.classList.remove(
                    "auth-strength__bars--weak",
                    "auth-strength__bars--medium",
                    "auth-strength__bars--strong"
                );
                if (passIn.value) {
                    strengthBars.classList.add(`auth-strength__bars--${level}`);
                }
            }
        }

        function validateName() {
            const v = nameIn.value.trim();
            if (v.length < 2) {
                setFieldError(nameIn, nameErr, "Enter your full name (at least 2 characters).");
                return false;
            }
            setFieldError(nameIn, nameErr, "");
            return true;
        }

        function validateSignupEmail() {
            const v = emailIn.value.trim();
            if (!v) {
                setFieldError(emailIn, emailErr, "Enter your email address.");
                return false;
            }
            if (!isValidEmail(v)) {
                setFieldError(emailIn, emailErr, "Enter a valid email address.");
                return false;
            }
            setFieldError(emailIn, emailErr, "");
            return true;
        }

        function validateSignupPassword() {
            const { ok, errors } = passwordPolicyCheck(passIn.value);
            if (!ok) {
                setFieldError(passIn, passErr, errors[0]);
                return false;
            }
            setFieldError(passIn, passErr, "");
            return true;
        }

        function validateConfirm() {
            const p = passIn.value;
            const c = confirmIn.value;
            if (!c) {
                setFieldError(confirmIn, confirmErr, "Confirm your password.");
                return false;
            }
            if (p !== c) {
                setFieldError(confirmIn, confirmErr, "Passwords do not match.");
                return false;
            }
            setFieldError(confirmIn, confirmErr, "");
            return true;
        }

        nameIn.addEventListener("blur", validateName);
        nameIn.addEventListener("input", () => {
            if (!nameErr.hidden) validateName();
        });

        emailIn.addEventListener("blur", validateSignupEmail);
        emailIn.addEventListener("input", () => {
            if (!emailErr.hidden) validateSignupEmail();
        });

        passIn.addEventListener("input", () => {
            updateStrengthUI();
            if (!passErr.hidden) validateSignupPassword();
            if (!confirmErr.hidden || confirmIn.value) validateConfirm();
        });
        passIn.addEventListener("blur", validateSignupPassword);

        confirmIn.addEventListener("input", () => {
            if (!confirmErr.hidden || confirmIn.value) validateConfirm();
        });
        confirmIn.addEventListener("blur", validateConfirm);

        signupForm.addEventListener("submit", (e) => {
            e.preventDefault();
            if (successEl) successEl.hidden = true;

            updateStrengthUI();
            const okN = validateName();
            const okE = validateSignupEmail();
            const okP = validateSignupPassword();
            const okC = validateConfirm();
            if (!okN || !okE || !okP || !okC) return;

            const auth = window.__appFirebaseAuth;
            if (auth) {
                setSubmitLoading(submitBtn, true);
                const email = emailIn.value.trim();
                const password = passIn.value;
                const displayName = nameIn.value.trim();
                auth
                    .createUserWithEmailAndPassword(email, password)
                    .then((cred) => {
                        if (displayName && cred.user) {
                            return cred.user.updateProfile({ displayName: displayName });
                        }
                    })
                    .then(() => {
                        const target = window.__getPostAuthRedirect
                            ? window.__getPostAuthRedirect()
                            : "index.html";
                        window.location.href = target;
                    })
                    .catch((err) => {
                        const msg =
                            typeof window.mapFirebaseAuthError === "function"
                                ? window.mapFirebaseAuthError(err)
                                : err.message || "Sign-up failed.";
                        const code = err && err.code ? err.code : "";
                        if (
                            code === "auth/email-already-in-use" ||
                            code === "auth/invalid-email"
                        ) {
                            setFieldError(emailIn, emailErr, msg);
                            setFieldError(passIn, passErr, "");
                        } else if (code === "auth/weak-password") {
                            setFieldError(passIn, passErr, msg);
                        } else {
                            setFieldError(passIn, passErr, msg);
                        }
                    })
                    .finally(() => {
                        setSubmitLoading(submitBtn, false);
                    });
                return;
            }

            if (successEl) {
                successEl.textContent =
                    "Add your Firebase config in scripts/firebase-config.js to create an account with Firebase.";
                successEl.hidden = false;
            }
        });

        updateStrengthUI();
    }
})();
