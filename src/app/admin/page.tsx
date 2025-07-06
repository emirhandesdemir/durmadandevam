
// Bu sayfa, /admin kök dizinine gelen kullanıcıları otomatik olarak
// /admin/dashboard sayfasına yönlendirmek için kullanılır.
// Bu, kullanıcıların boş bir sayfa görmesini engeller.
import { redirect } from 'next/navigation';

export default function AdminRootPage() {
  // Kullanıcıyı varsayılan admin sayfasına yönlendir.
  redirect('/admin/dashboard');
}
