import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import dayjs from 'dayjs';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const SfDatePicker = ({ value, onChange, placeholder = 'mm/dd/yyyy', className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? dayjs(value) : dayjs());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const popupRef = useRef(null);

  const updatePosition = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const popupWidth = 352;
      let left = rect.left;
      if (left + popupWidth > window.innerWidth - 8) {
        left = window.innerWidth - popupWidth - 8;
      }
      setPopupPos({ top: rect.bottom + 4, left });
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target) &&
        popupRef.current && !popupRef.current.contains(e.target)
      ) {
        setIsOpen(false);
        setShowMonthPicker(false);
        setShowYearPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (value) setCurrentMonth(dayjs(value));
  }, [value]);

  useEffect(() => {
    if (isOpen) updatePosition();
  }, [isOpen, updatePosition]);

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = () => {
    const startDay = currentMonth.startOf('month').day();
    const daysInMonth = currentMonth.daysInMonth();
    const days = [];
    const prevMonth = currentMonth.subtract(1, 'month');
    const prevDaysInMonth = prevMonth.daysInMonth();

    for (let i = startDay - 1; i >= 0; i--) {
      days.push({ date: prevMonth.date(prevDaysInMonth - i), isCurrentMonth: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: currentMonth.date(i), isCurrentMonth: true });
    }
    const totalRows = Math.ceil(days.length / 7);
    const remaining = (totalRows * 7) - days.length;
    const nextMonth = currentMonth.add(1, 'month');
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: nextMonth.date(i), isCurrentMonth: false });
    }
    return days;
  };

  const isToday = (date) => date.isSame(dayjs(), 'day');
  const isSelected = (date) => value && date.format('YYYY-MM-DD') === value;
  const displayValue = value ? dayjs(value).format('MM/DD/YYYY') : '';

  const currentYear = currentMonth.year();
  const yearStart = currentYear - 6;
  const years = Array.from({ length: 13 }, (_, i) => yearStart + i);

  const handleMonthSelect = (monthIndex) => {
    setCurrentMonth(currentMonth.month(monthIndex));
    setShowMonthPicker(false);
  };

  const handleYearSelect = (year) => {
    setCurrentMonth(currentMonth.year(year));
    setShowYearPicker(false);
  };

  const renderCalendarView = () => {
    if (showMonthPicker) {
      return (
        <div className="sf-datepicker-grid-picker">
          {MONTHS.map((m, i) => (
            <button
              key={m}
              type="button"
              onClick={() => handleMonthSelect(i)}
              className={`sf-datepicker-grid-item ${currentMonth.month() === i ? 'selected' : ''}`}
            >
              {m}
            </button>
          ))}
        </div>
      );
    }

    if (showYearPicker) {
      return (
        <div className="sf-datepicker-grid-picker">
          {years.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => handleYearSelect(y)}
              className={`sf-datepicker-grid-item ${currentMonth.year() === y ? 'selected' : ''}`}
            >
              {y}
            </button>
          ))}
        </div>
      );
    }

    return (
      <div className="sf-datepicker-body">
        <div className="sf-datepicker-weekdays">
          {daysOfWeek.map((day) => (
            <div key={day} className="sf-datepicker-weekday">{day}</div>
          ))}
        </div>
        {(() => {
          const allDays = getDaysInMonth();
          const weeks = [];
          for (let i = 0; i < allDays.length; i += 7) {
            weeks.push(allDays.slice(i, i + 7));
          }
          return weeks.map((week, wi) => (
            <div key={wi} className="sf-datepicker-week">
              {week.map((day, di) => {
                const selected = isSelected(day.date);
                const today = isToday(day.date) && day.isCurrentMonth;
                return (
                  <div key={di} className="sf-datepicker-day-cell">
                    <button
                      type="button"
                      onClick={() => {
                        onChange(day.date.format('YYYY-MM-DD'));
                        setIsOpen(false);
                      }}
                      className={`sf-datepicker-day ${selected ? 'selected' : ''} ${today && !selected ? 'today' : ''} ${!day.isCurrentMonth ? 'outside' : ''}`}
                    >
                      {day.date.date()}
                    </button>
                  </div>
                );
              })}
            </div>
          ));
        })()}
      </div>
    );
  };

  return (
    <div className="relative" ref={containerRef}>
      <input
        ref={inputRef}
        type="text"
        readOnly
        value={displayValue}
        placeholder={placeholder}
        onClick={() => setIsOpen(!isOpen)}
        className={`cursor-pointer ${className}`}
      />

      {isOpen && createPortal(
        <div ref={popupRef} className="sf-datepicker-popup" style={{ position: 'fixed', top: popupPos.top, left: popupPos.left }}>
          {/* Header */}
          <div className="sf-datepicker-header">
            <button type="button" onClick={() => {
              if (showYearPicker) {
                // Shift year range back
                setCurrentMonth(currentMonth.subtract(13, 'year'));
              } else {
                setCurrentMonth(currentMonth.subtract(1, 'month'));
              }
            }} className="sf-datepicker-nav">
              <ChevronLeft />
            </button>
            <div className="sf-datepicker-month-year">
              <button
                type="button"
                className={`sf-datepicker-btn ${showMonthPicker ? 'active' : ''}`}
                onClick={() => { setShowMonthPicker(!showMonthPicker); setShowYearPicker(false); }}
              >
                {currentMonth.format('MMMM')}
              </button>
              <button
                type="button"
                className={`sf-datepicker-btn ${showYearPicker ? 'active' : ''}`}
                onClick={() => { setShowYearPicker(!showYearPicker); setShowMonthPicker(false); }}
              >
                {currentMonth.format('YYYY')}
              </button>
            </div>
            <button type="button" onClick={() => {
              if (showYearPicker) {
                setCurrentMonth(currentMonth.add(13, 'year'));
              } else {
                setCurrentMonth(currentMonth.add(1, 'month'));
              }
            }} className="sf-datepicker-nav">
              <ChevronRight />
            </button>
          </div>

          {/* Body — calendar, month picker, or year picker */}
          {renderCalendarView()}

          {/* Footer */}
          <div className="sf-datepicker-footer">
            <button type="button" onClick={() => { onChange(''); setIsOpen(false); }} className="sf-datepicker-action">Clear</button>
            <button type="button" onClick={() => { const t = dayjs(); setCurrentMonth(t); onChange(t.format('YYYY-MM-DD')); setIsOpen(false); }} className="sf-datepicker-action">Today</button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default SfDatePicker;
