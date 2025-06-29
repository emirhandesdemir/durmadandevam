// src/app/admin/page.tsx
// Bu sayfa, /admin rotasına gelen kullanıcıları otomatik olarak
// /admin/dashboard sayfasına yönlendirmek için kullanılır.

import { redirect } from 'next/navigation';

export default function AdminRootPage() {
  // Kullanıcıyı varsayılan admin sayfasına yönlendir
  redirect('/admin/dashboard');
}
