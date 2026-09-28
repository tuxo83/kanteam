import React, { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';

interface ChipInputProps {
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  label: string;
  name: string;
  disabled?: boolean;
  /** Existing values offered in a dropdown; typing a new value still works. */
  suggestions?: string[];
}

const ChipInput: React.FC<ChipInputProps> = ({ value, onChange, placeholder, label, name, disabled, suggestions }) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputId = `chip-input-${name}`;
  const listId = `${inputId}-suggestions`;

  const options = useMemo(() => {
    if (!suggestions || suggestions.length === 0) return [];
    const chosen = new Set(value.map((item) => item.toLowerCase()));
    const query = inputValue.trim().toLowerCase();
    return suggestions.filter(
      (item) => !chosen.has(item.toLowerCase()) && (!query || item.toLowerCase().includes(query)),
    );
  }, [suggestions, value, inputValue]);
  const showList = isOpen && !disabled && options.length > 0;

  // a click anywhere else closes the list, even when no blur event reaches the input
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [isOpen]);

  const addChip = (raw: string) => {
    const newValue = raw.trim();
    if (newValue && !value.includes(newValue)) {
      onChange([...value, newValue]);
    }
    setInputValue('');
    setHighlighted(-1);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (showList && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setHighlighted((current) => (current + step + options.length) % options.length);
    } else if (e.key === 'Enter' && showList && highlighted >= 0 && highlighted < options.length) {
      e.preventDefault();
      addChip(options[highlighted]!);
    } else if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
      e.preventDefault();
      addChip(inputValue);
    } else if (e.key === 'Escape' && showList) {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Remove last chip when backspace is pressed on empty input
      onChange(value.slice(0, -1));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const newValue = e.target.value;
    setIsOpen(true);
    setHighlighted(-1);
    // Check if user typed a comma
    if (newValue.endsWith(',')) {
      addChip(newValue.slice(0, -1));
    } else {
      setInputValue(newValue);
    }
  };

  const removeChip = (index: number) => {
    if (disabled) return;
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="w-full" ref={rootRef}>
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-200">
        {label}
      </label>
      <div className={`relative w-full min-h-10 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md focus-within:ring-2 focus-within:ring-blue-500 dark:focus-within:ring-blue-400 focus-within:border-transparent transition-colors duration-200 pr-2 ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
        <div className="flex flex-wrap gap-2 items-center w-full">
          {value.map((item, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-sm bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded-md flex-shrink-0 min-w-0 max-w-full transition-colors duration-200"
            >
              <span className="truncate max-w-[16rem] sm:max-w-[20rem] md:max-w-[24rem]">{item}</span>
              {!disabled && (
	                <button
	                  type="button"
	                  onClick={() => removeChip(index)}
	                  className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-sm p-0.5 transition-colors duration-200"
	                  aria-label={`Remove ${item}`}
	                >
	                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
	                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}
            </span>
          ))}
          <input
            id={inputId}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsOpen(true)}
            onClick={() => setIsOpen(true)}
            onBlur={() => setIsOpen(false)}
            placeholder={value.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[2ch] outline-none text-sm bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            disabled={disabled}
            role={suggestions ? 'combobox' : undefined}
            aria-expanded={suggestions ? showList : undefined}
            aria-controls={suggestions ? listId : undefined}
            aria-autocomplete={suggestions ? 'list' : undefined}
          />
        </div>
        {showList && (
          <ul
            id={listId}
            role="listbox"
            className="absolute left-0 right-0 top-full mt-1 z-50 max-h-56 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg py-1"
          >
            {options.map((item, index) => (
              <li
                key={item}
                role="option"
                aria-selected={index === highlighted}
                // mousedown keeps the input focused, so the blur does not close the list before the pick
                onMouseDown={(e) => {
                  e.preventDefault();
                  addChip(item);
                }}
                onMouseEnter={() => setHighlighted(index)}
                className={`px-3 py-1.5 text-sm cursor-pointer truncate ${
                  index === highlighted
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
                    : 'text-gray-800 dark:text-gray-200'
                }`}
              >
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ChipInput;
