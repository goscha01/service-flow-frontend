import React from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

export const RevenueChart = ({ data, type = 'line' }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No revenue data available
      </div>
    )
  }

  const ChartComponent = type === 'area' ? AreaChart : LineChart
  const DataComponent = type === 'area' ? Area : Line

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ChartComponent data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis 
          dataKey="date" 
          stroke="#6B7280"
          tick={{ fill: '#6B7280', fontSize: 12 }}
          tickFormatter={(value) => {
            const date = new Date(value)
            return `${date.getMonth() + 1}/${date.getDate()}`
          }}
        />
        <YAxis 
          stroke="#6B7280"
          tick={{ fill: '#6B7280', fontSize: 12 }}
          tickFormatter={(value) => `$${value.toLocaleString()}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
          formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']}
          labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString()}`}
        />
        <Legend />
        <DataComponent
          type="monotone"
          dataKey="revenue"
          stroke="#3B82F6"
          fill="#3B82F6"
          fillOpacity={type === 'area' ? 0.6 : 1}
          strokeWidth={2}
          dot={{ fill: '#3B82F6', r: 4 }}
        />
      </ChartComponent>
    </ResponsiveContainer>
  )
}

export const JobStatusChart = ({ data }) => {
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No job data available
      </div>
    )
  }

  const chartData = Object.entries(data)
    .map(([name, value]) => ({
      name: name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value,
      originalKey: name
    }))
    .filter(item => item.value > 0) // Only show statuses with jobs
    .sort((a, b) => b.value - a.value) // Sort by value descending

  // Map status colors
  const getStatusColor = (statusKey) => {
    const status = statusKey.toLowerCase()
    if (status === 'completed') return '#10B981' // green
    if (status === 'pending') return '#F59E0B' // yellow
    if (status === 'in_progress') return '#3B82F6' // blue
    if (status === 'confirmed') return '#8B5CF6' // purple
    if (status === 'cancelled') return '#EF4444' // red
    return '#6B7280' // gray
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent, value }) => {
              // Only show label if percentage is significant (>5%)
              if (percent < 0.05) return ''
              return `${(percent * 100).toFixed(0)}%`
            }}
            outerRadius={90}
            innerRadius={40}
            fill="#8884d8"
            dataKey="value"
            paddingAngle={2}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={getStatusColor(entry.originalKey)} 
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              padding: '8px 12px'
            }}
            formatter={(value, name) => [value, name]}
          />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Custom Legend */}
      <div className="mt-4 space-y-2">
        {chartData.map((entry, index) => (
          <div key={index} className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getStatusColor(entry.originalKey) }}
              />
              <span className="text-gray-700 font-medium">{entry.name}</span>
            </div>
            <div className="text-right">
              <span className="text-gray-900 font-semibold">{entry.value}</span>
              <span className="text-gray-500 ml-1">
                ({((entry.value / chartData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export const BarChartComponent = ({ data, dataKey, nameKey = 'name' }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis 
          dataKey={nameKey}
          stroke="#6B7280"
          tick={{ fill: '#6B7280', fontSize: 12 }}
        />
        <YAxis 
          stroke="#6B7280"
          tick={{ fill: '#6B7280', fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #E5E7EB',
            borderRadius: '8px'
          }}
        />
        <Legend />
        <Bar dataKey={dataKey} fill="#3B82F6" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export const MultiLineChart = ({ data, dataKeys, colors = COLORS }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis 
          dataKey="date"
          stroke="#6B7280"
          tick={{ fill: '#6B7280', fontSize: 12 }}
        />
        <YAxis 
          stroke="#6B7280"
          tick={{ fill: '#6B7280', fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #E5E7EB',
            borderRadius: '8px'
          }}
        />
        <Legend />
        {dataKeys.map((key, index) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={colors[index % colors.length]}
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

