"use client";

import { createContext, useState, useEffect, ReactNode } from 'react';
import type { ColumnConfig } from '@/types';

interface SettingsContextType {
  columnConfig: ColumnConfig;
  setColumnConfig: (config: ColumnConfig) => void;
}

const defaultConfig: ColumnConfig = {
  type: 'Type',
  documentNumber: 'Document Number',
  name: 'Name',
  dueDate: 'Due Date',
  amount: 'Amount',
  dateFormat: 'auto',
};

export const SettingsContext = createContext<SettingsContextType>({
  columnConfig: defaultConfig,
  setColumnConfig: () => {},
});

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [columnConfig, setColumnConfig] = useState<ColumnConfig>(() => {
    if (typeof window !== 'undefined') {
        try {
          const savedConfig = localStorage.getItem('columnConfig');
          return savedConfig ? JSON.parse(savedConfig) : defaultConfig;
        } catch (error) {
          console.error("Failed to parse columnConfig from localStorage", error);
          return defaultConfig;
        }
    }
    return defaultConfig;
  });

  useEffect(() => {
    try {
      localStorage.setItem('columnConfig', JSON.stringify(columnConfig));
    } catch (error) {
      console.error("Failed to save columnConfig to localStorage", error);
    }
  }, [columnConfig]);

  return (
    <SettingsContext.Provider value={{ columnConfig, setColumnConfig }}>
      {children}
    </SettingsContext.Provider>
  );
};
