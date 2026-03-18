interface TimezoneSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
}

const TIMEZONES = [
  { label: "Pacific Time (US & Canada)", value: "UTC-08:00" },
  { label: "Mountain Time (US & Canada)", value: "UTC-07:00" },
  { label: "Central Time (US & Canada)", value: "UTC-06:00" },
  { label: "Eastern Time (US & Canada)", value: "UTC-05:00" },
  { label: "London, Lisbon, Dublin", value: "UTC+00:00" },
  { label: "Paris, Berlin, Rome, Madrid", value: "UTC+01:00" },
  { label: "Cairo, Johannesburg", value: "UTC+02:00" },
  { label: "Moscow, Istanbul, Riyadh", value: "UTC+03:00" },
  { label: "Dubai, Baku", value: "UTC+04:00" },
  { label: "Karachi, Tashkent", value: "UTC+05:00" },
  { label: "India Standard Time (IST)", value: "UTC+05:30" },
  { label: "Dhaka, Almaty", value: "UTC+06:00" },
  { label: "Bangkok, Jakarta", value: "UTC+07:00" },
  { label: "Beijing, Singapore, Perth", value: "UTC+08:00" },
  { label: "Tokyo, Seoul", value: "UTC+09:00" },
  { label: "Sydney, Melbourne", value: "UTC+10:00" },
  { label: "Auckland, Wellington", value: "UTC+12:00" },
];

export default function TimezoneSelector({
  value,
  onChange,
  id,
}: TimezoneSelectorProps) {
  return (
    <label data-field>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="UTC" disabled>
          Select your timezone
        </option>
        {TIMEZONES.map((tz) => (
          <option key={tz.value} value={tz.value}>
            {tz.label} ({tz.value})
          </option>
        ))}
      </select>
    </label>
  );
}
