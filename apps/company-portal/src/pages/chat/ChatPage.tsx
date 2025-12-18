import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Send,
  Bot,
  User,
  FileText,
  Trash2,
  ChevronDown,
  Sparkles,
  Copy,
  Check,
  StopCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Card,
  CardContent,
  Button,
  Badge,
  Select,
} from '@rag/ui';
import { chatApi, projectsApi, type ChatMessage, type ChatResponse } from '@rag/api-client';
import { formatRelativeTime } from '@rag/utils';
import { useAuthStore } from '../../store/auth.store';
import { useAppStore } from '../../store/app.store';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatResponse['sources'];
  timestamp: Date;
  isStreaming?: boolean;
}

export function ChatPage() {
  const { companyId } = useAuthStore();
  const { addActivity } = useAppStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [showSources, setShowSources] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch projects for filter
  const { data: projectsData } = useQuery({
    queryKey: ['projects', companyId],
    queryFn: () => projectsApi.list(companyId!),
    enabled: !!companyId,
  });

  const projects = projectsData?.projects || [];

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleCopy = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      
      // Update the last message to remove streaming state
      setMessages((prev) =>
        prev.map((msg, i) =>
          i === prev.length - 1 && msg.isStreaming
            ? { ...msg, isStreaming: false, content: msg.content + ' [Stopped]' }
            : msg
        )
      );
    }
  };

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      const query = input.trim();
      if (!query || isLoading) return;

      setInput('');
      setIsLoading(true);

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: query,
        timestamp: new Date(),
      };

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);

      // Build history from previous messages
      const history: ChatMessage[] = messages.slice(-10).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      try {
        // Use streaming API
        const controller = chatApi.streamChat(
          companyId!,
          {
            query,
            projectId: selectedProjectId || undefined,
            history,
            limit: 5,
          },
          // On chunk
          (chunk) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessage.id
                  ? { ...msg, content: msg.content + chunk }
                  : msg
              )
            );
          },
          // On complete
          (sources) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessage.id
                  ? { ...msg, isStreaming: false, sources }
                  : msg
              )
            );
            setIsLoading(false);
            abortControllerRef.current = null;
            addActivity({ text: `Asked: "${query.slice(0, 50)}..."`, type: 'search' });
          },
          // On error
          (error) => {
            console.error('Chat error:', error);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessage.id
                  ? {
                      ...msg,
                      isStreaming: false,
                      content: `Error: ${error.message || 'Failed to get response'}`,
                    }
                  : msg
              )
            );
            setIsLoading(false);
            abortControllerRef.current = null;
            toast.error('Failed to get response');
          }
        );

        abortControllerRef.current = controller;
      } catch (error) {
        console.error('Chat error:', error);
        setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessage.id));
        setIsLoading(false);
        toast.error('Failed to send message');
      }
    },
    [input, isLoading, messages, companyId, selectedProjectId, addActivity]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const clearChat = () => {
    setMessages([]);
    toast.success('Chat cleared');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bot className="w-7 h-7 text-blue-600" />
            AI Assistant
          </h1>
          <p className="text-gray-600 mt-1">
            Chat with your documents using AI
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Project Filter */}
          <div className="w-56">
            <Select
              uiSize="sm"
              aria-label="Project filter"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              <option value="">All Projects</option>
              {projects.map((project) => (
                <option key={project._id} value={project._id}>
                  {project.name}
                </option>
              ))}
            </Select>
          </div>

          {messages.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearChat}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Chat Container */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Start a Conversation
              </h3>
              <p className="text-gray-500 max-w-md">
                Ask questions about your documents. The AI will search through your
                uploaded files and provide relevant answers.
              </p>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
                {[
                  'What are the key points in my documents?',
                  'Summarize the main topics',
                  'Find information about...',
                  'Compare documents on...',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="px-4 py-2 text-sm text-left text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-blue-600" />
                    </div>
                  )}

                  <div
                    className={`max-w-[80%] ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white rounded-2xl rounded-br-md'
                        : 'bg-gray-100 text-gray-900 rounded-2xl rounded-bl-md'
                    } px-4 py-3`}
                  >
                    <div className="whitespace-pre-wrap break-words">
                      {message.content}
                      {message.isStreaming && (
                        <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
                      )}
                    </div>

                    {/* Sources */}
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <button
                          onClick={() =>
                            setShowSources(
                              showSources === message.id ? null : message.id
                            )
                          }
                          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                        >
                          <FileText className="w-3 h-3" />
                          {message.sources.length} source
                          {message.sources.length !== 1 ? 's' : ''}
                          <ChevronDown
                            className={`w-3 h-3 transition-transform ${
                              showSources === message.id ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {showSources === message.id && (
                          <div className="mt-2 space-y-2">
                            {message.sources.map((source, i) => (
                              <div
                                key={i}
                                className="p-2 bg-white rounded-lg border border-gray-200 text-sm"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-gray-700 truncate">
                                    {source.fileName || 'Unknown file'}
                                  </span>
                                  <Badge variant="default" className="text-xs">
                                    {source.score.toFixed(0)}%
                                  </Badge>
                                </div>
                                <p className="text-gray-600 text-xs line-clamp-2">
                                  {source.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Message actions */}
                    <div className="flex items-center justify-between mt-2">
                      <span
                        className={`text-xs ${
                          message.role === 'user'
                            ? 'text-blue-200'
                            : 'text-gray-400'
                        }`}
                      >
                        {formatRelativeTime(message.timestamp)}
                      </span>

                      {message.role === 'assistant' && !message.isStreaming && (
                        <button
                          onClick={() => handleCopy(message.content, message.id)}
                          className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                          title="Copy response"
                        >
                          {copiedId === message.id ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </CardContent>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about your documents..."
                rows={1}
                className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-300 bg-white resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                style={{
                  minHeight: '48px',
                  maxHeight: '120px',
                }}
                disabled={isLoading}
              />
            </div>

            {isLoading ? (
              <Button
                type="button"
                variant="danger"
                onClick={handleStopGeneration}
                className="px-4"
              >
                <StopCircle className="w-5 h-5" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={!input.trim()}
                className="px-4"
              >
                <Send className="w-5 h-5" />
              </Button>
            )}
          </form>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </Card>
    </div>
  );
}
