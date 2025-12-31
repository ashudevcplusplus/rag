import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  FileText,
  Copy,
  Download,
  ChevronDown,
  ChevronUp,
  Sparkles,
  FolderOpen,
  ExternalLink,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  EmptyState,
  Badge,
} from '@rag/ui';
import { Textarea } from '@rag/ui';
import { searchApi, projectsApi } from '@rag/api-client';
import type { SearchResult, SearchResponse } from '@rag/types';
import { truncate } from '@rag/utils';
import { useAuthStore } from '../../store/auth.store';
import { useAppStore } from '../../store/app.store';

const MAX_RECENT_SEARCHES = 5;

export function SearchPage() {
  const navigate = useNavigate();
  const { companyId } = useAuthStore();
  const { incrementSearchCount, addActivity } = useAppStore();

  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(10);
  const [useRerank, setUseRerank] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [expandedResult, setExpandedResult] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('recentSearches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Fetch projects for filter
  const { data: projectsData } = useQuery({
    queryKey: ['projects', companyId],
    queryFn: () => projectsApi.list(companyId!),
    enabled: !!companyId,
  });

  const projects = projectsData?.projects || [];
  const selectedProject = projects.find((p) => p._id === selectedProjectId);

  // Save recent search
  const saveRecentSearch = (searchQuery: string) => {
    const updated = [searchQuery, ...recentSearches.filter((s) => s !== searchQuery)].slice(
      0,
      MAX_RECENT_SEARCHES
    );
    setRecentSearches(updated);
    try {
      localStorage.setItem('recentSearches', JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
    toast.success('Search history cleared');
  };

  // Search mutation - accepts optional searchQuery to handle recent searches
  const searchMutation = useMutation({
    mutationFn: (searchQuery?: string) => {
      const queryToUse = searchQuery ?? query;
      if (!selectedProjectId) {
        throw new Error('Project ID is required');
      }
      return searchApi.search(companyId!, {
        query: queryToUse,
        limit,
        rerank: useRerank,
        projectId: selectedProjectId,
      });
    },
    onSuccess: (response: SearchResponse, searchQuery?: string) => {
      const queryUsed = searchQuery ?? query;
      setSearchResults(response.results);
      incrementSearchCount();
      saveRecentSearch(queryUsed.trim());
      addActivity({
        text: `Searched: "${truncate(queryUsed, 50)}"${selectedProject ? ` in ${selectedProject.name}` : ''}`,
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
    if (!selectedProjectId) {
      toast.error('Please select a project first');
      return;
    }
    searchMutation.mutate(undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (query.trim()) {
        searchMutation.mutate(undefined);
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
        {!selectedProjectId && (
          <div className="mt-3 px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 font-medium">
              ⚠️ Please select a project to enable search
            </p>
          </div>
        )}
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
              <div className="flex flex-wrap items-center gap-4">
                {/* Project Filter - REQUIRED */}
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-gray-400" />
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className={`px-3 py-1.5 rounded-lg border ${
                      !selectedProjectId ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'
                    } text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none`}
                    required
                  >
                    <option value="" disabled>Select a project *</option>
                    {projects.map((project) => (
                      <option key={project._id} value={project._id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

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
                disabled={!selectedProjectId || !query.trim()}
                leftIcon={<Search className="w-4 h-4" />}
              >
                Search
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Recent Searches */}
      {recentSearches.length > 0 && searchResults === null && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">Recent Searches</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearRecentSearches}
              className="text-xs"
            >
              Clear
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setQuery(search);
                    // Pass search term directly to avoid stale closure issue
                    searchMutation.mutate(search);
                  }}
                  className="group flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <Search className="w-3 h-3" />
                  <span title={search}>{truncate(search, 40)}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
                              {result.payload?.projectId && (
                                <button
                                  onClick={() =>
                                    navigate(`/projects/${result.payload?.projectId}`)
                                  }
                                  className="flex items-center gap-1 text-blue-600 hover:underline"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  View Project
                                </button>
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
