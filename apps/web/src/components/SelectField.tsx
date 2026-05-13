import type { SelectOption } from '../api/client';

type SelectFieldProps = {
  label: string;
  placeholder: string;
  options: SelectOption[];
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
};

export const SelectField = ({
  label,
  placeholder,
  options,
  value,
  disabled,
  onChange,
}: SelectFieldProps) => (
  <label className='block'>
    <span className='text-sm font-medium text-slate-300'>{label}</span>
    <select
      className='mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-base text-slate-50 disabled:cursor-not-allowed disabled:opacity-60'
      disabled={disabled}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value=''>{placeholder}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.name}
        </option>
      ))}
    </select>
  </label>
);
