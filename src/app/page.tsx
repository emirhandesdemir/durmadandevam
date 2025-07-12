// Bu dosya, uygulamanın ana giriş sayfasıdır (`/`).
// Artık doğrudan /login sayfasına yönlendirme yapar.
import { redirect } from 'next/navigation';

export default function RootPage() {
  // Kullanıcıyı varsayılan giriş sayfasına yönlendir.
  redirect('/login');
}
