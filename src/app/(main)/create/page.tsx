// src/app/(main)/create/page.tsx
'use client';

// Bu sayfa artık doğrudan gönderi oluşturma formunu içeriyor.
// Bu, ChunkLoadError hatasını çözer ve kullanıcı deneyimini basitleştirir.
import NewPostForm from "@/components/posts/NewPostForm";

export default function CreatePage() {
    return (
        <NewPostForm />
    );
}
