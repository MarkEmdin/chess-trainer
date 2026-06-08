import { type ComponentProps } from 'react';
import { Input } from '@/app/components/ui/input';

type Props = {
  label: string;
  id: string;
} & Omit<ComponentProps<typeof Input>, 'id'>;

export default function FormField({ label, id, ...inputProps }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <Input id={id} {...inputProps} />
    </div>
  );
}
