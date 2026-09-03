import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * O alias "@/" existe no tsconfig e o Next resolve sozinho. O vitest não,
 * então os testes de módulos que importam por "@/..." precisam disto.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
