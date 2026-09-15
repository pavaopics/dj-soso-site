import { notFound } from 'next/navigation';

export default async function AdminPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  const { AdminClient } = await import('./admin-client');
  return <AdminClient />;
}
