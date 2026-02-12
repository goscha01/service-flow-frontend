"use client"
import React from 'react'

const MiniChart = ({ data, color = 'blue' }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-24 flex items-center justify-center">
        <p className="text-xs text-gray-400">No data</p>
      </div>
    )
  }

  const maxValue = Math.max(...data, 1)
  const minValue = Math.min(...data, 0)
  const range = maxValue - minValue || 1

  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    purple: 'bg-purple-600',
    orange: 'bg-orange-600',
    indigo: 'bg-indigo-600'
  }

  const bgColorClass = colorClasses[color] || colorClasses.blue

  return (
    <div className="h-24 flex items-end gap-0.5">
      {data.map((value, index) => {
        const height = maxValue > 0 ? ((value - minValue) / range) * 100 : 0
        return (
          <div
            key={index}
            className={`flex-1 ${bgColorClass} rounded-t transition-all duration-300`}
            style={{
              height: `${Math.max(height, 2)}%`,
              minHeight: value > 0 ? '4px' : '0px'
            }}
            title={`${value}`}
          />
        )
      })}
    </div>
  )
}

export default MiniChart

