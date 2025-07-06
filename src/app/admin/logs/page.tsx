
// src/app/admin/logs/page.tsx
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { History, Loader2 } from "lucide-react";
import LogsTable from "@/components/admin/LogsTable";
import type { AuditLog } from "@/lib/types";

/**
 * Yönetim Paneli - Olay Kayıtları Sayfası
 * 
 * Sistemdeki önemli olayların (kullanıcı kaydı, silme vb.) kaydını gösterir.
 * Bu kayıtlar, `auditLogs` koleksiyonundan gerçek zamanlı olarak alınır.
 */
export default function LogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Olay kayıtlarını en yeniden en eskiye doğru sıralayarak getir.
        const q = query(collection(db, "auditLogs"), orderBy("timestamp", "desc"));
        
        // Firestore dinleyicisi: Koleksiyonda bir değişiklik olduğunda otomatik olarak güncellenir.
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const logsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as AuditLog));
            setLogs(logsData);
            setLoading(false);
        }, (error) => {
            console.error("Olay kayıtları alınırken hata:", error);
            setLoading(false);
        });

        // Component unmount olduğunda dinleyiciyi temizle.
        return () => unsubscribe();
    }, []);

  return (
    <div>
      <div className="flex items-center gap-4">
        <History className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Olay Kayıtları</h1>
          <p className="text-muted-foreground mt-1">
            Sistemdeki önemli olayların (kullanıcı kaydı, silme vb.) kaydı.
          </p>
        </div>
      </div>

      <div className="mt-8">
        {loading ? (
            <div className="flex justify-center py-12">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        ) : (
            <LogsTable logs={logs} />
        )}
      </div>
    </div>
  );
}
