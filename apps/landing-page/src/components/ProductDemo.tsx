import { motion } from 'framer-motion';
import { 
  Search, 
  FileText, 
  BarChart3, 
  Brain,
  Upload,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  FolderOpen
} from 'lucide-react';

const sidebarItems = [
  { icon: BarChart3, label: 'Dashboard', active: true },
  { icon: FileText, label: 'Documents', active: false },
  { icon: Search, label: 'Search', active: false },
  { icon: Upload, label: 'Upload', active: false },
];

const recentDocuments = [
  { name: 'Q4 Financial Report.pdf', status: 'analyzed', time: '2m ago' },
  { name: 'Contract_v2.docx', status: 'processing', time: '5m ago' },
  { name: 'Research Notes.pdf', status: 'analyzed', time: '12m ago' },
];

const insights = [
  { label: 'Key Entities', value: '247', trend: '+12%' },
  { label: 'Topics Found', value: '18', trend: '+5%' },
  { label: 'Confidence', value: '96.4%', trend: '+2%' },
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
            <div className="flex-1 max-w-md mx-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                <Search className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs text-slate-500">Search documents...</span>
              </div>
            </div>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
          </div>

          {/* Main Content */}
          <div className="flex min-h-[380px]">
            {/* Sidebar */}
            <div className="hidden sm:flex flex-col w-44 border-r border-white/[0.05] bg-slate-900/50 p-3">
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
                <div className="px-3 py-2">
                  <div className="text-xs text-slate-500 mb-2">Storage</div>
                  <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '68%' }}
                      transition={{ duration: 1, delay: 1 }}
                      className="h-full bg-gradient-to-r from-primary-500 to-primary-400"
                    />
                  </div>
                  <div className="text-xs text-slate-500 mt-1">6.8 / 10 GB</div>
                </div>
              </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 p-5 sm:p-6 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-semibold text-white">Dashboard</h3>
                  <p className="text-xs text-slate-500">Document overview</p>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-500 text-white text-sm font-medium"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload
                </motion.button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { icon: FileText, label: 'Documents', value: '1,247', trend: '+23', color: 'primary' },
                  { icon: Brain, label: 'Analyzed', value: '98.7%', trend: '+2.1%', color: 'accent' },
                  { icon: CheckCircle2, label: 'Processed', value: '847', trend: 'Last hour', color: 'green' },
                ].map((stat, i) => (
                  <motion.div 
                    key={stat.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 + i * 0.1 }}
                    className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        stat.color === 'primary' ? 'bg-primary-500/10' :
                        stat.color === 'accent' ? 'bg-accent-500/10' : 'bg-green-500/10'
                      }`}>
                        <stat.icon className={`w-3.5 h-3.5 ${
                          stat.color === 'primary' ? 'text-primary-400' :
                          stat.color === 'accent' ? 'text-accent-400' : 'text-green-400'
                        }`} />
                      </div>
                    </div>
                    <div className="text-xl font-bold text-white">{stat.value}</div>
                    <div className="flex items-center gap-1 text-xs text-green-400 mt-1">
                      <TrendingUp className="w-3 h-3" />
                      <span>{stat.trend}</span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Content Grid */}
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Recent Documents */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1 }}
                  className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <FolderOpen className="w-4 h-4 text-primary-400" />
                    <span className="text-sm font-medium text-white">Recent</span>
                  </div>
                  <div className="space-y-2">
                    {recentDocuments.map((doc, i) => (
                      <motion.div 
                        key={doc.name}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.2 + i * 0.1 }}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="w-7 h-7 rounded-lg bg-slate-800/50 flex items-center justify-center">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white truncate">{doc.name}</div>
                          <div className="text-xs text-slate-500">{doc.time}</div>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${
                          doc.status === 'analyzed' ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'
                        }`} />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* AI Insights */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 }}
                  className="p-4 rounded-xl bg-gradient-to-br from-primary-500/5 to-accent-500/5 border border-white/[0.05]"
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
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50"
                      >
                        <span className="text-sm text-slate-400">{insight.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">{insight.value}</span>
                          <span className="text-xs text-green-400">{insight.trend}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  
                  {/* Mini Chart */}
                  <div className="mt-4 pt-4 border-t border-white/[0.05]">
                    <div className="flex items-end gap-1 h-10">
                      {[35, 52, 48, 65, 58, 78, 85].map((height, i) => (
                        <motion.div
                          key={i}
                          initial={{ height: 0 }}
                          animate={{ height: `${height}%` }}
                          transition={{ duration: 0.5, delay: 1.4 + i * 0.05 }}
                          className={`flex-1 rounded-sm ${
                            i === 6 
                              ? 'bg-gradient-to-t from-primary-500 to-accent-500' 
                              : 'bg-slate-700/50'
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

      {/* Subtle glow */}
      <div className="absolute -inset-8 bg-gradient-to-r from-primary-500/10 via-accent-500/10 to-primary-500/10 blur-3xl -z-10 rounded-3xl opacity-50" />
    </motion.div>
  );
}
