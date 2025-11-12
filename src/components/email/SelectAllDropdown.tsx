"use client";

import * as React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectAllDropdownProps {
  onSelectAll: () => void;
  onSelectNone: () => void;
  onSelectRead: () => void;
  onSelectUnread: () => void;
  onSelectStarred: () => void;
  onSelectUnstarred: () => void;
  selectedCount: number;
  totalCount: number;
}

export default function SelectAllDropdown({
  onSelectAll,
  onSelectNone,
  onSelectRead,
  onSelectUnread,
  onSelectStarred,
  onSelectUnstarred,
  selectedCount,
  totalCount,
}: SelectAllDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
      >
        <input
          type="checkbox"
          checked={selectedCount > 0}
          readOnly
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          style={{ pointerEvents: 'none' }}
        />
        <ChevronDown className="h-4 w-4 text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-48 rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900 z-20">
          <div className="py-1">
            <button
              onClick={() => handleSelect(onSelectAll)}
              className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => handleSelect(onSelectNone)}
              className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              None
            </button>
            <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
            <button
              onClick={() => handleSelect(onSelectRead)}
              className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Read
            </button>
            <button
              onClick={() => handleSelect(onSelectUnread)}
              className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Unread
            </button>
            <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
            <button
              onClick={() => handleSelect(onSelectStarred)}
              className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Starred
            </button>
            <button
              onClick={() => handleSelect(onSelectUnstarred)}
              className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Unstarred
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
