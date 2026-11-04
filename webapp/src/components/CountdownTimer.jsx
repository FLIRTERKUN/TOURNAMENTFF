import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export function CountdownTimer({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  function calculateTimeLeft() {
    const difference = +new Date(targetDate) - +new Date();
    let timeLeft = {};

    if (difference > 0) {
      timeLeft = {
        hours: Math.floor(difference / (1000 * 60 * 60)),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      };
    } else {
      timeLeft = { hours: 0, minutes: 0, seconds: 0, expired: true };
    }
    return timeLeft;
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const pad = num => String(num || 0).padStart(2, '0');

  if (timeLeft.expired) {
    return <span className="text-red-400 font-bold tracking-wide">MATCH STARTED / CLOSED</span>;
  }

  return (
    <div className="flex items-center space-x-1.5 text-xs font-mono font-bold bg-ff-dark/60 border border-ff-border px-2 py-1 rounded-md text-ff-cyan">
      <Clock className="w-3.5 h-3.5 text-ff-orange animate-pulse" />
      <span>
        {pad(timeLeft.hours)}h : {pad(timeLeft.minutes)}m : {pad(timeLeft.seconds)}s
      </span>
    </div>
  );
}
