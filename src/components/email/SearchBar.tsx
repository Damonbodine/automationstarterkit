"use client";

import * as React from 'react';
import { Search } from 'lucide-react';

export default function SearchBar({ value, onChange, placeholder = 'Search emails...' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [input, setInput] = React.useState(value);

  React.useEffect(() => setInput(value), [value]);

  React.useEffect(() => {
    const id = setTimeout(() => onChange(input), 250);
    return () => clearTimeout(id);
  }, [input, onChange]);

  return (
    <div className="relative">
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-gray-300 bg-white px-9 py-2 text-sm text-gray-900 placeholder-gray-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-400"
      />
      <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
    </div>
  );
}

