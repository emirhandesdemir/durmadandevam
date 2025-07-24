// src/app/admin/reports/page.tsx
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ShieldAlert, Loader2 } from "lucide-react";
import ReportsTable from "@/components/admin/ReportsTable";
import type { Report } from "@/lib/types";

export default function ReportsPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "reports"), orderBy("timestamp", "desc"));
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const reportsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Report));
            setReports(reportsData);
            setLoading(false);
        }, (error) => {
            console.error("Şikayetler alınırken hata:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

  return (
    <div>
      <div className="flex items-center gap-4">
        <ShieldAlert className="h-8 w-8 text-destructive" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kullanıcı Şikayetleri</h1>
          <p className="text-muted-foreground mt-1">
            Kullanıcılar tarafından gönderilen şikayetleri inceleyin ve yönetin.
          </p>
        </div>
      </div>

      <div className="mt-8">
        {loading ? (
            <div className="flex justify-center py-12">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        ) : (
            <ReportsTable reports={reports} />
        )}
      </div>
    </div>
  );
}
