'use client';

import { useRouter } from 'next/navigation';
import { useTransition, useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ArrowUpDown } from 'lucide-react';

interface ItemsFilterProps {
  currentStatus: string;
  currentSort: string;
  currentOrder: 'asc' | 'desc';
}

export function ItemsFilter({ currentStatus, currentSort, currentOrder }: ItemsFilterProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Local state for optimistic UI updates
  const [optimisticStatus, setOptimisticStatus] = useState(currentStatus);
  const [optimisticSort, setOptimisticSort] = useState(currentSort);
  const [optimisticOrder, setOptimisticOrder] = useState(currentOrder);

  // Sync local state when props update from server
  useEffect(() => {
    setOptimisticStatus(currentStatus);
  }, [currentStatus]);

  useEffect(() => {
    setOptimisticSort(currentSort);
  }, [currentSort]);

  useEffect(() => {
    setOptimisticOrder(currentOrder);
  }, [currentOrder]);

  // Map values to display labels (prevents Radix SSR hydration flash)
  const statusLabels: Record<string, string> = {
    all: 'All Statuses',
    TO_DO: 'To Do',
    EDITING: 'Editing',
    DELIVERED: 'Delivered',
  };

  const sortLabels: Record<string, string> = {
    deadline: 'Deadline',
    shoot_date: 'Shoot Date',
    created_at: 'Created Date',
  };

  const updateParam = (key: string, value: string) => {
    // Update optimistic state immediately
    if (key === 'status') {
      setOptimisticStatus(value);
    } else if (key === 'sort') {
      setOptimisticSort(value);
    } else if (key === 'order') {
      setOptimisticOrder(value as 'asc' | 'desc');
    }

    // Use window.location.search to construct params (per Next.js docs optimization)
    const params = new URLSearchParams(window.location.search);
    if (value === 'all' || value === '') {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    // Wrap router.push in transition for better UX
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  const toggleOrder = () => {
    const newOrder = optimisticOrder === 'asc' ? 'desc' : 'asc';
    updateParam('order', newOrder);
  };

  return (
    <div className='flex justify-between md:justify-start gap-3 mb-3'>
      <div className='w-[180px]'>
        <label htmlFor='status-filter' className='sr-only'>
          Filter by status
        </label>
        <Select
          value={optimisticStatus}
          onValueChange={v => updateParam('status', v)}
          disabled={isPending}>
          <SelectTrigger
            id='status-filter'
            aria-label='Filter by status'
            className='w-full'>
            <SelectValue>
              {statusLabels[optimisticStatus] || 'Filter by status'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Statuses</SelectItem>
            <SelectItem value='TO_DO'>To Do</SelectItem>
            <SelectItem value='EDITING'>Editing</SelectItem>
            <SelectItem value='DELIVERED'>Delivered</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className='w-[180px]'>
        <label htmlFor='sort-filter' className='sr-only'>
          Sort by
        </label>
        <Select
          value={optimisticSort}
          onValueChange={v => updateParam('sort', v)}
          disabled={isPending}>
          <SelectTrigger
            id='sort-filter'
            aria-label='Sort by'
            className='w-full'>
            <SelectValue>
              {sortLabels[optimisticSort] || 'Sort by'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='deadline'>Deadline</SelectItem>
            <SelectItem value='shoot_date'>Shoot Date</SelectItem>
            <SelectItem value='created_at'>Created Date</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        variant='outline'
        size='icon'
        onClick={toggleOrder}
        disabled={isPending}
        aria-label={`Toggle sort order: currently ${
          optimisticOrder === 'asc' ? 'ascending' : 'descending'
        }`}
        title={optimisticOrder === 'asc' ? 'Ascending' : 'Descending'}
        className='shrink-0'>
        <ArrowUpDown className='h-4 w-4' aria-hidden='true' />
      </Button>
    </div>
  );
}
