import React from 'react'

const ResponsiveGrid = ({ 
  children, 
  cols = { sm: 1, md: 2, lg: 3, xl: 4, '2xl': 5 },
  gap = 'gap-4',
  className = ""
}) => {
  const getGridCols = () => {
    const colClasses = []
    
    if (cols.sm) colClasses.push(`grid-cols-${cols.sm}`)
    if (cols.md) colClasses.push(`md:grid-cols-${cols.md}`)
    if (cols.lg) colClasses.push(`lg:grid-cols-${cols.lg}`)
    if (cols.xl) colClasses.push(`xl:grid-cols-${cols.xl}`)
    if (cols['2xl']) colClasses.push(`2xl:grid-cols-${cols['2xl']}`)
    
    return colClasses.join(' ')
  }

  return (
    <div className={`grid ${getGridCols()} ${gap} ${className}`}>
      {children}
    </div>
  )
}

export const ResponsiveCard = ({ 
  children, 
  className = "",
  padding = "p-4 sm:p-6",
  hover = true
}) => {
  return (
    <div className={`
      bg-white rounded-lg border border-gray-200 shadow-sm
      ${hover ? 'hover:shadow-md' : ''}
      transition-shadow duration-200
      ${padding}
      ${className}
    `}>
      {children}
    </div>
  )
}

export const ResponsiveContainer = ({ 
  children, 
  maxWidth = 'max-w-7xl',
  padding = 'px-4 sm:px-6 lg:px-8',
  className = ""
}) => {
  return (
    <div className={`mx-auto ${maxWidth} ${padding} ${className}`}>
      {children}
    </div>
  )
}

export const ResponsiveSection = ({ 
  children, 
  title,
  subtitle,
  actions,
  className = ""
}) => {
  return (
    <section className={`mb-8 ${className}`}>
      {(title || subtitle || actions) && (
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              {title && (
                <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
              )}
              {subtitle && (
                <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
              )}
            </div>
            {actions && (
              <div className="mt-4 sm:mt-0">
                {actions}
              </div>
            )}
          </div>
        </div>
      )}
      {children}
    </section>
  )
}

export default ResponsiveGrid
