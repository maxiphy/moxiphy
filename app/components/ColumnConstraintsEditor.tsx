"use client";

import React, { useState, useEffect } from 'react';
import Button from './ui/Button';
import { PlusIcon, PencilIcon } from '@heroicons/react/24/outline';
import { ColumnDefinition } from './ColumnDefinitionManager';

interface ColumnConstraint {
  columnName: string;
  enumValues?: string[];
  description?: string;
}

interface ColumnConstraintsEditorProps {
  csvHeaders: string[];
  onConstraintsChange: (constraints: ColumnConstraint[]) => void;
  onClose: () => void;
}

const ColumnConstraintsEditor: React.FC<ColumnConstraintsEditorProps> = ({
  csvHeaders,
  onConstraintsChange,
  onClose
}) => {
  const [constraints, setConstraints] = useState<ColumnConstraint[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [currentEnumValues, setCurrentEnumValues] = useState<string>('');
  const [currentDescription, setCurrentDescription] = useState<string>('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    // Initialize with empty constraints for each column
    const initialConstraints = csvHeaders.map(header => ({
      columnName: header,
      enumValues: undefined,
      description: ''
    }));
    setConstraints(initialConstraints);
  }, [csvHeaders]);

  const handleAddConstraint = () => {
    if (!selectedColumn) return;
    
    // Check if constraint already exists
    const existingIndex = constraints.findIndex(c => c.columnName === selectedColumn);
    
    if (existingIndex >= 0) {
      // Update existing constraint
      setEditingIndex(existingIndex);
      const existing = constraints[existingIndex];
      setCurrentEnumValues(existing.enumValues?.join(', ') || '');
      setCurrentDescription(existing.description || '');
    } else {
      // Add new constraint
      const newConstraint: ColumnConstraint = {
        columnName: selectedColumn,
        enumValues: undefined,
        description: ''
      };
      setConstraints([...constraints, newConstraint]);
      setEditingIndex(constraints.length);
      setCurrentEnumValues('');
      setCurrentDescription('');
    }
  };

  const handleSaveConstraint = () => {
    if (editingIndex === null) return;
    
    const newConstraints = [...constraints];
    const enumValues = currentEnumValues
      .split(',')
      .map(v => v.trim())
      .filter(v => v !== '');
    
    newConstraints[editingIndex] = {
      ...newConstraints[editingIndex],
      enumValues: enumValues.length > 0 ? enumValues : undefined,
      description: currentDescription
    };
    
    setConstraints(newConstraints);
    setEditingIndex(null);
    setSelectedColumn('');
    setCurrentEnumValues('');
    setCurrentDescription('');
    
    // Notify parent component of changes
    onConstraintsChange(newConstraints);
  };

  const handleEditConstraint = (index: number) => {
    const constraint = constraints[index];
    setEditingIndex(index);
    setSelectedColumn(constraint.columnName);
    setCurrentEnumValues(constraint.enumValues?.join(', ') || '');
    setCurrentDescription(constraint.description || '');
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setSelectedColumn('');
    setCurrentEnumValues('');
    setCurrentDescription('');
  };

  const handleSaveAll = () => {
    onConstraintsChange(constraints);
    onClose();
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Column Constraints</h2>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
      
      <p className="text-sm text-gray-500 mb-4">
        Define constraints for columns to guide AI when completing missing data.
        You can specify enum values (allowed options) and descriptions.
      </p>
      
      {/* Add constraint form */}
      <div className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
        <h3 className="text-md font-medium mb-3">Add/Edit Constraint</h3>
        
        <div className="grid grid-cols-1 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Column
            </label>
            <select
              value={selectedColumn}
              onChange={(e) => setSelectedColumn(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-gray-900"
              disabled={editingIndex !== null}
            >
              <option value="">-- Select a column --</option>
              {csvHeaders.map((header, index) => (
                <option key={index} value={header}>
                  {header}
                </option>
              ))}
            </select>
          </div>
          
          {(selectedColumn || editingIndex !== null) && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enum Values (comma separated)
                </label>
                <input
                  type="text"
                  value={currentEnumValues}
                  onChange={(e) => setCurrentEnumValues(e.target.value)}
                  placeholder="e.g. Small, Medium, Large"
                  className="w-full p-2 border border-gray-300 rounded-md text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty if this column doesn't have predefined values
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (helps AI understand the column)
                </label>
                <input
                  type="text"
                  value={currentDescription}
                  onChange={(e) => setCurrentDescription(e.target.value)}
                  placeholder="e.g. Product size category"
                  className="w-full p-2 border border-gray-300 rounded-md text-gray-900"
                />
              </div>
              
              <div className="flex space-x-2">
                {editingIndex === null ? (
                  <Button
                    variant="secondary"
                    onClick={handleAddConstraint}
                    disabled={!selectedColumn}
                    className="w-full"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Constraint
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="primary"
                      onClick={handleSaveConstraint}
                      className="w-1/2"
                    >
                      Save Changes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      className="w-1/2"
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Constraints list */}
      <div className="mb-6">
        <h3 className="text-md font-medium mb-3">Defined Constraints</h3>
        
        {constraints.filter(c => c.enumValues || c.description).length === 0 ? (
          <p className="text-sm text-gray-500 italic">No constraints defined yet</p>
        ) : (
          <div className="space-y-3">
            {constraints
              .filter(c => c.enumValues || c.description)
              .map((constraint, index) => (
                <div key={index} className="p-3 border border-gray-200 rounded-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{constraint.columnName}</h4>
                      {constraint.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          Description: {constraint.description}
                        </p>
                      )}
                      {constraint.enumValues && constraint.enumValues.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-600 mb-1">Allowed values:</p>
                          <div className="flex flex-wrap gap-1">
                            {constraint.enumValues.map((value, i) => (
                              <span key={i} className="px-2 py-1 bg-gray-100 rounded-md text-xs">
                                {value}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => handleEditConstraint(constraints.findIndex(c => c.columnName === constraint.columnName))}
                      className="text-sm py-1"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
      
      <div className="flex justify-end">
        <Button variant="primary" onClick={handleSaveAll}>
          Save All Constraints
        </Button>
      </div>
    </div>
  );
};

export default ColumnConstraintsEditor;
