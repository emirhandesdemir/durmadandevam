// src/app/(main)/search/page.tsx
import UserSearch from '@/components/search/UserSearch';
import { Search } from 'lucide-react';

export default function SearchPage() {
  return (
    <div className="container mx-auto max-w-2xl py-6">
      <div className="flex items-center gap-3 mb-6">
        <Search className="h-7 w-7" />
        <h1 className="text-2xl font-bold tracking-tight">Kullanıcı Ara</h1>
      </div>
      <UserSearch />
    </div>
  );
}
