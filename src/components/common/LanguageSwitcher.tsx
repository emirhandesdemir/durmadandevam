
'use client';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const languages = [
    { code: 'tr', name: 'Türkçe' },
    { code: 'en', name: 'English' },
];

/**
 * Kullanıcının uygulama dilini değiştirmesini sağlayan bir açılır menü bileşeni.
 */
export default function LanguageSwitcher() {
    const { i18n } = useTranslation();
    
    // Dil değiştirme fonksiyonu
    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };
    
    // Mevcut dilin adını bul
    const currentLanguage = languages.find(l => l.code === i18n.language) || languages[0];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline">
                    <Globe className="mr-2 h-4 w-4" />
                    {currentLanguage.name}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                {languages.map((lng) => (
                    <DropdownMenuItem key={lng.code} onClick={() => changeLanguage(lng.code)}>
                        {lng.name}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
