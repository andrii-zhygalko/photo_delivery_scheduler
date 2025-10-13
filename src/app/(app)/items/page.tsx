import { getServerSession } from '@/lib/auth/session';

export default async function ItemsPage() {
  const session = await getServerSession();

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold">Delivery Items</h1>
      <p className="mt-2 text-muted-foreground">
        Signed in as: {session?.user?.email}
      </p>
    </div>
  );
}
