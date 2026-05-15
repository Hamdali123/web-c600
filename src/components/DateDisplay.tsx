"use client";

import { useEffect, useState } from 'react';

export default function DateDisplay({ date }: { date: string }) {
  const [formatted, setFormatted] = useState<string>('');

  useEffect(() => {
    setFormatted(new Date(date).toLocaleDateString());
  }, [date]);

  return <span>{formatted}</span>;
}
