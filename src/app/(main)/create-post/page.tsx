
// Bu sayfa, kullanıcıların yeni bir gönderi oluşturması için tasarlanmıştır.
// Gönderi oluşturma formunu içerir ve ana sayfaya geri dönmek için bir buton sunar.
import NewPostForm from "@/components/posts/NewPostForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CreatePostPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      {/* Geri Dön Butonu */}
      <Button
        asChild
        variant="ghost"
        className="absolute left-4 top-4 md:left-8 md:top-8 rounded-full"
      >
        <Link href="/home">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Geri Dön
        </Link>
      </Button>
      {/* Gönderi Oluşturma Formu Bileşeni */}
      <div className="w-full max-w-3xl animate-in zoom-in-95 duration-500">
        <NewPostForm />
      </div>
    </main>
  );
}
