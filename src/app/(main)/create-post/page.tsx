// Bu sayfa artık sadece NewPostForm bileşenini render ediyor.
// Tüm layout ve stil mantığı, daha iyi bir yapı için NewPostForm'un içine taşındı.
import NewPostForm from "@/components/posts/NewPostForm";

export default function CreatePostPage() {
  return (
    <NewPostForm />
  );
}
