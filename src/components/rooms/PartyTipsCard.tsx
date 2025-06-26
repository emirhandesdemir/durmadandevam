// src/components/rooms/PartyTipsCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PartyTipsCard() {
    return (
        <Card className="bg-gray-800/50 border-gray-700/50 rounded-xl">
            <CardHeader className="p-4">
                <CardTitle className="text-base text-white">Parti İpuçları:</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-sm text-gray-300">
                <p>Odanızı daha popüler hale getirmek ister misiniz? Odanızı daha fazla kişiye göstermek için ısıtma işlevini kullanabilir, yani odanın sağ üst köşesindeki şenlik ateşi simgesine tıklayabilirsiniz. Arkadaşlarınızı da odanıza davet etmeyi unutmayın~</p>
            </CardContent>
        </Card>
    );
}
