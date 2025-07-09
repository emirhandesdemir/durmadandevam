// src/components/posts/FirstPostRewardCard.tsx
"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gem, Gift, PenSquare } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function FirstPostRewardCard() {
  return (
    <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
    >
        <Card className="bg-gradient-to-tr from-primary/20 to-primary/5 border-primary/20 shadow-lg">
            <CardHeader className="flex-row items-center gap-4 space-y-0">
                <div className="p-3 bg-primary/10 rounded-full">
                    <Gift className="h-8 w-8 text-primary" />
                </div>
                <div>
                    <CardTitle>İlk Gönderi Ödülü!</CardTitle>
                    <CardDescription className="flex items-center gap-1.5">
                        İlk gönderini paylaş, <strong className="flex items-center gap-1">90 <Gem className="h-4 w-4 text-cyan-400"/></strong> daha kazan!
                    </CardDescription>
                </div>
            </CardHeader>
            <CardFooter>
                 <Button asChild className="w-full">
                    <Link href="/create-post">
                        <PenSquare className="mr-2 h-4 w-4"/>
                        İlk Gönderini Oluştur
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    </motion.div>
  );
}
