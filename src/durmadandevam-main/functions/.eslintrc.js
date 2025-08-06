// Bu dosya, projenin kodlama standartlarını ve kurallarını belirleyen ESLint yapılandırmasıdır.
// Kodun tutarlı ve hatasız olmasını sağlamaya yardımcı olur.
module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["tsconfig.json", "tsconfig.dev.json"],
    sourceType: "module",
  },
  ignorePatterns: [
    "/lib/**/*", // Derlenmiş dosyaları yoksay.
    "/generated/**/*", // Otomatik oluşturulmuş dosyaları yoksay.
  ],
  plugins: [
    "@typescript-eslint",
    "import",
  ],
  rules: {
    "quotes": ["error", "double"], // String'ler için çift tırnak kullanımını zorunlu kıl.
    "import/no-unresolved": 0, // Çözümlenmemiş import hatalarını gösterme.
    "indent": ["error", 2], // 2 boşluklu girintileme kullan.
  },
};
