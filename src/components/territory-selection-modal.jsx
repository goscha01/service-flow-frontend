"use client"

import React, { useState, useEffect } from 'react';
import { X, MapPin, Search, Check } from 'lucide-react';
import { territoriesAPI } from '../services/api';

const TerritorySelectionModal = ({ isOpen, onClose, onSelect, territories = [], user }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredTerritories, setFilteredTerritories] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && territories.length === 0 && user?.id) {
      loadTerritories();
    }
  }, [isOpen, territories, user]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = territories.filter(territory =>
        territory.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        territory.location?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTerritories(filtered);
    } else {
      setFilteredTerritories(territories);
    }
  }, [searchTerm, territories]);

  const loadTerritories = async () => {
    try {
      setLoading(true);
      const response = await territoriesAPI.getAll(user.id);
      const territoriesData = response.territories || response;
      setFilteredTerritories(territoriesData);
    } catch (error) {
      console.error('Error loading territories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTerritorySelect = (territory) => {
    onSelect(territory);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--sf-border-light)]">
          <div className="flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-[var(--sf-blue-500)]" />
            <h3 className="text-lg font-semibold text-[var(--sf-text-primary)]">Select Territory</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--sf-text-muted)] hover:text-[var(--sf-text-secondary)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-[var(--sf-border-light)]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--sf-text-muted)]" />
            <input
              type="text"
              placeholder="Search territories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[var(--sf-border-light)] rounded-lg focus:ring-2 focus:ring-[var(--sf-blue-500)] focus:border-[var(--sf-blue-500)]"
            />
          </div>
        </div>

        {/* Territory List */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-[var(--sf-text-muted)]">
              Loading territories...
            </div>
          ) : filteredTerritories.length === 0 ? (
            <div className="p-4 text-center text-[var(--sf-text-muted)]">
              {searchTerm ? 'No territories found' : 'No territories available'}
            </div>
          ) : (
            <div className="divide-y divide-[var(--sf-border-light)]">
              {filteredTerritories.map((territory) => (
                <button
                  key={territory.id}
                  onClick={() => handleTerritorySelect(territory)}
                  className="w-full p-4 text-left hover:bg-[var(--sf-bg-page)] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-[var(--sf-text-primary)]">{territory.name}</h4>
                      <p className="text-sm text-[var(--sf-text-secondary)]">{territory.location}</p>
                      {territory.description && (
                        <p className="text-xs text-[var(--sf-text-muted)] mt-1">{territory.description}</p>
                      )}
                    </div>
                    <Check className="w-4 h-4 text-[var(--sf-blue-500)]" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--sf-border-light)]">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-[var(--sf-text-primary)] bg-[var(--sf-bg-page)] rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default TerritorySelectionModal;
