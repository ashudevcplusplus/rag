import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Search,
  FileText,
  Copy,
  Download,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  EmptyState,
  Badge,
} from '@rag/ui';
import { Textarea } from '@rag/ui';
import { searchApi } from '@rag/api-client';
import type { SearchResult, SearchResponse } from '@rag/types';
import { truncate } from '@rag/utils';
import { useAuthStore } from '../../store/auth.store';
import { useAppStore } from '../../store/app.store';

export function SearchPage() {
  const { companyId } = useAuthStore();
  const { incrementSearchCount, addActivity } = useAppStore();

  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(10);
  const [useRerank, setUseRerank] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [expandedResult, setExpandedResult] = useState<string | null>(null);

  // Search mutation
  const searchMutation = useMutation({
    mutationFn: () =>
      searchApi.search(companyId!, {
        query,
        limit,
        rerank: useRerank,
      }),
    onSuccess: (response: SearchResponse) => {
      setSearchResults(response.results);
      incrementSearchCount();
      addActivity({
        text: `Searched: "${truncate(query, 50)}"`,
        type: 'search',
      });
    },
    onError: (error: unknown) => {
      const apiError = error as { error?: string; message?: string };
      const errorMessage = apiError?.error || apiError?.message || 'Search failed. Please try again.';
      toast.error(errorMessage);
      console.error('Search error:', error);
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      toast.error('Please enter a search query');
      return;
    }
    searchMutation.mutate();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (query.trim()) {
        searchMutation.mutate();
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const exportResults = () => {
    if (!searchResults) return;

    const exportData = {
      query,
      timestamp: new Date().toISOString(),
      resultsCount: searchResults.length,
      results: searchResults.map((result, index) => ({
        index: index + 1,
        score: result.score?.toFixed(2),
        content: result.payload?.content || result.payload?.text || '',
        projectName: result.payload?.projectName || 'N/A',
        fileName: result.payload?.originalFilename || result.payload?.fileName || 'Unknown',
        chunkIndex: result.payload?.chunkIndex,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `search-results-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Results exported!');
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 bg-green-50';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Search Documents</h1>
        <p className="text-gray-600 mt-1">
          Search across all your documents using AI-powered semantic search
        </p>
      </div>

      {/* Search Form */}
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <Textarea
              placeholder="Enter your search query... (Ctrl+Enter to search)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              className="text-lg"
            />

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Results:</label>
                  <select
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useRerank}
                    onChange={(e) => setUseRerank(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600 flex items-center gap-1">
                    <Sparkles className="w-4 h-4" />
                    Use Reranking
                  </span>
                </label>
              </div>

              <Button
                type="submit"
                isLoading={searchMutation.isPending}
                leftIcon={<Search className="w-4 h-4" />}
              >
                Search
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchResults !== null && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              Results{' '}
              <Badge variant="default" className="ml-2">
                {searchResults.length} found
              </Badge>
            </CardTitle>
            {searchResults.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={exportResults}
                leftIcon={<Download className="w-4 h-4" />}
              >
                Export
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {searchResults.length === 0 ? (
              <EmptyState
                icon={<Search className="w-12 h-12" />}
                title="No results found"
                description="Try a different search query or check if files have been processed"
              />
            ) : (
              <div className="space-y-4">
                {searchResults.map((result, index) => {
                  const content =
                    result.payload?.content ||
                    result.payload?.text ||
                    result.payload?.text_preview ||
                    '';
                  const score = result.score || 0;
                  const isExpanded = expandedResult === result.id;

                  return (
                    <div
                      key={result.id || index}
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
                      <div className="p-4 bg-gray-50 flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm">
                            {index + 1}
                          </div>

                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`px-2 py-0.5 rounded-full text-sm font-medium ${getScoreColor(score)}`}
                              >
                                {score.toFixed(1)}%
                              </span>
                              <span className="text-sm text-gray-500">
                                {result.payload?.projectName || 'Unknown Project'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <FileText className="w-4 h-4" />
                              <span>
                                {result.payload?.originalFilename ||
                                  result.payload?.fileName ||
                                  'Unknown file'}
                              </span>
                              {result.payload?.chunkIndex !== undefined && (
                                <span className="text-gray-400">
                                  • Chunk {result.payload.chunkIndex}
                                  {result.payload.totalChunks
                                    ? ` of ${result.payload.totalChunks}`
                                    : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyToClipboard(content)}
                            title="Copy content"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setExpandedResult(isExpanded ? null : result.id)
                            }
                            title={isExpanded ? 'Collapse' : 'Expand'}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="p-4">
                        <p
                          className={`text-gray-700 whitespace-pre-wrap ${
                            isExpanded ? '' : 'line-clamp-3'
                          }`}
                        >
                          {content || 'No content available'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      {searchResults === null && (
        <Card>
          <CardHeader>
            <CardTitle>Search Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                Use natural language queries for best results
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                Be specific about what you're looking for
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                Enable reranking for more accurate results (slower)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                Press Ctrl+Enter to quickly search
              </li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
