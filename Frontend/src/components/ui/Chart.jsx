import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';

// Advanced Chart Component
const Chart = ({
  data = [],
  type = 'line',
  width = '100%',
  height = 300,
  dataKey = 'value',
  xKey = 'name',
  colors = null,
  showGrid = true,
  showTooltip = true,
  showLegend = false,
  showXAxis = true,
  showYAxis = true,
  animate = true,
  gradient = false,
  strokeWidth = 2,
  margin = { top: 5, right: 30, left: 20, bottom: 5 },
  className = '',
  style = {},
  ...rest
}) => {
  const { theme, getPrimaryColorClasses } = useTheme();
  const primaryColors = getPrimaryColorClasses();
  const isDark = theme === 'dark';

  // Default color palette
  const defaultColors = useMemo(() => {
    if (colors) return colors;
    
    return isDark 
      ? ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16']
      : ['#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED', '#0891B2', '#EA580C', '#65A30D'];
  }, [colors, isDark]);

  // Chart theme configuration
  const chartTheme = useMemo(() => ({
    background: 'transparent',
    text: isDark ? '#E2E8F0' : '#374151',
    grid: isDark ? '#374151' : '#E5E7EB',
    axis: isDark ? '#6B7280' : '#9CA3AF',
  }), [isDark]);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;

    return (
      <div className={`
        bg-white dark:bg-slate-800 
        border border-gray-200 dark:border-slate-700 
        rounded-lg shadow-lg p-3
      `}>
        <p className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-2">
          {label}
        </p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600 dark:text-slate-400">
              {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Gradient definitions
  const renderGradients = () => {
    if (!gradient) return null;

    return (
      <defs>
        {defaultColors.map((color, index) => (
          <linearGradient key={index} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
            <stop offset="95%" stopColor={color} stopOpacity={0.1}/>
          </linearGradient>
        ))}
      </defs>
    );
  };

  // Line Chart
  const renderLineChart = () => (
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={data} margin={margin} {...rest}>
        {renderGradients()}
        {showGrid && (
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={chartTheme.grid}
            opacity={0.5}
          />
        )}
        {showXAxis && (
          <XAxis 
            dataKey={xKey}
            stroke={chartTheme.axis}
            fontSize={12}
            tick={{ fill: chartTheme.text }}
          />
        )}
        {showYAxis && (
          <YAxis 
            stroke={chartTheme.axis}
            fontSize={12}
            tick={{ fill: chartTheme.text }}
          />
        )}
        {showTooltip && <Tooltip content={<CustomTooltip />} />}
        {showLegend && <Legend />}
        
        {Array.isArray(dataKey) ? (
          dataKey.map((key, index) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={defaultColors[index % defaultColors.length]}
              strokeWidth={strokeWidth}
              dot={{ fill: defaultColors[index % defaultColors.length], strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, fill: defaultColors[index % defaultColors.length] }}
              animationDuration={animate ? 1000 : 0}
            />
          ))
        ) : (
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={defaultColors[0]}
            strokeWidth={strokeWidth}
            dot={{ fill: defaultColors[0], strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6, fill: defaultColors[0] }}
            animationDuration={animate ? 1000 : 0}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );

  // Area Chart
  const renderAreaChart = () => (
    <ResponsiveContainer width={width} height={height}>
      <AreaChart data={data} margin={margin} {...rest}>
        {renderGradients()}
        {showGrid && (
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={chartTheme.grid}
            opacity={0.5}
          />
        )}
        {showXAxis && (
          <XAxis 
            dataKey={xKey}
            stroke={chartTheme.axis}
            fontSize={12}
            tick={{ fill: chartTheme.text }}
          />
        )}
        {showYAxis && (
          <YAxis 
            stroke={chartTheme.axis}
            fontSize={12}
            tick={{ fill: chartTheme.text }}
          />
        )}
        {showTooltip && <Tooltip content={<CustomTooltip />} />}
        {showLegend && <Legend />}
        
        {Array.isArray(dataKey) ? (
          dataKey.map((key, index) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stackId="1"
              stroke={defaultColors[index % defaultColors.length]}
              fill={gradient ? `url(#gradient-${index})` : defaultColors[index % defaultColors.length]}
              strokeWidth={strokeWidth}
              animationDuration={animate ? 1000 : 0}
            />
          ))
        ) : (
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={defaultColors[0]}
            fill={gradient ? `url(#gradient-0)` : defaultColors[0]}
            strokeWidth={strokeWidth}
            animationDuration={animate ? 1000 : 0}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );

  // Bar Chart
  const renderBarChart = () => (
    <ResponsiveContainer width={width} height={height}>
      <BarChart data={data} margin={margin} {...rest}>
        {renderGradients()}
        {showGrid && (
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={chartTheme.grid}
            opacity={0.5}
          />
        )}
        {showXAxis && (
          <XAxis 
            dataKey={xKey}
            stroke={chartTheme.axis}
            fontSize={12}
            tick={{ fill: chartTheme.text }}
          />
        )}
        {showYAxis && (
          <YAxis 
            stroke={chartTheme.axis}
            fontSize={12}
            tick={{ fill: chartTheme.text }}
          />
        )}
        {showTooltip && <Tooltip content={<CustomTooltip />} />}
        {showLegend && <Legend />}
        
        {Array.isArray(dataKey) ? (
          dataKey.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              fill={gradient ? `url(#gradient-${index})` : defaultColors[index % defaultColors.length]}
              animationDuration={animate ? 1000 : 0}
              radius={[4, 4, 0, 0]}
            />
          ))
        ) : (
          <Bar
            dataKey={dataKey}
            fill={gradient ? `url(#gradient-0)` : defaultColors[0]}
            animationDuration={animate ? 1000 : 0}
            radius={[4, 4, 0, 0]}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  );

  // Pie Chart
  const renderPieChart = () => (
    <ResponsiveContainer width={width} height={height}>
      <PieChart {...rest}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey={dataKey}
          animationDuration={animate ? 1000 : 0}
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={defaultColors[index % defaultColors.length]} 
            />
          ))}
        </Pie>
        {showTooltip && <Tooltip content={<CustomTooltip />} />}
        {showLegend && <Legend />}
      </PieChart>
    </ResponsiveContainer>
  );

  // Radial Bar Chart
  const renderRadialBarChart = () => (
    <ResponsiveContainer width={width} height={height}>
      <RadialBarChart
        cx="50%"
        cy="50%"
        innerRadius="10%"
        outerRadius="80%"
        data={data}
        {...rest}
      >
        <RadialBar
          minAngle={15}
          label={{ position: 'insideStart', fill: '#fff' }}
          background
          clockWise
          dataKey={dataKey}
          animationDuration={animate ? 1000 : 0}
        />
        {showTooltip && <Tooltip content={<CustomTooltip />} />}
        {showLegend && <Legend />}
      </RadialBarChart>
    </ResponsiveContainer>
  );

  // Render chart based on type
  const renderChart = () => {
    switch (type) {
      case 'line':
        return renderLineChart();
      case 'area':
        return renderAreaChart();
      case 'bar':
        return renderBarChart();
      case 'pie':
        return renderPieChart();
      case 'radial':
        return renderRadialBarChart();
      default:
        return renderLineChart();
    }
  };

  return (
    <div className={`w-full ${className}`} style={style}>
      {renderChart()}
    </div>
  );
};

// Chart variants as separate components
export const LineChart = (props) => <Chart {...props} type="line" />;
export const AreaChart = (props) => <Chart {...props} type="area" />;
export const BarChart = (props) => <Chart {...props} type="bar" />;
export const PieChart = (props) => <Chart {...props} type="pie" />;
export const RadialChart = (props) => <Chart {...props} type="radial" />;

// Statistics Chart Component
export const StatsChart = ({ 
  title, 
  value, 
  trend, 
  trendValue, 
  data = [], 
  color = '#3B82F6',
  className = '',
  ...props 
}) => {
  const isPositiveTrend = trend === 'up' || trendValue > 0;
  
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">
            {title}
          </h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
        {(trend || trendValue !== undefined) && (
          <div className={`flex items-center text-sm ${
            isPositiveTrend 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-red-600 dark:text-red-400'
          }`}>
            <span className="mr-1">
              {isPositiveTrend ? '↗' : '↘'}
            </span>
            {trendValue !== undefined ? `${Math.abs(trendValue)}%` : trend}
          </div>
        )}
      </div>
      
      {data.length > 0 && (
        <Chart
          data={data}
          type="area"
          height={60}
          showGrid={false}
          showTooltip={false}
          showXAxis={false}
          showYAxis={false}
          colors={[color]}
          gradient
          strokeWidth={2}
          margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
          {...props}
        />
      )}
    </div>
  );
};

export default Chart;