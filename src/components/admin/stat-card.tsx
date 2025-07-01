// src/components/admin/stat-card.tsx
// Bu, admin panelinin dashboard sayfasında kullanılan yeniden kullanılabilir bir istatistik kartı bileşenidir.
// Bir başlık (örn: "Toplam Kullanıcı"), bir değer (örn: "1,234") ve bir ikon gösterir.
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { type LucideIcon } from "lucide-react";
import { Skeleton } from "../ui/skeleton";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  isLoading?: boolean;
}

export default function StatCard({ title, value, icon: Icon, isLoading }: StatCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {/* Veri yüklenirken bir iskelet (skeleton) göster */}
        {isLoading ? (
            <Skeleton className="h-8 w-3/4" />
        ) : (
            <div className="text-2xl font-bold text-foreground">{value}</div>
        )}
      </CardContent>
    </Card>
  );
}
