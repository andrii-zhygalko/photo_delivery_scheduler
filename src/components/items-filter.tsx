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
    <div className='flex justify-between md:justify-start flex-wrap gap-3 mb-3'>
      <div className='w-[180px]'>
        <label htmlFor='status-filter' className='sr-only'>
          Filter by status
        </label>
        <Select
          value={currentStatus}
          onValueChange={v => updateParam('status', v)}>
          <SelectTrigger id='status-filter' aria-label='Filter by status' className='w-full'>
            <SelectValue placeholder='Filter by status' />
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
        <Select value={currentSort} onValueChange={v => updateParam('sort', v)}>
          <SelectTrigger id='sort-filter' aria-label='Sort by' className='w-full'>
            <SelectValue placeholder='Sort by' />
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
        aria-label={`Toggle sort order: currently ${
          currentOrder === 'asc' ? 'ascending' : 'descending'
        }`}
        title={currentOrder === 'asc' ? 'Ascending' : 'Descending'}
        className='shrink-0'>
        <ArrowUpDown className='h-4 w-4' aria-hidden='true' />
      </Button>
    </div>
  );
}
