import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
  Edit3,
  Clock,
  ChevronLeft,
  ChevronRight,
  Settings2,
  Zap,
  Brain,
  Gauge,
  X,
  ArrowRight,
  Wand2,
  ArrowDown,
  RotateCcw,
  ExternalLink,
  Loader2,
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
  type ChatSource,
  type ChatSearchMode,
  type PromptTemplateType,
  type ChatV2Response,
} from '@rag/api-client';
import { formatRelativeTime } from '@rag/utils';
import { useAuthStore } from '../../store/auth.store';
import { useAppStore } from '../../store/app.store';

// Source type for display (compatible with both conversation and chat sources)
interface MessageSource {
  content: string;
  score: number;
  fileName?: string;
  fileId?: string;
  projectName?: string;
  chunkIndex?: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: MessageSource[];
  timestamp: Date;
  isStreaming?: boolean;
  isThinking?: boolean;
  isTypingComplete?: boolean; // true when typing animation has finished
  responseTimeMs?: number;
  metadata?: {
    model?: string;
    provider?: string;
    usage?: ChatV2Response['usage'];
  };
}

// Search mode descriptions
const SEARCH_MODES: { value: ChatSearchMode; label: string; description: string; icon: React.ReactNode; color: string }[] = [
  {
    value: 'fast',
    label: 'Fast',
    description: 'Low latency',
    icon: <Zap className="w-4 h-4" />,
    color: 'amber',
  },
  {
    value: 'smart',
    label: 'Smart',
    description: 'Balanced',
    icon: <Brain className="w-4 h-4" />,
    color: 'primary',
  },
  {
    value: 'deep',
    label: 'Deep',
    description: 'High quality',
    icon: <Gauge className="w-4 h-4" />,
    color: 'emerald',
  },
];

// Prompt template options
const PROMPT_TEMPLATES: { value: PromptTemplateType | ''; label: string; description: string }[] = [
  { value: '', label: 'Default', description: 'Standard assistant' },
  { value: 'customer_support', label: 'Customer Support', description: 'Helpful and empathetic' },
  { value: 'sales_assistant', label: 'Sales Assistant', description: 'Sales-focused with lead generation' },
  { value: 'technical_support', label: 'Technical Support', description: 'Technical documentation helper' },
  { value: 'onboarding_assistant', label: 'Onboarding', description: 'New user guidance' },
  { value: 'faq_concise', label: 'FAQ Concise', description: 'Brief, FAQ-style answers' },
  { value: 'ecommerce_assistant', label: 'E-commerce', description: 'Product specialist' },
];

const SUGGESTION_PROMPTS = [
  { text: 'What are the key topics in my documents?', icon: '📚' },
  { text: 'Summarize the main points', icon: '📝' },
  { text: 'Find information about...', icon: '🔍' },
  { text: 'How does this compare to...', icon: '⚖️' },
];

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Markdown renderer - only used for completed messages
function MarkdownContent({ 
  content, 
  animate = false,
  onCitationClick 
}: { 
  content: string; 
  animate?: boolean;
  onCitationClick?: (index: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const renderMarkdown = useMemo(() => {
    let html = content;
    
    // Code blocks (```code```)
    html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      return `<pre class="my-3 p-4 bg-surface-900 text-surface-100 rounded-xl overflow-x-auto text-sm font-mono"><code class="language-${lang || 'text'}">${escapeHtml(code.trim())}</code></pre>`;
    });
    
    // Inline code (`code`)
    html = html.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-surface-100 text-primary-700 rounded text-sm font-mono">$1</code>');
    
    // Bold (**text** or __text__)
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>');
    html = html.replace(/__([^_]+)__/g, '<strong class="font-semibold">$1</strong>');
    
    // Italic (*text* or _text_)
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
    
    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>');
    
    // Unordered lists
    html = html.replace(/^[-*] (.+)$/gm, '<li class="ml-4 list-disc">$1</li>');
    
    // Ordered lists
    html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>');
    
    // Wrap consecutive list items
    html = html.replace(/(<li[^>]*>.*<\/li>\n?)+/g, '<ul class="my-2 space-y-1">$&</ul>');
    
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary-600 hover:text-primary-700 underline">$1</a>');
    
    // Citations [1], [2], etc. - make them clickable buttons
    html = html.replace(/\[(\d+)\]/g, '<button data-citation="$1" class="citation-link inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1 text-xs font-semibold text-primary-700 bg-primary-100 hover:bg-primary-200 rounded-md cursor-pointer transition-colors mx-0.5 align-baseline">[$1]</button>');
    
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    
    return html;
  }, [content]);

  // Handle citation clicks
  useEffect(() => {
    if (!containerRef.current || !onCitationClick) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('citation-link')) {
        const citationNum = target.getAttribute('data-citation');
        if (citationNum) {
          onCitationClick(parseInt(citationNum, 10) - 1); // Convert to 0-based index
        }
      }
    };

    containerRef.current.addEventListener('click', handleClick);
    return () => containerRef.current?.removeEventListener('click', handleClick);
  }, [onCitationClick]);

  return (
    <div 
      ref={containerRef}
      className={`prose prose-sm max-w-none leading-relaxed ${animate ? 'animate-fade-in' : ''}`}
      dangerouslySetInnerHTML={{ __html: renderMarkdown }}
    />
  );
}

