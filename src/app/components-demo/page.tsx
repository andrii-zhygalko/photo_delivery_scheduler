'use client';

import { ItemCard } from '@/components/item-card';
import { StatusPill } from '@/components/status-pill';
import { DeadlineBadge } from '@/components/deadline-badge';
import type { DeliveryItem } from '@/lib/db/schema';

/**
 * Demo page for Phase 4 UI components
 * Visit /components-demo to see all components in action
 *
 * NOTE: This is a Client Component ('use client') because it passes
 * event handlers (onEdit, onDeliver, onArchive) to ItemCard.
 * In production, this pattern will be used in list views (Phase 5).
 */
export default function ComponentsDemoPage() {
  // Sample delivery items for demo
  // NOTE: Using fixed dates to avoid hydration mismatch (Date.now() differs between server/client)
  const sampleItems: DeliveryItem[] = [
    {
      id: '1',
      user_id: 'demo-user',
      client_name: 'John & Sarah Wedding',
      shoot_date: '2025-10-15',
      computed_deadline: new Date('2025-11-08T23:59:00Z'), // 10 days from shoot (fixed date)
      custom_deadline: null,
      notes: 'Beach ceremony at sunset. Need special editing for golden hour shots.',
      status: 'TO_DO',
      is_archived: false,
      delivered_at: null,
      created_at: new Date('2025-10-28T12:00:00Z'),
      updated_at: new Date('2025-10-28T12:00:00Z'),
    },
    {
      id: '2',
      user_id: 'demo-user',
      client_name: 'Corporate Headshots - TechCorp',
      shoot_date: '2025-10-20',
      computed_deadline: new Date('2025-10-30T23:59:00Z'), // 2 days from "now" (due soon - orange)
      custom_deadline: null,
      notes: '50 employees, standard background.',
      status: 'EDITING',
      is_archived: false,
      delivered_at: null,
      created_at: new Date('2025-10-28T12:00:00Z'),
      updated_at: new Date('2025-10-28T12:00:00Z'),
    },
    {
      id: '3',
      user_id: 'demo-user',
      client_name: 'Baby Photoshoot - Miller Family',
      shoot_date: '2025-10-01',
      computed_deadline: new Date('2025-10-25T23:59:00Z'), // 3 days overdue (red)
      custom_deadline: null,
      notes: 'Newborn session with props.',
      status: 'TO_DO',
      is_archived: false,
      delivered_at: null,
      created_at: new Date('2025-10-28T12:00:00Z'),
      updated_at: new Date('2025-10-28T12:00:00Z'),
    },
    {
      id: '4',
      user_id: 'demo-user',
      client_name: 'Product Photography - Fashion Brand',
      shoot_date: '2025-09-15',
      computed_deadline: new Date('2025-10-18T23:59:00Z'), // Already delivered
      custom_deadline: new Date('2025-10-13T23:59:00Z'), // Custom earlier deadline (shows ⚡)
      notes: 'Seasonal collection, high-res images for e-commerce.',
      status: 'DELIVERED',
      is_archived: false,
      delivered_at: new Date('2025-10-17T14:30:00Z'),
      created_at: new Date('2025-09-15T12:00:00Z'),
      updated_at: new Date('2025-10-17T14:30:00Z'),
    },
    {
      id: '5',
      user_id: 'demo-user',
      client_name: 'Real Estate - Luxury Villa',
      shoot_date: '2025-08-01',
      computed_deadline: new Date('2025-09-28T23:59:00Z'),
      custom_deadline: null,
      notes: null,
      status: 'DELIVERED',
      is_archived: true,
      delivered_at: new Date('2025-09-27T10:00:00Z'),
      created_at: new Date('2025-08-01T12:00:00Z'),
      updated_at: new Date('2025-09-27T10:00:00Z'),
    },
  ];

  const userTimezone = 'America/New_York'; // Demo timezone

  return (
    <div className="min-h-screen bg-gradient-page">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Phase 4: UI Components Demo
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Testing StatusPill, DeadlineBadge, and ItemCard components with gradient borders
          </p>
        </div>

        {/* Status Pills Demo */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Status Pills
          </h2>
          <div className="flex flex-wrap gap-3">
            <StatusPill status="TO_DO" />
            <StatusPill status="EDITING" />
            <StatusPill status="DELIVERED" />
          </div>
        </section>

        {/* Deadline Badges Demo */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Deadline Badges
          </h2>
          <div className="flex flex-wrap gap-3">
            <DeadlineBadge
              computedDeadline={new Date('2025-11-07T23:59:00Z')}
              userTimezone={userTimezone}
            />
            <DeadlineBadge
              computedDeadline={new Date('2025-10-30T23:59:00Z')}
              userTimezone={userTimezone}
            />
            <DeadlineBadge
              computedDeadline={new Date('2025-10-29T23:59:00Z')}
              userTimezone={userTimezone}
            />
            <DeadlineBadge
              computedDeadline={new Date('2025-10-25T23:59:00Z')}
              userTimezone={userTimezone}
            />
            <DeadlineBadge
              computedDeadline={new Date('2025-11-02T23:59:00Z')}
              customDeadline={new Date('2025-10-30T23:59:00Z')}
              userTimezone={userTimezone}
            />
          </div>
        </section>

        {/* Item Cards Demo */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Delivery Item Cards
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sampleItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                userTimezone={userTimezone}
                onEdit={(item) => console.log('Edit:', item.client_name)}
                onDeliver={(item) => console.log('Deliver:', item.client_name)}
                onArchive={(item) => console.log('Archive:', item.client_name)}
              />
            ))}
          </div>
        </section>

        {/* Dark Mode Toggle Instructions */}
        <section className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Testing Instructions
          </h2>
          <ul className="space-y-2 text-slate-600 dark:text-slate-400">
            <li>✅ Gradient borders on cards (purple/blue)</li>
            <li>✅ Hover effects with purple shadow glow</li>
            <li>✅ Status pills with correct colors (blue, yellow, green, gray)</li>
            <li>✅ Deadline badges with urgency colors (red=overdue, orange=1-3 days, gray=4+)</li>
            <li>✅ Lightning bolt (⚡) on custom early deadline</li>
            <li>✅ Responsive layout (mobile: stack, desktop: grid)</li>
            <li>📱 Test dark mode toggle (add to system/browser preferences)</li>
            <li>📱 Test mobile responsive behavior (resize window or use DevTools)</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
