import BobbinDetails from './BobbinDetails';

export default function Bobbin30({ analytics, includePartialMonth, onIncludePartialMonthChange }) {
  return (
    <BobbinDetails
      analysis={analytics.bobbin30}
      includePartialMonth={includePartialMonth}
      onIncludePartialMonthChange={onIncludePartialMonthChange}
    />
  );
}
