import type { JSX } from "preact";

declare module "preact" {
  namespace JSX {
    interface IntrinsicElements {
      "md-icon": JSX.HTMLAttributes<HTMLElement>;
      "md-filled-button": JSX.HTMLAttributes<HTMLElement> & { disabled?: boolean };
      "md-outlined-button": JSX.HTMLAttributes<HTMLElement> & { disabled?: boolean };
      "md-text-button": JSX.HTMLAttributes<HTMLElement> & { disabled?: boolean };
    }
  }
}
