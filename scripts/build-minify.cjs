/**
 * Minifies styles/main.css → main.min.css and selected scripts/*.min.js
 * Run: npm run build
 */
const fs = require("fs");
const path = require("path");
const { minify } = require("terser");
const CleanCSS = require("clean-css");

const root = path.join(__dirname, "..");

async function main() {
    const cssIn = path.join(root, "styles", "main.css");
    const cssOut = path.join(root, "styles", "main.min.css");
    const css = fs.readFileSync(cssIn, "utf8");
    const minCss = new CleanCSS({ level: 2 }).minify(css);
    if (minCss.errors && minCss.errors.length) {
        console.error("clean-css errors:", minCss.errors);
        process.exitCode = 1;
    }
    fs.writeFileSync(cssOut, minCss.styles);
    console.log(
        "main.min.css",
        Math.round(css.length / 1024) + "KB →",
        Math.round(minCss.styles.length / 1024) + "KB"
    );

    const jsFiles = [
        "app.js",
        "auth-forms.js",
        "auth-nav.js",
        "cart-page.js",
        "cart-utils.js",
        "firebase-auth.js",
        "product.js"
    ];

    for (const f of jsFiles) {
        const p = path.join(root, "scripts", f);
        const code = fs.readFileSync(p, "utf8");
        const result = await minify(code, {
            compress: { passes: 1 },
            mangle: true,
            format: { comments: false }
        });
        if (result.error) {
            console.error(f, result.error);
            process.exitCode = 1;
            continue;
        }
        const out = path.join(root, "scripts", f.replace(/\.js$/, ".min.js"));
        fs.writeFileSync(out, result.code);
        console.log(f, "→", path.basename(out));
    }
}

main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
});
