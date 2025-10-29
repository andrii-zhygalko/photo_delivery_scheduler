'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ArrowUpDown } from 'lucide-react';

export function ItemsFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get('status') || 'all';
  const currentSort = searchParams.get('sort') || 'deadline';
  const currentOrder = searchParams.get('order') || 'asc';

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all' || value === '') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`?${params.toString()}`);
  };

  const toggleOrder = () => {
    const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
    updateParam('order', newOrder);
  };

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <div className="flex-1 min-w-[150px]">
        <Select
          value={currentStatus}
          onValueChange={(v) => updateParam('status', v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="TO_DO">To Do</SelectItem>
            <SelectItem value="EDITING">Editing</SelectItem>
            <SelectItem value="DELIVERED">Delivered</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[150px]">
        <Select
          value={currentSort}
          onValueChange={(v) => updateParam('sort', v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="deadline">Deadline</SelectItem>
            <SelectItem value="shoot_date">Shoot Date</SelectItem>
            <SelectItem value="created_at">Created Date</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={toggleOrder}
        title={currentOrder === 'asc' ? 'Ascending' : 'Descending'}
        className="shrink-0"
      >
        <ArrowUpDown className="h-4 w-4" />
      </Button>
    </div>
  );
}
