
"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ImagePlus, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/**
 * Kullanıcının yeni bir metin veya resim gönderisi oluşturmasını sağlayan bölüm.
 */
export default function CreatePost() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [postContent, setPostContent] = useState('');

    const handlePost = () => {
        if (!postContent.trim()) return;
        // TODO: Gerçek gönderi oluşturma mantığını buraya ekle (Firestore'a kaydetme)
        toast({
            title: "Gönderi Oluşturuldu (Simülasyon)",
            description: "Bu özellik yakında tamamen aktif olacak.",
        });
        setPostContent('');
    };
    
    const handleImageUpload = () => {
        toast({
            title: "Özellik Henüz Aktif Değil",
            description: "Resim yükleme yakında gelecek!",
        });
    }

    return (
        <Card className="shadow-md transition-shadow hover:shadow-lg">
            <CardContent className="p-4">
                <div className="flex items-start gap-4">
                    <Avatar>
                        <AvatarImage src={user?.photoURL || undefined} />
                        <AvatarFallback>{user?.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="w-full space-y-2">
                        <Textarea
                            placeholder="Aklında ne var?"
                            className="min-h-[60px] resize-none border-0 bg-muted/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                            value={postContent}
                            onChange={(e) => setPostContent(e.target.value)}
                        />
                        <div className="flex justify-between">
                            <Button variant="ghost" size="icon" onClick={handleImageUpload}>
                                <ImagePlus className="text-muted-foreground" />
                            </Button>
                            <Button onClick={handlePost} disabled={!postContent.trim()}>
                                <Send />
                                Paylaş
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
