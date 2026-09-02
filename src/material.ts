// Side-effect imports for Material Web + self-hosted MD3 typefaces.
import "@fontsource/roboto/latin-400.css";
import "@fontsource/roboto/latin-500.css";
import "@fontsource/roboto/latin-700.css";
import "@material/web/icon/icon.js";
import { styles as typescaleStyles } from "@material/web/typography/md-typescale-styles.js";

if (typescaleStyles.styleSheet) {
  document.adoptedStyleSheets.push(typescaleStyles.styleSheet);
}
