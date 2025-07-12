// src/app/privacy/page.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl relative">
            <Button asChild variant="ghost" className="absolute top-8 left-4">
                <Link href="/signup">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Geri
                </Link>
            </Button>
            <div className="pt-16">
                <h1 className="text-3xl font-bold mb-6">Gizlilik Politikası</h1>
                <div className="space-y-4 text-muted-foreground prose dark:prose-invert">
                    <p><strong>Son Güncelleme: [Tarih]</strong></p>
                    <p>
                        Bu Gizlilik Politikası, HiweWalk ("biz", "bize" veya "bizim") tarafından işletilen
                        HiweWalk mobil uygulamasını ("Hizmet") kullandığınızda bilgilerinizin toplanması,
                        kullanılması ve ifşa edilmesine ilişkin politikalarımızı ve prosedürlerimizi açıklamaktadır.
                    </p>
                    <h2 className="text-xl font-semibold text-foreground">Topladığımız Bilgiler</h2>
                    <p>
                        Hizmetimizi sağlamak ve iyileştirmek için çeşitli türde bilgiler topluyoruz. Toplanan bilgiler şunları içerir:
                    </p>
                    <ul>
                        <li><strong>Kişisel Veriler:</strong> Hizmetimizi kullanırken, sizinle iletişim kurmak veya sizi tanımlamak için kullanılabilecek
                        belirli kişisel olarak tanımlanabilir bilgileri ("Kişisel Veriler") sağlamanızı isteyebiliriz.
                        Bu bilgiler e-posta adresinizi, kullanıcı adınızı ve sağladığınız diğer profil bilgilerini içerebilir ancak bunlarla sınırlı değildir.</li>
                        <li><strong>Kullanım Verileri:</strong> Hizmete eriştiğinizde ve Hizmeti kullandığınızda otomatik olarak toplanan bilgileri ("Kullanım Verileri")
                        de toplayabiliriz. Bu Kullanım Verileri, cihazınızın İnternet Protokol adresi (ör. IP adresi), tarayıcı türü,
                        tarayıcı sürümü, ziyaret ettiğiniz Hizmetimizin sayfaları, ziyaretinizin saati ve tarihi,
                        bu sayfalarda harcanan süre, benzersiz cihaz tanımlayıcıları ve diğer teşhis verileri gibi bilgileri içerebilir.</li>
                        <li><strong>Konum Verileri:</strong> İzin vermeniz durumunda konumunuz hakkında bilgi kullanabilir ve saklayabiliriz ("Konum Verileri").
                        Bu verileri Hizmetimizin özelliklerini sağlamak, iyileştirmek ve özelleştirmek için kullanırız.</li>
                    </ul>
                    <h2 className="text-xl font-semibold text-foreground">Verilerin Kullanımı</h2>
                    <p>
                        HiweWalk, toplanan verileri çeşitli amaçlar için kullanır:
                    </p>
                    <ul>
                        <li>Hizmetimizi sağlamak ve sürdürmek</li>
                        <li>Size Hizmetimizdeki değişiklikler hakkında bilgi vermek</li>
                        <li>Seçtiğinizde Hizmetimizin etkileşimli özelliklerine katılmanıza olanak sağlamak</li>
                        <li>Müşteri desteği sağlamak</li>
                        <li>Hizmeti iyileştirebilmemiz için analiz veya değerli bilgiler toplamak</li>
                        <li>Hizmetin kullanımını izlemek</li>
                        <li>Teknik sorunları tespit etmek, önlemek ve ele almak</li>
                    </ul>
                    <h2 className="text-xl font-semibold text-foreground">Veri Güvenliği</h2>
                    <p>
                        Verilerinizin güvenliği bizim için önemlidir, ancak İnternet üzerinden hiçbir iletim yönteminin veya
                        elektronik depolama yönteminin %100 güvenli olmadığını unutmayın.
                        Kişisel Verilerinizi korumak için ticari olarak kabul edilebilir yöntemler kullanmaya çalışsak da,
                        mutlak güvenliğini garanti edemeyiz.
                    </p>
                    <h2 className="text-xl font-semibold text-foreground">Bize Ulaşın</h2>
                    <p>Bu Gizlilik Politikası ile ilgili herhangi bir sorunuz varsa, lütfen bizimle iletişime geçin.</p>
                </div>
            </div>
        </div>
    );
}