// Streaming text component with typing animation effect like ChatGPT
function StreamingText({ 
  content, 
  isComplete,
  onTypingComplete 
}: { 
  content: string; 
  isComplete: boolean;
  onTypingComplete?: () => void;
}) {
  const [displayedLength, setDisplayedLength] = useState(0);
  const contentRef = useRef(content);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const hasCalledComplete = useRef(false);
  
  // Update content ref when content changes
  useEffect(() => {
    contentRef.current = content;
  }, [content]);
  
  // Typing animation loop
  useEffect(() => {
    const animate = (timestamp: number) => {
      // Control typing speed - characters per second
      const charsPerSecond = 100; // Adjust for desired speed
      const msPerChar = 1000 / charsPerSecond;
      
      if (timestamp - lastTimeRef.current >= msPerChar) {
        lastTimeRef.current = timestamp;
        
        setDisplayedLength(prev => {
          const targetLength = contentRef.current.length;
          if (prev < targetLength) {
            // Add 1-3 chars at a time for natural effect
            const increment = Math.floor(Math.random() * 3) + 1;
            return Math.min(prev + increment, targetLength);
          }
          return prev;
        });
      }
      
      rafRef.current = requestAnimationFrame(animate);
    };
    
    rafRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);
  
  // When streaming ends and typing catches up, notify parent
  useEffect(() => {
    if (isComplete && displayedLength >= content.length && !hasCalledComplete.current) {
      hasCalledComplete.current = true;
      // Small delay for visual smoothness
      setTimeout(() => {
        onTypingComplete?.();
      }, 100);
    }
  }, [isComplete, displayedLength, content.length, onTypingComplete]);
  
  // When streaming ends, catch up faster if behind
  useEffect(() => {
    if (isComplete && displayedLength < content.length) {
      const remaining = content.length - displayedLength;
      if (remaining > 50) {
        // Speed up to catch up
        const timer = setInterval(() => {
          setDisplayedLength(prev => {
            if (prev >= content.length) {
              clearInterval(timer);
              return prev;
            }
            return Math.min(prev + 10, content.length);
          });
        }, 16);
        return () => clearInterval(timer);
      }
    }
  }, [isComplete, content.length, displayedLength]);

  const showCursor = !isComplete || displayedLength < content.length;

  return (
    <div className="whitespace-pre-wrap break-words leading-relaxed">
      {content.slice(0, displayedLength)}
      {showCursor && (
        <span className="inline-block w-2 h-5 ml-0.5 bg-primary-500 rounded-sm animate-blink align-middle" />
      )}
    </div>
  );
}

// Animated typing indicator
function TypingIndicator() {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex items-center gap-1">
        <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-primary-400 to-primary-600 animate-pulse" style={{ animationDelay: '0ms' }} />
        <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-primary-400 to-primary-600 animate-pulse" style={{ animationDelay: '150ms' }} />
        <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-primary-400 to-primary-600 animate-pulse" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-sm text-surface-500 font-medium">
        <span className="inline-block animate-pulse">Thinking</span>
        <span className="inline-block ml-0.5 animate-bounce" style={{ animationDelay: '100ms' }}>.</span>
        <span className="inline-block animate-bounce" style={{ animationDelay: '200ms' }}>.</span>
        <span className="inline-block animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
      </span>
    </div>
  );
}

