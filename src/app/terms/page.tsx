// src/app/terms/page.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl relative">
             <Button asChild variant="ghost" className="absolute top-8 left-4">
                <Link href="/signup">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Geri
                </Link>
            </Button>
            <div className="pt-16">
                <h1 className="text-3xl font-bold mb-6">Kullanıcı Sözleşmesi</h1>
                <div className="space-y-4 text-muted-foreground prose dark:prose-invert">
                    <p><strong>Son Güncelleme: [Tarih]</strong></p>
                    <p>
                        HiweWalk uygulamasını ("Hizmet") kullanmadan önce lütfen bu Kullanıcı Sözleşmesini ("Sözleşme") dikkatlice okuyun.
                        Hizmete erişiminiz ve kullanımınız, bu Sözleşmeyi kabul etmenize ve uymanıza bağlıdır.
                        Bu Sözleşme, Hizmete erişen veya Hizmeti kullanan tüm ziyaretçiler, kullanıcılar ve diğer kişiler için geçerlidir.
                    </p>
                    <h2 className="text-xl font-semibold text-foreground">1. Hesaplar</h2>
                    <p>
                        Bizimle bir hesap oluşturduğunuzda, bize her zaman doğru, eksiksiz ve güncel bilgi sağlamanız gerekir.
                        Bunu yapmamanız, Hizmetimizdeki hesabınızın derhal feshedilmesiyle sonuçlanabilecek bir Sözleşme ihlali teşkil eder.
                        Şifrenizin korunmasından ve şifrenizin altındaki tüm faaliyetlerden veya eylemlerden siz sorumlusunuz.
                    </p>
                    <h2 className="text-xl font-semibold text-foreground">2. İçerik</h2>
                    <p>
                        Hizmetimiz, belirli bilgileri, metinleri, grafikleri, videoları veya diğer materyalleri ("İçerik") göndermenize,
                        bağlamanıza, depolamanıza, paylaşmanıza ve başka şekillerde kullanıma sunmanıza olanak tanır.
                        Hizmette veya Hizmet aracılığıyla yayınladığınız İçeriğin yasallığı, güvenilirliği ve uygunluğundan siz sorumlusunuz.
                    </p>
                    <p>
                        Yasadışı, saldırgan, tehdit edici, karalayıcı, iftira niteliğinde, müstehcen veya başka bir şekilde
                        sakıncalı olan veya herhangi bir tarafın fikri mülkiyetini veya bu Sözleşmeyi ihlal eden İçerik yayınlayamazsınız.
                    </p>
                    <h2 className="text-xl font-semibold text-foreground">3. Fesih</h2>
                    <p>
                        Bu Sözleşmeyi ihlal etmeniz de dahil olmak üzere, herhangi bir nedenle, önceden bildirimde bulunmaksızın
                        veya yükümlülük altına girmeksizin hesabınızı derhal feshedebilir veya askıya alabiliriz.
                    </p>
                    <h2 className="text-xl font-semibold text-foreground">4. Değişiklikler</h2>
                    <p>
                        Tamamen kendi takdirimize bağlı olarak, bu Sözleşmeyi herhangi bir zamanda değiştirme veya değiştirme hakkımızı saklı tutarız.
                        Bir revizyonun önemli olması durumunda, yeni şartların yürürlüğe girmesinden en az 30 gün önce bildirimde bulunmaya çalışacağız.
                        Önemli bir değişikliğin ne olduğuna tamamen kendi takdirimize bağlı olarak karar verilecektir.
                    </p>
                    <h2 className="text-xl font-semibold text-foreground">5. Bize Ulaşın</h2>
                    <p>Bu Sözleşme ile ilgili herhangi bir sorunuz varsa, lütfen bizimle iletişime geçin.</p>
                </div>
            </div>
        </div>
    )
}
