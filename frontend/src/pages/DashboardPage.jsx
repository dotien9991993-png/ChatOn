import React, { useState, useEffect, useRef } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  MessageSquare, Activity, ClipboardList, Mail, Users, UserPlus,
  Package, DollarSign, Bell, RefreshCw, TrendingUp, BarChart3,
  PieChart as PieChartIcon, UserCheck,
} from 'lucide-react';
import * as api from '../services/api';

const COLORS = ['#2563EB', '#60A5FA', '#22D3EE', '#f59e0b', '#8b5cf6', '#10b981'];
const STATUS_COLORS = { active: '#10b981', resolved: '#6b7280', spam: '#ef4444' };
const STATUS_LABELS = { active: 'Đang hoạt động', resolved: 'Đã xử lý', spam: 'Spam' };

/**
 * Count-up animation hook
 */
function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = 0;
    const startTime = Date.now();

    function tick() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + (target - start) * eased));
      if (progress < 1) {
        ref.current = requestAnimationFrame(tick);
      }
    }

    ref.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ref.current);
  }, [target, duration]);

  return value;
}

const COLOR_MAP = {
  blue:    { border: 'border-l-blue-500',    bg: 'bg-blue-50',    text: 'text-blue-500',    value: 'text-blue-600'    },
  emerald: { border: 'border-l-emerald-500',  bg: 'bg-emerald-50',  text: 'text-emerald-500',  value: 'text-emerald-600'  },
  amber:   { border: 'border-l-amber-500',   bg: 'bg-amber-50',   text: 'text-amber-500',   value: 'text-amber-600'   },
  cyan:    { border: 'border-l-cyan-500',    bg: 'bg-cyan-50',    text: 'text-cyan-500',    value: 'text-cyan-600'    },
  violet:  { border: 'border-l-violet-500',  bg: 'bg-violet-50',  text: 'text-violet-500',  value: 'text-violet-600'  },
  teal:    { border: 'border-l-teal-500',    bg: 'bg-teal-50',    text: 'text-teal-500',    value: 'text-teal-600'    },
  indigo:  { border: 'border-l-indigo-500',  bg: 'bg-indigo-50',  text: 'text-indigo-500',  value: 'text-indigo-600'  },
  green:   { border: 'border-l-green-500',   bg: 'bg-green-50',   text: 'text-green-500',   value: 'text-green-600'   },
  red:     { border: 'border-l-red-500',     bg: 'bg-red-50',     text: 'text-red-500',     value: 'text-red-600'     },
};

