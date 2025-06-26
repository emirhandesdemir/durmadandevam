// src/components/rooms/WelcomeMessageCard.tsx
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit } from "lucide-react";

export default function WelcomeMessageCard() {
    return (
        <Card className="bg-gray-800/50 border-gray-700/50 rounded-xl">
            <CardHeader className="flex-row items-center justify-between p-4">
                <div>
                    <CardTitle className="text-base text-white">Otomatik Hoşgeldin Mesajı</CardTitle>
                    <CardDescription className="text-sm text-gray-400">Düzenlemek için lütfen buraya tıklayın~</CardDescription>
                </div>
                <Edit className="h-5 w-5 text-gray-400 cursor-pointer hover:text-white" />
            </CardHeader>
        </Card>
    );
}
