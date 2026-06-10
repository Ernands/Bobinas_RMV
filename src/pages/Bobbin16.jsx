import BobbinDetails from './BobbinDetails';

export default function Bobbin16({ analytics, includePartialMonth, onIncludePartialMonthChange }) {
  return (
    <BobbinDetails
      analysis={analytics.bobbin16}
      includePartialMonth={includePartialMonth}
      onIncludePartialMonthChange={onIncludePartialMonthChange}
    />
  );
}
