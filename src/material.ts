// Side-effect imports for Material Web + self-hosted MD3 typefaces.
import "@fontsource/roboto-serif/latin-400.css";
import "@fontsource/roboto-serif/latin-500.css";
import "@fontsource/roboto-serif/latin-600.css";
import "@fontsource/roboto-serif/latin-700.css";
import "@material/web/icon/icon.js";
import { styles as typescaleStyles } from "@material/web/typography/md-typescale-styles.js";

if (typescaleStyles.styleSheet) {
  document.adoptedStyleSheets.push(typescaleStyles.styleSheet);
}
