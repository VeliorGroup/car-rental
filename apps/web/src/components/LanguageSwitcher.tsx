'use client';

import { useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import { ChangeEvent, useTransition } from 'react';

export default function LanguageSwitcher() {
  const [isPending, startTransition] = useTransition();
  const localActive = useLocale();
  const pathname = usePathname();

  const onSelectChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const nextLocale = e.target.value;
    startTransition(() => {
      // Replace the current locale in the path with the new one
      // e.g., /en/dashboard -> /sq/dashboard
      const currentPath = pathname;
      const pathWithoutLocale = currentPath.replace(`/${localActive}`, '');
      const newPath = `/${nextLocale}${pathWithoutLocale || '/dashboard'}`;
      window.location.href = newPath;
    });
  };

  return (
    <label className='border-2 rounded'>
      <p className='sr-only'>Change language</p>
      <select
        defaultValue={localActive}
        className='bg-transparent py-2 px-2'
        onChange={onSelectChange}
        disabled={isPending}
      >
        <option value='en'>English</option>
        <option value='sq'>Shqip</option>
        <option value='it'>Italiano</option>
      </select>
    </label>
  );
}