// Source card component
function SourceCard({ 
  source, 
  index,
  isHighlighted = false
}: { 
  source: MessageSource; 
  index: number;
  isHighlighted?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(isHighlighted);
  
  // Auto-expand when highlighted
  useEffect(() => {
    if (isHighlighted) {
      setIsExpanded(true);
    }
  }, [isHighlighted]);
  
  return (
    <div
      className={`group p-4 bg-gradient-to-br from-surface-50 to-white rounded-xl border transition-all duration-300 cursor-pointer ${
        isHighlighted 
          ? 'border-primary-400 ring-2 ring-primary-200 shadow-lg animate-pulse-soft' 
          : 'border-surface-200 hover:border-primary-200 hover:shadow-lg'
      }`}
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-primary-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p 
              className="font-medium text-surface-800 truncate text-sm"
              title={source.fileName || 'Unknown file'}
            >
              {source.fileName || 'Unknown file'}
            </p>
            {source.chunkIndex !== undefined && (
              <p className="text-xs text-surface-400">Chunk #{source.chunkIndex + 1}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            variant="default" 
            className={`text-xs font-semibold ${
              source.score >= 80 
                ? 'bg-emerald-100 text-emerald-700' 
                : source.score >= 60 
                  ? 'bg-amber-100 text-amber-700' 
                  : 'bg-surface-100 text-surface-600'
            }`}
          >
            {source.score.toFixed(0)}%
          </Badge>
          <ChevronDown 
            className={`w-4 h-4 text-surface-400 transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`} 
          />
        </div>
      </div>
      
      <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-48 mt-3' : 'max-h-0'}`}>
        <div className="pt-3 border-t border-surface-100">
          <p className="text-surface-600 text-sm leading-relaxed">
            {source.content}
          </p>
        </div>
      </div>
      
      {!isExpanded && (
        <p className="text-surface-500 text-xs line-clamp-2 mt-2 leading-relaxed">
          {source.content}
        </p>
      )}
    </div>
  );
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
  const [highlightedSource, setHighlightedSource] = useState<{ messageId: string; sourceIndex: number } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const sourceRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  // Advanced settings state
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [searchMode, setSearchMode] = useState<ChatSearchMode>('smart');
  const [promptTemplate, setPromptTemplate] = useState<PromptTemplateType | ''>('');
  const [customSystemPrompt, setCustomSystemPrompt] = useState('');
  const [contextLimit, setContextLimit] = useState(5);
  const [enableRerank, setEnableRerank] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const skipConversationLoadRef = useRef<boolean>(false);

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

  // Handle scroll to detect when to show scroll-to-bottom button
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom && messages.length > 0);
  }, [messages.length]);

  // Load conversation when selected
  useEffect(() => {
    if (activeConversationId && companyId) {
      if (skipConversationLoadRef.current) {
        skipConversationLoadRef.current = false;
        return;
      }
      
      setIsLoadingConversation(true);
      conversationsApi.get(companyId, activeConversationId)
        .then((data) => {
          const loadedMessages: Message[] = data.conversation.messages.map((msg) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            sources: msg.sources,
            timestamp: new Date(msg.timestamp),
            isTypingComplete: true, // Loaded messages should show immediately
          }));
          setMessages(loadedMessages);
          
          if (data.conversation.projectId && data.conversation.projectId !== selectedProjectId) {
            setSelectedProjectId(data.conversation.projectId);
          }
        })
        .catch((error) => {
          console.error('Failed to load conversation:', error);
          toast.error('Failed to load conversation');
        })
        .finally(() => {
          setIsLoadingConversation(false);
        });
    }
  }, [activeConversationId, companyId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCopy = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      toast.success('Copied to clipboard!', { duration: 1500 });
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
            ? { ...msg, isStreaming: false, content: msg.content + '\n\n*[Generation stopped]*' }
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
    if (conversationId === activeConversationId) {
      setIsLoadingConversation(true);
      conversationsApi.get(companyId!, conversationId)
        .then((data) => {
          const loadedMessages: Message[] = data.conversation.messages.map((msg) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            sources: msg.sources,
            timestamp: new Date(msg.timestamp),
            isTypingComplete: true, // Loaded messages should show immediately
          }));
          setMessages(loadedMessages);
        })
        .catch((error) => {
          console.error('Failed to load conversation:', error);
          toast.error('Failed to load conversation');
        })
        .finally(() => {
          setIsLoadingConversation(false);
        });
    } else {
      setActiveConversationId(conversationId);
    }
  };

  const generateTitle = (query: string): string => {
    const words = query.split(' ').slice(0, 6).join(' ');
    return words.length < query.length ? `${words}...` : words;
  };

  const handleRegenerate = useCallback(async () => {
    if (isLoading || messages.length < 2) return;
    
    // Find the last user message
    const lastUserMessageIndex = [...messages].reverse().findIndex(m => m.role === 'user');
    if (lastUserMessageIndex === -1) return;
    
    const actualIndex = messages.length - 1 - lastUserMessageIndex;
    const lastUserMessage = messages[actualIndex];
    
    // Remove the last assistant message(s) after the user message
    setMessages(prev => prev.slice(0, actualIndex + 1));
    
    // Resend the query
    setInput(lastUserMessage.content);
    setTimeout(() => {
      handleSubmit();
    }, 100);
  }, [messages, isLoading]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      const query = input.trim();
      if (!query || isLoading) return;

      if (!selectedProjectId) {
        toast.error('Please select a project first');
        return;
      }

      setInput('');
      setIsLoading(true);

      const userMessageId = `user-${Date.now()}`;
      const assistantMessageId = `assistant-${Date.now()}`;
      const startTime = performance.now();

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
        isTypingComplete: false,
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);

      let conversationId = activeConversationId;
      if (!conversationId) {
        try {
          const result = await conversationsApi.create(companyId!, {
            title: generateTitle(query),
            projectId: selectedProjectId,
          });
          conversationId = result.conversation._id;
          skipConversationLoadRef.current = true;
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

      try {
        await addMessageMutation.mutateAsync({
          conversationId,
          message: { role: 'user', content: query },
        });
      } catch (error) {
        console.error('Failed to save user message:', error);
      }

      const history: ChatMessage[] = messages.slice(-10).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      let finalContent = '';
      let finalSources: ChatSource[] = [];
      let finalMetadata: Message['metadata'] = {};

      try {
        const controller = chatApi.streamV2(
          companyId!,
          {
            query,
            projectId: selectedProjectId,
            messages: history,
            searchMode,
            promptTemplate: promptTemplate || undefined,
            systemPrompt: customSystemPrompt || undefined,
            limit: contextLimit,
            rerank: enableRerank,
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
          (sources) => {
            finalSources = sources;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, sources }
                  : msg
              )
            );
          },
          async (metadata) => {
            finalMetadata = metadata;
            const responseTimeMs = Math.round(performance.now() - startTime);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { 
                      ...msg, 
                      content: finalContent || msg.content,
                      sources: finalSources.length > 0 ? finalSources : msg.sources,
                      isStreaming: false, 
                      isThinking: false, 
                      metadata: finalMetadata, 
                      responseTimeMs 
                    }
                  : msg
              )
            );
            setIsLoading(false);
            abortControllerRef.current = null;
            addActivity({ text: `Asked: "${query.slice(0, 50)}..."`, type: 'search' });

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
                      content: `**Error:** ${error.message || 'Failed to get response'}. Please try again.`,
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
    [input, isLoading, messages, companyId, selectedProjectId, activeConversationId, addActivity, addMessageMutation, queryClient, searchMode, promptTemplate, customSystemPrompt, contextLimit, enableRerank]
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
    <div className="flex h-[calc(100vh-8rem)] gap-4 animate-fade-in">
      {/* Conversation Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-80' : 'w-0'
        } transition-all duration-300 overflow-hidden flex-shrink-0`}
      >
        <Card className="h-full flex flex-col border-0 shadow-soft bg-white/80 backdrop-blur-sm">
          <div className="p-4 border-b border-surface-100">
            <Button
              onClick={handleNewConversation}
              className="w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 shadow-md shadow-primary-500/20 group"
              disabled={createConversationMutation.isPending}
            >
              {createConversationMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
              )}
              New Conversation
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {conversationsLoading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <div className="relative">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-200 border-t-primary-600" />
                  <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-primary-500" />
                </div>
                <p className="text-sm text-surface-500">Loading chats...</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-surface-100 to-surface-200 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-7 h-7 text-surface-400" />
                </div>
                <p className="text-surface-600 font-medium">No conversations yet</p>
                <p className="text-surface-400 text-sm mt-1">Start a new chat to begin</p>
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conv, index) => (
                  <div
                    key={conv._id}
                    className={`group relative rounded-xl transition-all duration-200 animate-fade-up ${
                      activeConversationId === conv._id
                        ? 'bg-gradient-to-r from-primary-100 to-primary-50 border border-primary-200 shadow-sm'
                        : 'hover:bg-surface-50 border border-transparent'
                    }`}
                    style={{ animationDelay: `${index * 0.03}s` }}
                  >
                    {editingTitle === conv._id ? (
                      <div className="p-3">
                        <input
                          type="text"
                          value={editTitleValue}
                          onChange={(e) => setEditTitleValue(e.target.value)}
                          onBlur={handleSaveTitle}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveTitle();
                            if (e.key === 'Escape') setEditingTitle(null);
                          }}
                          className="w-full px-3 py-2 text-sm border-2 border-primary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => handleSelectConversation(conv._id)}
                        className="w-full p-3 text-left"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg transition-colors ${
                            activeConversationId === conv._id 
                              ? 'bg-primary-500 text-white' 
                              : 'bg-surface-100 text-surface-500 group-hover:bg-primary-100 group-hover:text-primary-600'
                          }`}>
                            <MessageSquare className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p 
                              className={`text-sm font-medium truncate ${
                                activeConversationId === conv._id ? 'text-primary-800' : 'text-surface-800'
                              }`}
                              title={conv.title}
                            >
                              {conv.title}
                            </p>
                            <p className="text-xs text-surface-400 flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              {formatRelativeTime(new Date(conv.lastMessageAt))}
                            </p>
                          </div>
                        </div>
                      </button>
                    )}

                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTitle(conv._id, conv.title);
                        }}
                        className="p-1.5 rounded-lg bg-white shadow-sm hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors"
                        title="Edit title"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this conversation?')) {
                            deleteConversationMutation.mutate(conv._id);
                          }
                        }}
                        className="p-1.5 rounded-lg bg-white shadow-sm hover:bg-red-50 text-surface-400 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white border border-surface-200 shadow-md hover:shadow-lg hover:border-primary-200 transition-all duration-200 group"
        style={{ left: sidebarOpen ? '21rem' : '0.5rem' }}
      >
        {sidebarOpen ? (
          <ChevronLeft className="w-4 h-4 text-surface-600 group-hover:text-primary-600 transition-colors" />
        ) : (
          <ChevronRight className="w-4 h-4 text-surface-600 group-hover:text-primary-600 transition-colors" />
        )}
      </button>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25 relative overflow-hidden group">
              <Bot className="w-6 h-6 relative z-10" />
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-surface-900 font-display">
                AI Assistant
              </h1>
              <p className="text-surface-500 text-sm">
                Chat with your documents using RAG
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Mode Pills */}
            <div className="flex items-center bg-surface-100 rounded-xl p-1 gap-1">
              {SEARCH_MODES.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setSearchMode(mode.value)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    searchMode === mode.value
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-surface-500 hover:text-surface-700'
                  }`}
                  title={mode.description}
                >
                  {mode.icon}
                  <span className="hidden sm:inline">{mode.label}</span>
                </button>
              ))}
            </div>

            {/* Advanced Settings */}
            <button
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              className={`p-2.5 rounded-xl border-2 transition-all duration-200 ${
                showAdvancedSettings
                  ? 'bg-primary-50 border-primary-300 text-primary-600'
                  : 'border-surface-200 text-surface-500 hover:border-surface-300 hover:bg-surface-50'
              }`}
              title="Advanced Settings"
            >
              <Settings2 className="w-5 h-5" />
            </button>

            {/* Project Selector */}
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setActiveConversationId(null);
                setMessages([]);
              }}
              className={`px-4 py-2.5 rounded-xl border-2 ${
                !selectedProjectId ? 'border-red-300 bg-red-50' : 'border-surface-200 bg-white'
              } text-sm font-medium focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 focus:outline-none transition-all`}
            >
              <option value="" disabled>Select project *</option>
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
                className="border-2 border-surface-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Advanced Settings Panel */}
        {showAdvancedSettings && (
          <Card className="mb-4 border-2 border-primary-200 bg-gradient-to-r from-primary-50/50 via-white to-accent-50/50 animate-scale-in overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-surface-900 flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-primary-600" />
                  Advanced Settings
                </h3>
                <button
                  onClick={() => setShowAdvancedSettings(false)}
                  className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Prompt Template */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Assistant Persona
                  </label>
                  <select
                    value={promptTemplate}
                    onChange={(e) => setPromptTemplate(e.target.value as PromptTemplateType | '')}
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-surface-200 text-sm focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 focus:outline-none bg-white transition-all"
                  >
                    {PROMPT_TEMPLATES.map((template) => (
                      <option key={template.value} value={template.value}>
                        {template.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-surface-500 mt-1.5">
                    {PROMPT_TEMPLATES.find((t) => t.value === promptTemplate)?.description}
                  </p>
                </div>

                {/* Context Limit */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Context Chunks: <span className="text-primary-600 font-bold">{contextLimit}</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={contextLimit}
                    onChange={(e) => setContextLimit(parseInt(e.target.value))}
                    className="w-full h-2 bg-surface-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                  />
                  <div className="flex justify-between text-xs text-surface-400 mt-1.5">
                    <span>Faster</span>
                    <span>More context</span>
                  </div>
                </div>

                {/* Rerank Toggle */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Result Reranking
                  </label>
                  <button
                    onClick={() => setEnableRerank(!enableRerank)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border-2 transition-all ${
                      enableRerank
                        ? 'bg-primary-50 border-primary-200 text-primary-700'
                        : 'bg-surface-50 border-surface-200 text-surface-600'
                    }`}
                  >
                    <span className="text-sm font-medium">
                      {enableRerank ? 'Enabled' : 'Disabled'}
                    </span>
                    <div
                      className={`w-11 h-6 rounded-full relative transition-colors ${
                        enableRerank ? 'bg-primary-500' : 'bg-surface-300'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          enableRerank ? 'left-6' : 'left-1'
                        }`}
                      />
                    </div>
                  </button>
                </div>
              </div>

              {/* Custom System Prompt */}
              <div className="mt-5">
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  Custom System Prompt <span className="text-surface-400">(optional)</span>
                </label>
                <textarea
                  value={customSystemPrompt}
                  onChange={(e) => setCustomSystemPrompt(e.target.value)}
                  placeholder="Enter a custom instruction to guide the AI's behavior..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border-2 border-surface-200 text-sm focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 focus:outline-none resize-none transition-all"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chat Container */}
        <Card className="flex-1 flex flex-col overflow-hidden border-0 shadow-soft bg-white/90 backdrop-blur-sm relative">
          <CardContent 
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
          >
            {isLoadingConversation ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-3 border-primary-200 border-t-primary-600" />
                  <div className="absolute inset-2 rounded-full bg-primary-100 animate-pulse" />
                </div>
                <p className="text-surface-500 mt-4 font-medium">Loading conversation...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center animate-fade-up">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary-100 via-primary-200 to-accent-100 flex items-center justify-center mb-6 animate-float shadow-lg shadow-primary-200/50">
                  <Sparkles className="w-12 h-12 text-primary-600" />
                </div>
                <h3 className="text-2xl font-bold text-surface-900 mb-3 font-display">
                  Ready to explore your knowledge
                </h3>
                <p className="text-surface-500 max-w-md mb-8 leading-relaxed">
                  Ask questions about your documents. The AI will search through your
                  uploaded files and provide relevant answers with sources.
                </p>
                
                {!selectedProjectId && (
                  <div className="px-5 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl mb-8 animate-pulse">
                    <p className="text-sm text-amber-800 font-medium flex items-center gap-2">
                      <Zap className="w-5 h-5 text-amber-500" />
                      Select a project above to start chatting
                    </p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl w-full">
                  {SUGGESTION_PROMPTS.map((suggestion, index) => (
                    <button
                      key={suggestion.text}
                      onClick={() => {
                        setInput(suggestion.text);
                        inputRef.current?.focus();
                      }}
                      className="group px-5 py-4 text-left bg-white hover:bg-gradient-to-r hover:from-primary-50 hover:to-white rounded-2xl border-2 border-surface-100 hover:border-primary-200 transition-all duration-300 animate-fade-up shadow-sm hover:shadow-md"
                      style={{ animationDelay: `${0.2 + index * 0.1}s` }}
                    >
                      <span className="flex items-center gap-3">
                        <span className="text-2xl group-hover:scale-110 transition-transform duration-200">{suggestion.icon}</span>
                        <span className="text-surface-700 group-hover:text-primary-700 font-medium transition-colors">
                          {suggestion.text}
                        </span>
                      </span>
                      <ArrowRight className="w-4 h-4 text-primary-400 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all absolute right-4 top-1/2 -translate-y-1/2" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`flex gap-4 animate-fade-up ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                    style={{ animationDelay: `${index * 0.03}s` }}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-primary-500/20">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                    )}

                    <div
                      className={`max-w-[75%] ${
                        message.role === 'user'
                          ? 'chat-bubble-user'
                          : 'chat-bubble-assistant'
                      }`}
                    >
                      {message.isThinking && message.content === '' ? (
                        <TypingIndicator />
                      ) : (
                        <div className="leading-relaxed">
                          {message.role === 'assistant' ? (
                            // Show typing animation while streaming, markdown only when typing is complete
                            message.isStreaming || (message.isTypingComplete === false) ? (
                              <StreamingText 
                                content={message.content} 
                                isComplete={!message.isStreaming}
                                onTypingComplete={() => {
                                  // Mark this message's typing as complete
                                  setMessages(prev => 
                                    prev.map(m => 
                                      m.id === message.id 
                                        ? { ...m, isTypingComplete: true } 
                                        : m
                                    )
                                  );
                                }}
                              />
                            ) : (
                              <MarkdownContent 
                                content={message.content} 
                                animate 
                                onCitationClick={(sourceIndex) => {
                                  // Expand sources if not already shown
                                  setShowSources(message.id);
                                  // Highlight the clicked source
                                  setHighlightedSource({ messageId: message.id, sourceIndex });
                                  // Scroll to source after a short delay to allow expansion
                                  setTimeout(() => {
                                    const sourceEl = sourceRefs.current.get(`${message.id}-${sourceIndex}`);
                                    if (sourceEl) {
                                      sourceEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    }
                                  }, 100);
                                  // Clear highlight after 3 seconds
                                  setTimeout(() => setHighlightedSource(null), 3000);
                                }}
                              />
                            )
                          ) : (
                            <div className="whitespace-pre-wrap break-words">
                              {message.content}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Sources */}
                      {message.sources && message.sources.length > 0 && !message.isStreaming && (
                        <div className="mt-4 pt-4 border-t border-surface-200/50">
                          <button
                            onClick={() =>
                              setShowSources(
                                showSources === message.id ? null : message.id
                              )
                            }
                            className="flex items-center gap-2 text-sm text-surface-500 hover:text-primary-600 transition-colors font-medium group"
                          >
                            <FileText className="w-4 h-4" />
                            <span>
                              {message.sources.length} source{message.sources.length !== 1 ? 's' : ''} found
                            </span>
                            <ChevronDown
                              className={`w-4 h-4 transition-transform duration-200 ${
                                showSources === message.id ? 'rotate-180' : ''
                              }`}
                            />
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>

                          {showSources === message.id && (
                            <div className="mt-4 space-y-3 animate-fade-up">
                              {message.sources.map((source, i) => {
                                const refKey = `${message.id}-${i}`;
                                return (
                                  <div 
                                    key={i}
                                    ref={(el) => {
                                      if (el) sourceRefs.current.set(refKey, el);
                                      else sourceRefs.current.delete(refKey);
                                    }}
                                  >
                                    <SourceCard 
                                      source={source} 
                                      index={i}
                                      isHighlighted={highlightedSource?.messageId === message.id && highlightedSource?.sourceIndex === i}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Message metadata */}
                      <div className="flex items-center justify-between mt-3 pt-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className={`text-xs ${
                            message.role === 'user' ? 'text-white/70' : 'text-surface-400'
                          }`}>
                            {formatRelativeTime(message.timestamp)}
                          </span>
                          
                          {message.role === 'assistant' && message.responseTimeMs && !message.isStreaming && (
                            <span className="text-xs text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-full font-medium">
                              <Clock className="w-3 h-3" />
                              {message.responseTimeMs >= 1000 
                                ? `${(message.responseTimeMs / 1000).toFixed(1)}s`
                                : `${message.responseTimeMs}ms`
                              }
                            </span>
                          )}
                        </div>

                        {message.role === 'assistant' && !message.isStreaming && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleCopy(message.content, message.id)}
                              className={`p-2 rounded-lg transition-all ${
                                copiedId === message.id 
                                  ? 'bg-emerald-100 text-emerald-600' 
                                  : 'hover:bg-surface-100 text-surface-400 hover:text-surface-600'
                              }`}
                              title="Copy response"
                            >
                              {copiedId === message.id ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                            {index === messages.length - 1 && (
                              <button
                                onClick={handleRegenerate}
                                disabled={isLoading}
                                className="p-2 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors disabled:opacity-50"
                                title="Regenerate response"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {message.role === 'user' && (
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-surface-700 to-surface-800 flex items-center justify-center flex-shrink-0 shadow-md">
                        <User className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </CardContent>

          {/* Scroll to bottom button */}
          {showScrollButton && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-24 right-6 p-3 rounded-full bg-white border-2 border-surface-200 shadow-lg hover:shadow-xl hover:border-primary-200 transition-all duration-200 animate-fade-up z-10 group"
            >
              <ArrowDown className="w-5 h-5 text-surface-600 group-hover:text-primary-600 transition-colors" />
            </button>
          )}

          {/* Input Area */}
          <div className="border-t border-surface-100 p-4 bg-gradient-to-r from-surface-50 to-white">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <div className={`flex-1 relative rounded-2xl transition-all duration-200 ${
                inputFocused ? 'ring-4 ring-primary-500/10' : ''
              }`}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  placeholder={selectedProjectId ? "Ask a question about your documents..." : "Select a project to start..."}
                  rows={1}
                  className={`w-full px-5 py-4 pr-14 rounded-2xl border-2 bg-white resize-none focus:outline-none transition-all disabled:bg-surface-50 disabled:text-surface-400 ${
                    inputFocused ? 'border-primary-400' : 'border-surface-200'
                  }`}
                  style={{
                    minHeight: '56px',
                    maxHeight: '160px',
                  }}
                  disabled={isLoading || !selectedProjectId}
                />
                {input.length > 0 && (
                  <span className="absolute right-4 bottom-2 text-xs text-surface-400">
                    {input.length}/2000
                  </span>
                )}
              </div>

              {isLoading ? (
                <button
                  type="button"
                  onClick={handleStopGeneration}
                  className="px-5 py-4 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/25 transition-all duration-200 group"
                >
                  <StopCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim() || !selectedProjectId}
                  className="px-5 py-4 rounded-2xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white shadow-lg shadow-primary-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-200 group"
                >
                  <Send className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              )}
            </form>
            
            <div className="flex items-center justify-center gap-4 mt-3 text-xs text-surface-400">
              <span className="flex items-center gap-1.5">
                <kbd className="px-2 py-1 bg-surface-100 rounded-md text-[10px] font-mono font-medium border border-surface-200">Enter</kbd>
                <span>to send</span>
              </span>
              <span className="w-1 h-1 rounded-full bg-surface-300" />
              <span className="flex items-center gap-1.5">
                <kbd className="px-2 py-1 bg-surface-100 rounded-md text-[10px] font-mono font-medium border border-surface-200">Shift + Enter</kbd>
                <span>new line</span>
              </span>
              <span className="w-1 h-1 rounded-full bg-surface-300" />
              <span className="flex items-center gap-1.5">
                {SEARCH_MODES.find((m) => m.value === searchMode)?.icon}
                {SEARCH_MODES.find((m) => m.value === searchMode)?.label} mode
              </span>
              {promptTemplate && (
                <>
                  <span className="w-1 h-1 rounded-full bg-surface-300" />
                  <span className="flex items-center gap-1">
                    <Wand2 className="w-3 h-3" />
                    {PROMPT_TEMPLATES.find((t) => t.value === promptTemplate)?.label}
                  </span>
                </>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
