"use client";

import React, { useState, useEffect } from 'react';
import Button from './ui/Button';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

export type ColumnType = 'text' | 'number' | 'date' | 'boolean' | 'enum';

export interface ColumnDefinition {
  name: string;
  type: ColumnType;
  required: boolean;
  enumValues?: string[];
  description?: string;
}

interface ColumnDefinitionManagerProps {
  initialColumns?: ColumnDefinition[];
  onColumnsChange: (columns: ColumnDefinition[]) => void;
  readOnly?: boolean;
}

const ColumnDefinitionManager: React.FC<ColumnDefinitionManagerProps> = ({
  initialColumns,
  onColumnsChange,
  readOnly = false
}) => {
  const [columns, setColumns] = useState<ColumnDefinition[]>(
    initialColumns || [{ name: '', type: 'text', required: true }]
  );
  const [currentEnumValues, setCurrentEnumValues] = useState<string>('');
  const [activeEnumIndex, setActiveEnumIndex] = useState<number | null>(null);

  useEffect(() => {
    if (initialColumns && initialColumns.length > 0) {
      setColumns(initialColumns);
    }
  }, [initialColumns]);

  useEffect(() => {
    onColumnsChange(columns);
  }, [columns, onColumnsChange]);

  const addColumn = () => {
    if (readOnly) return;
    setColumns([...columns, { name: '', type: 'text', required: true }]);
  };

  const removeColumn = (index: number) => {
    if (readOnly) return;
    const newColumns = [...columns];
    newColumns.splice(index, 1);
    setColumns(newColumns);
    
    if (activeEnumIndex === index) {
      setActiveEnumIndex(null);
      setCurrentEnumValues('');
    } else if (activeEnumIndex !== null && activeEnumIndex > index) {
      setActiveEnumIndex(activeEnumIndex - 1);
    }
  };

  const updateColumn = (index: number, field: keyof ColumnDefinition, value: string | boolean | string[] | undefined) => {
    if (readOnly) return;
    const newColumns = [...columns];
    
    // If changing from enum to another type, clear enum values
    if (field === 'type' && newColumns[index].type === 'enum' && value !== 'enum') {
      newColumns[index].enumValues = undefined;
      if (activeEnumIndex === index) {
        setActiveEnumIndex(null);
        setCurrentEnumValues('');
      }
    }
    
    // Update the field
    newColumns[index] = { ...newColumns[index], [field]: value };
    setColumns(newColumns);
  };

  const handleEnumValuesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentEnumValues(e.target.value);
  };

  const saveEnumValues = () => {
    if (readOnly || activeEnumIndex === null) return;
    
    const values = currentEnumValues
      .split(',')
      .map(v => v.trim())
      .filter(v => v !== '');
    
    if (values.length > 0) {
      const newColumns = [...columns];
      newColumns[activeEnumIndex].enumValues = values;
      setColumns(newColumns);
    }
    
    setActiveEnumIndex(null);
    setCurrentEnumValues('');
  };

  const editEnumValues = (index: number) => {
    if (readOnly) return;
    const values = columns[index].enumValues || [];
    setCurrentEnumValues(values.join(', '));
    setActiveEnumIndex(index);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center mb-2">
        <label className="block text-sm font-medium text-gray-700">
          Column Definitions
        </label>
        {!readOnly && (
          <Button 
            variant="outline" 
            onClick={addColumn}
            type="button"
            className="text-sm py-1"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Column
          </Button>
        )}
      </div>
      
      <div className="space-y-3">
        {columns.map((column, index) => (
          <div key={index} className="flex flex-col p-3 border border-gray-200 rounded-md bg-gray-50">
            <div className="flex flex-wrap gap-3 mb-2">
              {/* Column Name */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Column Name
                </label>
                <input
                  type="text"
                  value={column.name}
                  onChange={(e) => updateColumn(index, 'name', e.target.value)}
                  placeholder="e.g. product_name"
                  className="w-full p-2 border border-gray-300 rounded-md text-sm text-gray-900"
                  required
                  disabled={readOnly}
                />
              </div>
              
              {/* Column Type */}
              <div className="w-[150px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Data Type
                </label>
                <select
                  value={column.type}
                  onChange={(e) => updateColumn(index, 'type', e.target.value as ColumnType)}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm text-gray-900"
                  disabled={readOnly}
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="boolean">Boolean</option>
                  <option value="enum">Enum (List)</option>
                </select>
              </div>
              
              {/* Required Checkbox */}
              <div className="w-[100px] flex items-end">
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={column.required}
                    onChange={(e) => updateColumn(index, 'required', e.target.checked)}
                    className="mr-2 h-4 w-4 text-[#008DC1]"
                    disabled={readOnly}
                  />
                  Required
                </label>
              </div>
              
              {/* Delete Button */}
              {!readOnly && (
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeColumn(index)}
                    className="p-1 text-gray-500 hover:text-red-500"
                    disabled={columns.length <= 1}
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
            
            {/* Description Field */}
            <div className="mb-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Description (helps AI generate better data)
              </label>
              <input
                type="text"
                value={column.description || ''}
                onChange={(e) => updateColumn(index, 'description', e.target.value)}
                placeholder="e.g. Product name with brand"
                className="w-full p-2 border border-gray-300 rounded-md text-sm text-gray-900"
                disabled={readOnly}
              />
            </div>
            
            {/* Enum Values Section */}
            {column.type === 'enum' && (
              <div className="mt-2">
                {activeEnumIndex === index ? (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Enter possible values (comma separated)
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        value={currentEnumValues}
                        onChange={handleEnumValuesChange}
                        placeholder="e.g. Small, Medium, Large"
                        className="flex-1 p-2 border border-gray-300 rounded-l-md text-sm text-gray-900"
                        disabled={readOnly}
                      />
                      <button
                        type="button"
                        onClick={saveEnumValues}
                        className="px-3 bg-[#008DC1] text-white rounded-r-md text-sm"
                        disabled={readOnly}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-medium text-gray-500">
                        Possible Values
                      </label>
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => editEnumValues(index)}
                          className="text-xs text-[#008DC1]"
                        >
                          Edit Values
                        </button>
                      )}
                    </div>
                    <div className="p-2 bg-white border border-gray-200 rounded-md text-sm mt-1">
                      {column.enumValues && column.enumValues.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {column.enumValues.map((value, i) => (
                            <span key={i} className="px-2 py-1 bg-gray-100 rounded-md text-xs">
                              {value}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">No values defined</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ColumnDefinitionManager;
