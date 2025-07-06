
// src/app/admin/analytics/page.tsx
"use client";

import { BarChart3 } from "lucide-react";
import AnalyticsCharts from "@/components/admin/AnalyticsCharts";

/**
 * Yönetim Paneli - İstatistikler Sayfası
 * 
 * Bu sayfa, uygulama kullanım verilerini ve büyüme trendlerini
 * görselleştiren grafikleri içerir.
 */
export default function AnalyticsPage() {
  return (
    <div>
      {/* Sayfa başlığı ve açıklaması */}
      <div className="flex items-center gap-4">
        <BarChart3 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">İstatistikler & Analiz</h1>
          <p className="text-muted-foreground mt-1">
            Uygulama kullanım verilerini ve büyüme trendlerini görselleştirin.
          </p>
        </div>
      </div>
      
      {/* Grafiklerin bulunduğu ana bileşen */}
      <div className="mt-8">
        <AnalyticsCharts />
      </div>
    </div>
  );
}
