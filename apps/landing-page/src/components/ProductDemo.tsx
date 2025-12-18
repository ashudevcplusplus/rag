import { motion } from 'framer-motion';
import { 
  Bot, 
  FileText, 
  Settings,
  Upload,
  MessageSquare,
  Sparkles,
  ChevronDown,
  Send
} from 'lucide-react';

const sidebarItems = [
  { icon: Bot, label: 'Chatbots', active: true },
  { icon: FileText, label: 'Knowledge', active: false },
  { icon: Settings, label: 'Settings', active: false },
];

const chatbots = [
  { name: 'Customer Support', status: 'active', messages: '12.4k' },
  { name: 'Sales Assistant', status: 'active', messages: '8.2k' },
  { name: 'Docs Helper', status: 'training', messages: '—' },
];

export function ProductDemo() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.6 }}
      className="mt-16 sm:mt-20 relative"
    >
      <div className="relative rounded-2xl overflow-hidden border border-white/[0.08]">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-accent-500/5 pointer-events-none" />
        
        <div className="relative rounded-2xl overflow-hidden bg-slate-900/80 backdrop-blur-xl">
          {/* Window Chrome */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-b border-white/[0.05]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-white/10" />
              <div className="w-3 h-3 rounded-full bg-white/10" />
              <div className="w-3 h-3 rounded-full bg-white/10" />
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
              <Bot className="w-3.5 h-3.5 text-primary-400" />
              <span className="text-xs text-slate-400">NexusAI Dashboard</span>
            </div>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
          </div>

          {/* Main Content */}
          <div className="flex min-h-[420px]">
            {/* Sidebar */}
            <div className="hidden sm:flex flex-col w-48 border-r border-white/[0.05] bg-slate-900/50 p-3">
              <div className="flex items-center gap-2 px-3 py-2 mb-4">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-semibold text-white">NexusAI</span>
              </div>
              
              <nav className="space-y-1">
                {sidebarItems.map((item) => (
                  <div
                    key={item.label}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      item.active 
                        ? 'bg-primary-500/10 text-white border border-primary-500/20' 
                        : 'text-slate-400'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                ))}
              </nav>

              <div className="mt-auto pt-4 border-t border-white/[0.05]">
                <button className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium">
                  <Upload className="w-3.5 h-3.5" />
                  New Chatbot
                </button>
              </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 p-5 sm:p-6 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-semibold text-white">Your Chatbots</h3>
                  <p className="text-xs text-slate-500">3 chatbots, 2 active</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] text-xs text-slate-400">
                    <Settings className="w-3 h-3" />
                    Config
                  </button>
                </div>
              </div>

              {/* Chatbot List */}
              <div className="space-y-3 mb-6">
                {chatbots.map((bot, i) => (
                  <motion.div 
                    key={bot.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + i * 0.1 }}
                    className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.03] transition-colors cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-primary-400" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-white text-sm">{bot.name}</div>
                      <div className="text-xs text-slate-500">{bot.messages} messages</div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs ${
                      bot.status === 'active' 
                        ? 'bg-green-500/10 text-green-400' 
                        : 'bg-yellow-500/10 text-yellow-400'
                    }`}>
                      {bot.status}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Config Preview */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1 }}
                className="p-4 rounded-xl bg-gradient-to-br from-primary-500/5 to-accent-500/5 border border-white/[0.05]"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-primary-400" />
                    <span className="text-sm font-medium text-white">Configuration</span>
                  </div>
                  <span className="text-xs text-slate-500">Customer Support</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-slate-900/50">
                    <div className="text-xs text-slate-500 mb-1">LLM Model</div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white">GPT-4 Turbo</span>
                      <ChevronDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/50">
                    <div className="text-xs text-slate-500 mb-1">Embeddings</div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white">text-embedding-3</span>
                      <ChevronDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/50">
                    <div className="text-xs text-slate-500 mb-1">Chunk Size</div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white">512 tokens</span>
                      <ChevronDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/50">
                    <div className="text-xs text-slate-500 mb-1">Overlap</div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white">50 tokens</span>
                      <ChevronDown className="w-3 h-3 text-slate-500" />
                    </div>
                  </div>
                </div>

                {/* Chat Preview */}
                <div className="mt-4 pt-4 border-t border-white/[0.05]">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50">
                    <div className="flex-1">
                      <input 
                        type="text" 
                        placeholder="Test your chatbot..." 
                        className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
                        readOnly
                      />
                    </div>
                    <button className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
                      <Send className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Subtle glow */}
      <div className="absolute -inset-8 bg-gradient-to-r from-primary-500/10 via-accent-500/10 to-primary-500/10 blur-3xl -z-10 rounded-3xl opacity-50" />
    </motion.div>
  );
}
