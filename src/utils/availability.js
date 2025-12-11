import dayjs from 'dayjs';

export const isTechnicianAvailable = ({ calendarEntries = [], requestedStart, requestedEnd }) => {
  const start = dayjs(requestedStart);
  const end = dayjs(requestedEnd);

  return calendarEntries.every(entry => {
    const existingStart = dayjs(entry.start);
    const existingEnd = dayjs(entry.end);
    if(entry.status !== 'blocked') return true;
    const overlaps = start.isBefore(existingEnd) && end.isAfter(existingStart);
    return !overlaps;
  });
};

export const blockTimeSlot = ({ calendarEntries = [], requestedStart, requestedEnd, orderId }) => {
  const updatedEntries = [
    ...calendarEntries,
    {
      start: requestedStart,
      end: requestedEnd,
      order: orderId
    }
  ];

  return updatedEntries;
};
