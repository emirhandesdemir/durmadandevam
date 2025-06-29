// src/app/admin/analytics/page.tsx
"use client";

import { BarChart3 } from "lucide-react";
import AnalyticsCharts from "@/components/admin/AnalyticsCharts";

export default function AnalyticsPage() {
  return (
    <div>
      <div className="flex items-center gap-4">
        <BarChart3 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">İstatistikler & Analiz</h1>
          <p className="text-muted-foreground mt-1">
            Uygulama kullanım verilerini ve büyüme trendlerini görselleştirin.
          </p>
        </div>
      </div>
      <div className="mt-8">
        <AnalyticsCharts />
      </div>
    </div>
  );
}
