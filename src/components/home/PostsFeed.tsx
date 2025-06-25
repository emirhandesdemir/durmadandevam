
import PostCard from './PostCard';

// Bu kısım gelecekte Firestore'dan çekilecek gerçek verilerle değiştirilecektir.
const DUMMY_POSTS = [
    {
        id: '1',
        name: 'Elif Yılmaz',
        avatar: 'https://i.pravatar.cc/150?u=elif',
        time: '2 saat önce',
        text: 'Harika bir gün! Yeni bir proje üzerinde çalışıyorum ve çok heyecanlıyım. 🚀 #kodlama #geliştirici',
        image: 'https://placehold.co/600x400.png',
        imageHint: 'code laptop',
    },
    {
        id: '2',
        name: 'Mehmet Kaya',
        avatar: 'https://i.pravatar.cc/150?u=mehmet',
        time: '5 saat önce',
        text: 'Bu sabah doğa yürüyüşüne çıktım. Manzara inanılmazdı!',
        image: 'https://placehold.co/600x300.png',
        imageHint: 'nature landscape',
    },
    {
        id: '3',
        name: 'Zeynep Aydın',
        avatar: 'https://i.pravatar.cc/150?u=zeynep',
        time: '1 gün önce',
        text: 'Yeni bir kitap okumaya başladım. Şimdiden çok sardı. Herkese tavsiye ederim.',
    },
];

/**
 * Kullanıcı gönderilerini dikey bir akışta gösteren bileşen.
 */
export default function PostsFeed() {
    return (
        <div className="space-y-4">
            {DUMMY_POSTS.map(post => (
                <PostCard
                    key={post.id}
                    avatar={post.avatar}
                    name={post.name}
                    time={post.time}
                    text={post.text}
                    image={post.image}
                    imageHint={post.imageHint}
                />
            ))}
        </div>
    );
}
