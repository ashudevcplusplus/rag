import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Plus,
  MessageSquare,
  MoreVertical,
  Edit3,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Card,
  CardContent,
  Button,
  Badge,
} from '@rag/ui';
import {
  chatApi,
  projectsApi,
  conversationsApi,
  type ChatMessage,
  type ChatResponse,
  type Conversation,
  type ConversationMessage,
} from '@rag/api-client';
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
  isThinking?: boolean;
}

export function ChatPage() {
  const { companyId } = useAuthStore();
  const { addActivity } = useAppStore();
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [showSources, setShowSources] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch projects for filter
  const { data: projectsData } = useQuery({
    queryKey: ['projects', companyId],
    queryFn: () => projectsApi.list(companyId!),
    enabled: !!companyId,
  });

  // Fetch conversations
  const { data: conversationsData, isLoading: conversationsLoading } = useQuery({
    queryKey: ['conversations', companyId, selectedProjectId],
    queryFn: () =>
      conversationsApi.list(companyId!, {
        limit: 50,
        projectId: selectedProjectId || undefined,
      }),
    enabled: !!companyId,
  });

  const projects = projectsData?.projects || [];
  const conversations = conversationsData?.conversations || [];

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: (data: { title?: string; projectId?: string }) =>
      conversationsApi.create(companyId!, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['conversations', companyId] });
      setActiveConversationId(data.conversation._id);
      setMessages([]);
    },
  });

  // Update conversation mutation
  const updateConversationMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      conversationsApi.update(companyId!, id, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', companyId] });
      setEditingTitle(null);
    },
  });

  // Delete conversation mutation
  const deleteConversationMutation = useMutation({
    mutationFn: (id: string) => conversationsApi.delete(companyId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', companyId] });
      if (activeConversationId) {
        setActiveConversationId(null);
        setMessages([]);
      }
      toast.success('Conversation deleted');
    },
  });

  // Add message mutation
  const addMessageMutation = useMutation({
    mutationFn: ({
      conversationId,
      message,
    }: {
      conversationId: string;
      message: { role: 'user' | 'assistant'; content: string; sources?: ChatResponse['sources'] };
    }) => conversationsApi.addMessage(companyId!, conversationId, message),
  });

  // Load conversation when selected
  useEffect(() => {
    if (activeConversationId && companyId) {
      conversationsApi.get(companyId, activeConversationId).then((data) => {
        const loadedMessages: Message[] = data.conversation.messages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          sources: msg.sources,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(loadedMessages);
      });
    }
  }, [activeConversationId, companyId]);

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
      
      setMessages((prev) =>
        prev.map((msg, i) =>
          i === prev.length - 1 && msg.isStreaming
            ? { ...msg, isStreaming: false, content: msg.content + ' [Stopped]' }
            : msg
        )
      );
    }
  };

  const handleNewConversation = () => {
    if (!selectedProjectId) {
      toast.error('Please select a project first');
      return;
    }
    createConversationMutation.mutate({
      title: 'New Conversation',
      projectId: selectedProjectId,
    });
  };

  const handleSelectConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
  };

  const generateTitle = (query: string): string => {
    // Generate a title from the first user message
    const words = query.split(' ').slice(0, 6).join(' ');
    return words.length < query.length ? `${words}...` : words;
  };

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      const query = input.trim();
      if (!query || isLoading) return;

      // Validate projectId is selected
      if (!selectedProjectId) {
        toast.error('Please select a project first');
        return;
      }

      setInput('');
      setIsLoading(true);

      const userMessageId = `user-${Date.now()}`;
      const assistantMessageId = `assistant-${Date.now()}`;

      const userMessage: Message = {
        id: userMessageId,
        role: 'user',
        content: query,
        timestamp: new Date(),
      };

      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
        isThinking: true,
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);

      // Create conversation if not exists
      let conversationId = activeConversationId;
      if (!conversationId) {
        try {
          const result = await conversationsApi.create(companyId!, {
            title: generateTitle(query),
            projectId: selectedProjectId, // Required - validated above
          });
          conversationId = result.conversation._id;
          setActiveConversationId(conversationId);
          queryClient.invalidateQueries({ queryKey: ['conversations', companyId] });
        } catch (error) {
          console.error('Failed to create conversation:', error);
          toast.error('Failed to create conversation');
          setIsLoading(false);
          setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId));
          return;
        }
      }

      // Save user message to conversation
      try {
        await addMessageMutation.mutateAsync({
          conversationId,
          message: { role: 'user', content: query },
        });
      } catch (error) {
        console.error('Failed to save user message:', error);
      }

      // Build history from previous messages
      const history: ChatMessage[] = messages.slice(-10).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      let finalContent = '';
      let finalSources: ChatResponse['sources'] = [];

      try {
        const controller = chatApi.streamChat(
          companyId!,
          {
            query,
            projectId: selectedProjectId, // Required - validated above
            history,
            limit: 5,
          },
          (chunk) => {
            finalContent += chunk;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: msg.content + chunk, isThinking: false }
                  : msg
              )
            );
          },
          async (sources) => {
            finalSources = sources;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, isStreaming: false, isThinking: false, sources }
                  : msg
              )
            );
            setIsLoading(false);
            abortControllerRef.current = null;
            addActivity({ text: `Asked: "${query.slice(0, 50)}..."`, type: 'search' });

            // Save assistant message to conversation
            try {
              await addMessageMutation.mutateAsync({
                conversationId: conversationId!,
                message: {
                  role: 'assistant',
                  content: finalContent,
                  sources: finalSources,
                },
              });
            } catch (error) {
              console.error('Failed to save assistant message:', error);
            }
          },
          (error) => {
            console.error('Chat error:', error);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      isStreaming: false,
                      isThinking: false,
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
        setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId));
        setIsLoading(false);
        toast.error('Failed to send message');
      }
    },
    [input, isLoading, messages, companyId, selectedProjectId, activeConversationId, addActivity, addMessageMutation, queryClient]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const clearChat = async () => {
    if (activeConversationId) {
      try {
        await conversationsApi.clearMessages(companyId!, activeConversationId);
        setMessages([]);
        toast.success('Chat cleared');
      } catch {
        toast.error('Failed to clear chat');
      }
    } else {
    setMessages([]);
    toast.success('Chat cleared');
    }
  };

  const handleEditTitle = (id: string, currentTitle: string) => {
    setEditingTitle(id);
    setEditTitleValue(currentTitle);
  };

  const handleSaveTitle = () => {
    if (editingTitle && editTitleValue.trim()) {
      updateConversationMutation.mutate({ id: editingTitle, title: editTitleValue.trim() });
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Conversation Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-72' : 'w-0'
        } transition-all duration-300 overflow-hidden flex-shrink-0`}
      >
        <Card className="h-full flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <Button
              onClick={handleNewConversation}
              className="w-full"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              New Chat
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {conversationsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No conversations yet
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map((conv) => (
                  <div
                    key={conv._id}
                    className={`group relative rounded-lg transition-colors ${
                      activeConversationId === conv._id
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    {editingTitle === conv._id ? (
                      <div className="p-2">
                        <input
                          type="text"
                          value={editTitleValue}
                          onChange={(e) => setEditTitleValue(e.target.value)}
                          onBlur={handleSaveTitle}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveTitle();
                            if (e.key === 'Escape') setEditingTitle(null);
                          }}
                          className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => handleSelectConversation(conv._id)}
                        className="w-full p-3 text-left"
                      >
                        <div className="flex items-start gap-2">
                          <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p 
                              className="text-sm font-medium text-gray-900 truncate"
                              title={conv.title}
                            >
                              {conv.title}
                            </p>
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              {formatRelativeTime(new Date(conv.lastMessageAt))}
                            </p>
                          </div>
                        </div>
                      </button>
                    )}

                    {/* Conversation actions */}
                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTitle(conv._id, conv.title);
                        }}
                        className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                        title="Edit title"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this conversation?')) {
                            deleteConversationMutation.mutate(conv._id);
                          }
                        }}
                        className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Toggle Sidebar Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-1 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50"
        style={{ left: sidebarOpen ? '18rem' : '0.5rem' }}
      >
        {sidebarOpen ? (
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-600" />
        )}
      </button>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
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
          {/* Project Filter - REQUIRED */}
          <select
            value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setActiveConversationId(null);
                setMessages([]);
              }}
            className={`px-3 py-2 rounded-lg border ${
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
              {!selectedProjectId && (
                <div className="mt-4 px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 font-medium">
                    ⚠️ Please select a project from the dropdown above to start chatting
                  </p>
                </div>
              )}
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
                    {message.isThinking && message.content === '' ? (
                      <div className="flex items-center gap-2 text-gray-500">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-sm italic">Thinking...</span>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap break-words">
                        {message.content}
                        {message.isStreaming && !message.isThinking && (
                          <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
                        )}
                      </div>
                    )}

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
                                  <span 
                                    className="font-medium text-gray-700 truncate"
                                    title={source.fileName || 'Unknown file'}
                                  >
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
    </div>
  );
}
