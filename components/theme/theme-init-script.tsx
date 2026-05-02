import { THEME_COOKIE_NAME } from "@/lib/theme/shared";

/**
 * Script inline anti-FOUC: antes da hidratação lê o cookie de tema
 * (se houver) e aplica `data-accent`, `data-mode` e `html.dark`.
 * Serve como reconciliador caso o RSC renderize com defaults e o
 * cliente já tenha preferência persistida (ex: outra aba).
 */
export function ThemeInitScript() {
  const code = `
(function() {
  try {
    var name = ${JSON.stringify(THEME_COOKIE_NAME)} + "=";
    var cookies = document.cookie ? document.cookie.split(";") : [];
    var raw = null;
    for (var i = 0; i < cookies.length; i++) {
      var c = cookies[i].trim();
      if (c.indexOf(name) === 0) { raw = c.substring(name.length); break; }
    }
    var accent = "salvia";
    var mode = "light";
    if (raw) {
      try {
        var parsed = JSON.parse(decodeURIComponent(raw));
        if (parsed && typeof parsed === "object") {
          if (typeof parsed.accent === "string") accent = parsed.accent;
          if (typeof parsed.mode === "string") mode = parsed.mode;
        }
      } catch (_) {}
    }
    var html = document.documentElement;
    html.setAttribute("data-accent", accent);
    html.setAttribute("data-mode", mode);
    var effective = mode;
    if (mode === "system") {
      effective = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    if (effective === "dark") html.classList.add("dark");
    else html.classList.remove("dark");
  } catch (_) {}
})();
`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
