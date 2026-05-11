'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { HeartIcon, MoonIcon, SunIcon } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  const ActiveIcon = !mounted
    ? SunIcon
    : theme === 'dark'
      ? MoonIcon
      : theme === 'rose'
        ? HeartIcon
        : SunIcon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Toggle theme">
          <ActiveIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <SunIcon />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <MoonIcon />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('rose')}>
          <HeartIcon />
          Rose
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
