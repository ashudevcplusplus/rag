import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { createApiClient } from '../lib/api';
import type { SearchResult } from '@repo/shared';
import { Search as SearchIcon } from 'lucide-react';

export default function Search() {
  const { config } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config || !query.trim()) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const api = createApiClient(config);
      const res = await api.post(`/v1/companies/${config.companyId}/search`, {
        query,
        limit: 10
      });
      setResults(res.data.results || []);
    } catch (e) {
      console.error(e);
      alert('Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Search Documents</h2>
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg"
            placeholder="Ask a question or search for content..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-6 h-6" />
          <button
            type="submit"
            disabled={loading}
            className="absolute right-3 top-1/2 -translate-y-1/2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      <div className="space-y-6">
        {hasSearched && results.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500">
            No results found.
          </div>
        )}

        {results.map((result, i) => (
          <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center space-x-2">
                <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-sm font-medium">
                  {Math.round(result.score)}% Match
                </span>
                <span className="text-gray-500 text-sm">
                  {result.payload.projectName} / {result.payload.originalFilename}
                </span>
              </div>
            </div>
            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
              {result.payload.text || result.payload.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
