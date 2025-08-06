// src/components/layout/DynamicTheme.tsx
import { getThemeSettings } from "@/lib/actions/themeActions";
import type { ColorTheme } from "@/lib/types";

function generateCssVariablesString(theme: ColorTheme): string {
    return Object.entries(theme)
        .map(([key, value]) => {
            const cssVarName = key.replace(/([A-Z])/g, '-$1').toLowerCase();
            return value ? `  --${cssVarName}: ${value};` : '';
        })
        .filter(Boolean)
        .join('\n');
}

/**
 * Veritabanından dinamik tema renklerini çeken ve bunları
 * HTML'in <head> bölümüne bir <style> etiketi olarak ekleyen bir sunucu bileşeni.
 */
export default async function DynamicTheme() {
    const themeSettings = await getThemeSettings();

    const lightThemeCss = generateCssVariablesString(themeSettings.light);
    const darkThemeCss = generateCssVariablesString(themeSettings.dark);

    const combinedCss = `
:root {
${lightThemeCss}
  --radius: ${themeSettings.radius || '1rem'};
  --font-sans: ${themeSettings.font || 'var(--font-jakarta)'};
}

.dark {
${darkThemeCss}
}
`;

    // Oluşturulan CSS'i doğrudan HTML'e enjekte et.
    return <style dangerouslySetInnerHTML={{ __html: combinedCss }} />;
}