function StatCard({ label, value, icon: Icon, color = 'blue', suffix = '' }) {
  const animatedValue = useCountUp(value);
  const c = COLOR_MAP[color] || COLOR_MAP.blue;

  return (
    <div
      className={`bg-white border border-slate-200 border-l-4 ${c.border} rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-[18px] h-[18px] ${c.text}`} />
        </div>
        <div className="min-w-0">
          <p className="text-slate-500 text-xs font-medium uppercase tracking-wide truncate">
            {label}
          </p>
          <p className={`text-2xl font-bold ${c.value} mt-0.5`}>
            {suffix === 'đ' ? animatedValue.toLocaleString('vi-VN') : animatedValue.toLocaleString()}{suffix}
          </p>
        </div>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 shadow-lg rounded-lg px-3 py-2">
      <p className="text-xs text-slate-600 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs" style={{ color: p.color }}>
          {p.name}: <span className="font-semibold">{p.value?.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
}

function ChartCard({ title, icon: Icon, children }) {
  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [agents, setAgents] = useState([]);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [days]);

  async function loadData() {
    setLoading(true);
    try {
      const [statsRes, chartsRes, agentsRes] = await Promise.all([
        api.getDashboardStats(),
        api.getDashboardCharts(days),
        api.getDashboardAgents(),
      ]);
      setStats(statsRes);
      setCharts(chartsRes);
      setAgents(agentsRes);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading && !stats) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-slate-500 text-sm">Đang tải dashboard...</div>
      </div>
    );
  }

  const statusPieData = charts?.statusBreakdown
    ? Object.entries(charts.statusBreakdown).map(([key, val]) => ({
        name: STATUS_LABELS[key] || key,
        value: val,
        color: STATUS_COLORS[key] || '#6b7280',
      }))
    : [];

  const channelPieData = charts?.channelBreakdown
    ? Object.entries(charts.channelBreakdown).map(([key, val], i) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        value: val,
        color: COLORS[i % COLORS.length],
      }))
    : [];

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-500">Tổng quan hoạt động kinh doanh</p>
          </div>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-100 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Làm mới
          </button>
        </div>

        {/* Stat Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard label="Hội thoại"       value={stats.totalConversations}    icon={MessageSquare}  color="blue"    />
            <StatCard label="Đang hoạt động"   value={stats.activeConversations}   icon={Activity}       color="emerald" />
            <StatCard label="Chưa phân"        value={stats.unassignedConversations} icon={ClipboardList} color="amber"   />
            <StatCard label="Tin nhắn hôm nay" value={stats.messagesToday}         icon={Mail}           color="cyan"    />
            <StatCard label="Khách hàng"       value={stats.totalCustomers}        icon={Users}          color="violet"  />
            <StatCard label="KH mới hôm nay"   value={stats.newCustomersToday}     icon={UserPlus}       color="teal"    />
            <StatCard label="Tổng đơn hàng"    value={stats.totalOrders}           icon={Package}        color="indigo"  />
            <StatCard label="Doanh thu"        value={stats.totalRevenue}          icon={DollarSign}     color="green"   suffix="đ" />
            <StatCard label="Chưa đọc"         value={stats.totalUnread}           icon={Bell}           color="red"     />
          </div>
        )}

        {/* Charts */}
        {charts && (
          <>
            {/* Period selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Biểu đồ:</span>
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                    days === d
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {d} ngày
                </button>
              ))}
            </div>

            {/* Messages Chart */}
            <ChartCard title="Tin nhắn theo ngày" icon={TrendingUp}>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={charts.daily}>
                  <defs>
                    <linearGradient id="gradInbound" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradOutbound" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22D3EE" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="inbound" name="Khách gửi" stroke="#2563EB" fill="url(#gradInbound)" strokeWidth={2} />
                  <Area type="monotone" dataKey="outbound" name="Phản hồi" stroke="#22D3EE" fill="url(#gradOutbound)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Orders + Revenue Chart */}
            <ChartCard title="Đơn hàng & Doanh thu" icon={BarChart3}>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={charts.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="left" dataKey="orders" name="Đơn hàng" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="revenue" name="Doanh thu (đ)" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Pie Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Conversation Status */}
              <ChartCard title="Trạng thái hội thoại" icon={PieChartIcon}>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {statusPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Channel Breakdown */}
              <ChartCard title="Kênh chat" icon={MessageSquare}>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={channelPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {channelPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </>
        )}

        {/* Agent Performance */}
        {agents.length > 0 && (
          <ChartCard title="Hiệu suất nhân viên" icon={UserCheck}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 text-xs uppercase tracking-wide">
                    <th className="pb-3 pr-4">Nhân viên</th>
                    <th className="pb-3 pr-4">Trạng thái</th>
                    <th className="pb-3 pr-4">Vai trò</th>
                    <th className="pb-3 pr-4 text-center">Đang phụ trách</th>
                    <th className="pb-3 pr-4 text-center">Đã xử lý</th>
                    <th className="pb-3 text-center">Tin nhắn hôm nay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {agents.map((agent) => (
                    <tr key={agent.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-semibold">
                            {(agent.name || 'A')[0].toUpperCase()}
                          </div>
                          <span className="text-slate-700 font-medium">{agent.name}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center gap-1 text-xs ${agent.online ? 'text-green-600' : 'text-slate-500'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${agent.online ? 'bg-green-400' : 'bg-slate-400'}`} />
                          {agent.online ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          agent.role === 'owner' ? 'bg-amber-50 text-amber-600' :
                          agent.role === 'admin' ? 'bg-violet-50 text-violet-600' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {agent.role}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-center text-blue-600 font-medium">{agent.assignedConversations}</td>
                      <td className="py-3 pr-4 text-center text-green-600 font-medium">{agent.resolvedConversations}</td>
                      <td className="py-3 text-center text-slate-700">{agent.messagesToday}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        )}
      </div>
    </div>
  );
}
