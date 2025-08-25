import React, { useState } from 'react';
import DropdownMultiselect from '../components/dropdown-multiselect-fixed';
import DropdownMultiselectTest from '../components/dropdown-multiselect-test';

const DropdownMultiselectDemo = () => {
  const [selectedValues1, setSelectedValues1] = useState([]);
  const [selectedValues2, setSelectedValues2] = useState([]);
  const [selectedValues3, setSelectedValues3] = useState([]);

  const options = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
    { value: 'option4', label: 'Option 4' },
    { value: 'option5', label: 'Option 5' },
  ];

  const fruitOptions = [
    { value: 'apple', label: 'Apple' },
    { value: 'banana', label: 'Banana' },
    { value: 'orange', label: 'Orange' },
    { value: 'grape', label: 'Grape' },
    { value: 'strawberry', label: 'Strawberry' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dropdown Multiselect Demo</h1>
        
        <div className="space-y-8">
          {/* Basic Dropdown Multiselect */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Basic Dropdown Multiselect</h2>
            <DropdownMultiselect
              options={options}
              selectedValues={selectedValues1}
              onSelectionChange={setSelectedValues1}
              placeholder="Select options..."
            />
            <div className="mt-4 p-3 bg-gray-100 rounded">
              <strong>Selected:</strong> {selectedValues1.length > 0 ? selectedValues1.join(', ') : 'None'}
            </div>
          </div>

          {/* Searchable Dropdown Multiselect */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Searchable Dropdown Multiselect</h2>
            <DropdownMultiselect
              options={fruitOptions}
              selectedValues={selectedValues2}
              onSelectionChange={setSelectedValues2}
              placeholder="Search and select fruits..."
              searchable={true}
            />
            <div className="mt-4 p-3 bg-gray-100 rounded">
              <strong>Selected:</strong> {selectedValues2.length > 0 ? selectedValues2.join(', ') : 'None'}
            </div>
          </div>

          {/* Dropdown with Max Display Items */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Dropdown with Max Display Items (2)</h2>
            <DropdownMultiselect
              options={options}
              selectedValues={selectedValues3}
              onSelectionChange={setSelectedValues3}
              placeholder="Select options..."
              maxDisplayItems={2}
            />
            <div className="mt-4 p-3 bg-gray-100 rounded">
              <strong>Selected:</strong> {selectedValues3.length > 0 ? selectedValues3.join(', ') : 'None'}
            </div>
          </div>

          {/* Simple Test Component */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Simple Test Component</h2>
            <DropdownMultiselectTest />
          </div>

          {/* Debug Info */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
            <div className="space-y-2 text-sm">
              <div><strong>Dropdown 1:</strong> {JSON.stringify(selectedValues1)}</div>
              <div><strong>Dropdown 2:</strong> {JSON.stringify(selectedValues2)}</div>
              <div><strong>Dropdown 3:</strong> {JSON.stringify(selectedValues3)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DropdownMultiselectDemo;
