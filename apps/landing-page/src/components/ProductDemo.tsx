import { motion } from 'framer-motion';
import { 
  Search, 
  FileText, 
  BarChart3, 
  Brain,
  Upload,
  CheckCircle2,
  Clock,
  TrendingUp,
  Sparkles,
  FolderOpen,
  MessageSquare
} from 'lucide-react';

const sidebarItems = [
  { icon: BarChart3, label: 'Dashboard', active: true },
  { icon: FileText, label: 'Documents', active: false },
  { icon: Search, label: 'Search', active: false },
  { icon: MessageSquare, label: 'Chat', active: false },
  { icon: Upload, label: 'Upload', active: false },
];

const recentDocuments = [
  { name: 'Q4 Financial Report.pdf', status: 'analyzed', time: '2 min ago' },
  { name: 'Contract_v2.docx', status: 'processing', time: '5 min ago' },
  { name: 'Research Notes.pdf', status: 'analyzed', time: '12 min ago' },
];

const insights = [
  { label: 'Key Entities', value: '247', trend: '+12%' },
  { label: 'Topics Found', value: '18', trend: '+5%' },
  { label: 'Avg. Confidence', value: '96.4%', trend: '+2.1%' },
];

export function ProductDemo() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.6 }}
      className="mt-20 relative"
    >
      <div className="relative rounded-2xl overflow-hidden glass p-1">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 via-transparent to-accent-500/20 pointer-events-none" />
        
        <div className="relative rounded-xl overflow-hidden bg-slate-900">
          {/* Window Chrome */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <div className="flex-1 max-w-md mx-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-700/50 border border-white/5">
                <Search className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs text-slate-500">Search documents, insights, or ask a question...</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex min-h-[400px] sm:min-h-[450px]">
            {/* Sidebar */}
            <div className="hidden sm:flex flex-col w-48 border-r border-white/5 bg-slate-800/30 p-3">
              <div className="flex items-center gap-2 px-3 py-2 mb-4">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-semibold text-white">NexusAI</span>
              </div>
              
              <nav className="space-y-1">
                {sidebarItems.map((item) => (
                  <div
                    key={item.label}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                      item.active 
                        ? 'bg-primary-500/20 text-white border border-primary-500/30' 
                        : 'text-slate-400 hover:bg-white/5'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                ))}
              </nav>

              <div className="mt-auto pt-4 border-t border-white/5">
                <div className="px-3 py-2">
                  <div className="text-xs text-slate-500 mb-1">Storage Used</div>
                  <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '68%' }}
                      transition={{ duration: 1, delay: 1 }}
                      className="h-full bg-gradient-to-r from-primary-500 to-accent-500"
                    />
                  </div>
                  <div className="text-xs text-slate-400 mt-1">6.8 GB / 10 GB</div>
                </div>
              </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 p-4 sm:p-6 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-white">Dashboard</h3>
                  <p className="text-xs text-slate-500">Welcome back! Here's your document overview.</p>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary-500 to-accent-500 text-white text-sm font-medium"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload
                </motion.button>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="p-3 sm:p-4 rounded-xl bg-slate-800/50 border border-white/5"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-primary-400" />
                    </div>
                    <span className="text-xs text-slate-500 hidden sm:block">Total Docs</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-white">1,247</div>
                  <div className="flex items-center gap-1 text-xs text-green-400 mt-1">
                    <TrendingUp className="w-3 h-3" />
                    <span>+23 this week</span>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  className="p-3 sm:p-4 rounded-xl bg-slate-800/50 border border-white/5"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-accent-500/20 flex items-center justify-center">
                      <Brain className="w-4 h-4 text-accent-400" />
                    </div>
                    <span className="text-xs text-slate-500 hidden sm:block">Analyzed</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-white">98.7%</div>
                  <div className="flex items-center gap-1 text-xs text-green-400 mt-1">
                    <TrendingUp className="w-3 h-3" />
                    <span>+2.1% accuracy</span>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 }}
                  className="p-3 sm:p-4 rounded-xl bg-slate-800/50 border border-white/5"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    </div>
                    <span className="text-xs text-slate-500 hidden sm:block">Processed</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-white">847</div>
                  <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                    <Clock className="w-3 h-3" />
                    <span>Last hour</span>
                  </div>
                </motion.div>
              </div>

              {/* Content Grid */}
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Recent Documents */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1 }}
                  className="p-4 rounded-xl bg-slate-800/50 border border-white/5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-primary-400" />
                      <span className="text-sm font-medium text-white">Recent Documents</span>
                    </div>
                    <span className="text-xs text-primary-400 cursor-pointer hover:underline">View all</span>
                  </div>
                  <div className="space-y-3">
                    {recentDocuments.map((doc, i) => (
                      <motion.div 
                        key={doc.name}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.2 + i * 0.1 }}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center">
                          <FileText className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white truncate">{doc.name}</div>
                          <div className="text-xs text-slate-500">{doc.time}</div>
                        </div>
                        <div className={`px-2 py-0.5 rounded-full text-xs ${
                          doc.status === 'analyzed' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {doc.status === 'analyzed' ? (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Done
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <motion.span 
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                className="w-3 h-3 border border-yellow-400 border-t-transparent rounded-full inline-block"
                              />
                              Processing
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* AI Insights */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 }}
                  className="p-4 rounded-xl bg-gradient-to-br from-primary-500/10 to-accent-500/10 border border-white/5"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-4 h-4 text-accent-400" />
                    <span className="text-sm font-medium text-white">AI Insights</span>
                  </div>
                  <div className="space-y-3">
                    {insights.map((insight, i) => (
                      <motion.div 
                        key={insight.label}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1.3 + i * 0.1 }}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50"
                      >
                        <span className="text-sm text-slate-400">{insight.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{insight.value}</span>
                          <span className="text-xs text-green-400">{insight.trend}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  
                  {/* Mini Chart */}
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-500">Processing Trend</span>
                      <span className="text-xs text-slate-500">Last 7 days</span>
                    </div>
                    <div className="flex items-end gap-1 h-12">
                      {[35, 52, 48, 65, 58, 78, 85].map((height, i) => (
                        <motion.div
                          key={i}
                          initial={{ height: 0 }}
                          animate={{ height: `${height}%` }}
                          transition={{ duration: 0.5, delay: 1.4 + i * 0.05 }}
                          className={`flex-1 rounded-t ${
                            i === 6 
                              ? 'bg-gradient-to-t from-primary-500 to-accent-500' 
                              : 'bg-slate-600/50'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Glow Effect */}
      <div className="absolute -inset-4 bg-gradient-to-r from-primary-500/20 via-accent-500/20 to-primary-500/20 blur-3xl -z-10" />
    </motion.div>
  );
}
