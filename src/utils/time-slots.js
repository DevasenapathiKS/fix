import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import env from '../config/env.js';

dayjs.extend(utc);
dayjs.extend(timezone);

dayjs.tz.setDefault(env.timezone);

export const generateTimeSlots = ({
  date,
  intervalMinutes = 60,
  startTime = env.defaultWorkingHours.start,
  endTime = env.defaultWorkingHours.end
}) => {
  const slots = [];
  let cursor = dayjs.tz(`${date} ${startTime}`);
  const end = dayjs.tz(`${date} ${endTime}`);

  while (cursor.add(intervalMinutes, 'minute').isBefore(end) || cursor.add(intervalMinutes, 'minute').isSame(end)) {
    const next = cursor.add(intervalMinutes, 'minute');
    slots.push({
      start: cursor.format(),
      end: next.format()
    });
    cursor = next;
  }

  return slots;
};
