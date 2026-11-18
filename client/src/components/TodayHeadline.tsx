interface TodayHeadlineProps {
  expired: number;
  expiring: number;
  total: number;
  warningDays: number;
}

export function TodayHeadline({ expired, expiring, total, warningDays }: TodayHeadlineProps) {
  if (total === 0) return <>Let’s stock the shelves.</>;
  if (expired === 0 && expiring === 0) return <>Everything on the shelf is in date.</>;

  const expiredPart = expired > 0 && <em>{expired} expired</em>;
  const expiringPart = expiring > 0 && `${expiring} expiring within ${warningDays} days`;
  const joiner = expired > 0 && expiring > 0 ? ' and ' : '';
  return (
    <>
      {expiredPart}
      {joiner}
      {expiringPart}.
    </>
  );
}
