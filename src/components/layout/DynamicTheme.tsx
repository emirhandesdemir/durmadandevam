// src/components/layout/DynamicTheme.tsx
import { getThemeSettings } from "@/lib/actions/themeActions";
import type { ColorTheme } from "@/lib/types";

/**
 * Veritabanındaki tema ayarlarını alıp CSS değişkenlerine dönüştüren yardımcı fonksiyon.
 * @param theme - Aydınlık veya karanlık mod için renkleri içeren nesne.
 * @param selector - CSS seçicisi (örn: ':root' veya '.dark').
 * @returns Oluşturulan CSS string'i.
 */
function generateCssVariables(theme: ColorTheme, selector: string) {
    let css = `${selector} {\n`;
    for (const [key, value] of Object.entries(theme)) {
        // camelCase (js) formatını kebab-case (css) formatına dönüştürür.
        // Örn: 'primaryForeground' -> '--primary-foreground'
        const cssVarName = key.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
        if (value) {
            css += `  --${cssVarName}: ${value};\n`;
        }
    }
    css += '}\n';
    return css;
}

/**
 * Veritabanından dinamik tema renklerini çeken ve bunları
 * HTML'in <head> bölümüne bir <style> etiketi olarak ekleyen bir sunucu bileşeni.
 */
export default async function DynamicTheme() {
    const themeSettings = await getThemeSettings();

    const lightThemeCss = generateCssVariables(themeSettings.light, ':root');
    const darkThemeCss = generateCssVariables(themeSettings.dark, '.dark');

    const combinedCss = `${lightThemeCss}\n${darkThemeCss}`;

    // Oluşturulan CSS'i doğrudan HTML'e enjekte et.
    return <style dangerouslySetInnerHTML={{ __html: combinedCss }} />;
}
