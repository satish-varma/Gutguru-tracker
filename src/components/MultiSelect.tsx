'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import styles from './MultiSelect.module.css';

interface MultiSelectProps {
    label: string;
    options: string[];
    value: string[];
    onChange: (value: string[]) => void;
    placeholder?: string;
}

export function MultiSelect({ label, options, value, onChange, placeholder = 'Select...' }: MultiSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (e: React.MouseEvent, option: string) => {
        e.stopPropagation();
        let newValue;
        if (value.includes(option)) {
            newValue = value.filter(v => v !== option);
        } else {
            newValue = [...value, option];
        }
        onChange(newValue);
    };

    const handleSelectAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        // If currently empty (All), typically we don't need to do anything, or we could select all explicitly.
        // Logic: If we are implementing "Empty = All", then clicking "All" should clear the array.
        onChange([]);
    };

    const isAllSelected = value.length === 0;

    const filteredOptions = options.filter(opt =>
        opt.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const displayValue = isAllSelected
        ? 'All'
        : value.length === 1
            ? value[0]
            : `${value.length}`;

    return (
        <div className={styles.container} ref={containerRef}>
            <button
                className={styles.button}
                onClick={() => setIsOpen(!isOpen)}
                type="button"
            >
                <div className={styles.label}>
                    <span className={styles.labelTitle}>{label}:</span>
                    <span className={styles.labelValue} style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {displayValue}
                    </span>
                </div>
                {isOpen ? <ChevronUp size={14} style={{ color: '#94a3b8' }} /> : <ChevronDown size={14} style={{ color: '#94a3b8' }} />}
            </button>

            {isOpen && (
                <div className={styles.dropdown}>
                    {options.length > 5 && (
                        <input
                            type="text"
                            placeholder={`Search ${label}...`}
                            className={styles.search}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    )}

                    <div
                        className={styles.option}
                        onClick={handleSelectAll}
                    >
                        <input
                            type="checkbox"
                            checked={isAllSelected}
                            readOnly
                            style={{ pointerEvents: 'none' }}
                        />
                        <span>All {label}s</span>
                    </div>

                    <div style={{ padding: '0.25rem 0', borderTop: '1px solid var(--card-border)', background: 'transparent' }}></div>

                    {filteredOptions.length === 0 ? (
                        <div style={{ padding: '0.5rem', color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center' }}>
                            No results
                        </div>
                    ) : (
                        filteredOptions.map(option => (
                            <div
                                key={option}
                                className={styles.option}
                                onClick={(e) => toggleOption(e, option)}
                            >
                                <input
                                    type="checkbox"
                                    checked={value.includes(option)}
                                    readOnly
                                    style={{ pointerEvents: 'none' }}
                                />
                                <span>{option}</span>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
