// src/app/admin/questions/page.tsx
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Puzzle, Loader2, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import QuestionsTable from "@/components/admin/QuestionsTable";
import EditQuestionDialog from "@/components/admin/EditQuestionDialog";
import { GameQuestion } from "@/lib/types";

/**
 * Yönetim Paneli - Quiz Soru Yöneticisi Sayfası
 * 
 * Firestore'daki `game_questions` koleksiyonunu yönetir.
 * Yöneticinin soruları listelemesine, yeni soru eklemesine,
 * mevcutları düzenlemesine ve silmesine olanak tanır.
 */
export default function QuestionManagerPage() {
    const [questions, setQuestions] = useState<GameQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    // Dialog penceresinin açık/kapalı durumunu yönetir.
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    // Düzenlenmek üzere seçilen soruyu tutar. Null ise yeni soru eklenir.
    const [selectedQuestion, setSelectedQuestion] = useState<GameQuestion | null>(null);

    // Soruları Firestore'dan anlık olarak dinle.
    useEffect(() => {
        const q = query(collection(db, "game_questions"), orderBy("createdAt", "desc"));
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const questionsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as GameQuestion));
            setQuestions(questionsData);
            setLoading(false);
        }, (error) => {
            console.error("Soruları çekerken hata:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Yeni soru ekleme dialogunu açar.
    const handleAddNew = () => {
        setSelectedQuestion(null);
        setIsDialogOpen(true);
    };

    // Mevcut bir soruyu düzenleme dialogunu açar.
    const handleEdit = (question: GameQuestion) => {
        setSelectedQuestion(question);
        setIsDialogOpen(true);
    };

    return (
        <div>
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Puzzle className="h-8 w-8 text-primary" />
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Quiz Soru Yöneticisi</h1>
                        <p className="text-muted-foreground mt-1">
                            Oda içi quiz oyunları için soruları yönetin.
                        </p>
                    </div>
                </div>
                <Button onClick={handleAddNew}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Yeni Soru Ekle
                </Button>
            </div>

            <div className="mt-8">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                ) : (
                    <QuestionsTable questions={questions} onEdit={handleEdit} />
                )}
            </div>

            {/* Soru Ekleme/Düzenleme Dialogu */}
            <EditQuestionDialog 
                isOpen={isDialogOpen}
                setIsOpen={setIsDialogOpen}
                question={selectedQuestion}
            />
        </div>
    );
}
