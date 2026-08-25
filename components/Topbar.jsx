'use client';
import Icon from './Icon';
import NotificationBell from './NotificationBell';
import { useScope, FIN_YEARS } from './ScopeContext';

export default function Topbar({ onToggleSidebar }) {
  const { businesses, locations, business, location, finYear, setBusiness, setLocation, setFinYear } = useScope();

  return (
    <header className="sticky top-0 z-20 flex h-topbar items-center gap-4 bg-white px-5">
      <div className="flex items-center gap-2">
        {/* <span className="grid grid-cols-3 gap-0.5">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <i key={n} className={'block h-1.5 w-1.5 ' + (n === 1 || n === 5 ? 'bg-[#7ea3dd]' : 'bg-[#2f5fb3]')} />
          ))}
        </span> */}
        <span className="leading-none">
          <b className="text-[17px] text-brand-logo">GROO RETAIL ERP</b>
          <span className="block text-[8.5px] text-[#7b8798]">EXCERPT TECHNOLOGIES PVT LTD</span>
        </span>
      </div>

      <div className="flex-1" />

      <select className="tb-select" value={business} onChange={(e) => setBusiness(e.target.value)}>
        {businesses.length === 0 && <option value="">Select Business</option>}
        {businesses.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
      </select>

      <select className="tb-select" value={location} onChange={(e) => setLocation(e.target.value)}>
        {locations.length === 0 && <option value="">Select Location</option>}
        {locations.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
      </select>

      <div className="flex items-center gap-2">
        <span className="text-[#56637d]"><Icon name="cal" size={26} /></span>
        <span>
          <span className="block text-[11px] leading-tight text-inkmuted">Financial Year</span>
          <select
            className="border-0 bg-transparent p-0 text-[15px] font-bold text-ink outline-none"
            value={finYear}
            onChange={(e) => setFinYear(e.target.value)}
          >
            {FIN_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </span>
      </div>

      <NotificationBell />

      <button type="button" onClick={onToggleSidebar} className="border-0 bg-transparent p-1 text-[#3c4a63]">
        <Icon name="burger" size={22} />
      </button>
    </header>
  );
}
