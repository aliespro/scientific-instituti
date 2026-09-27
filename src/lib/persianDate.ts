const jalaliMonths = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', ' مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

const jalaliDays = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];

function toJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy: number;
  if (gy > 1600) {
    jy = 979;
    gy -= 1600;
  } else {
    jy = 0;
    gy -= 621;
  }
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 +
    gd +
    g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm =
    days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd =
    1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return [jy, jm, jd];
}

export function toPersianDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const [jy, jm, jd] = toJalali(
    d.getFullYear(),
    d.getMonth() + 1,
    d.getDate()
  );
  return `${jd} ${jalaliMonths[jm - 1]} ${jy}`;
}

export function toPersianDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const [jy, jm, jd] = toJalali(
    d.getFullYear(),
    d.getMonth() + 1,
    d.getDate()
  );
  return `${jd}/${jm}/${jy}`;
}

export function toPersianDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const time = d.toLocaleTimeString('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${toPersianDate(d)} - ${time}`;
}

export function toPersianDayName(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return jalaliDays[d.getDay()];
}

export function toPersianNumber(num: number | string): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(num).replace(/\d/g, (d) => persianDigits[parseInt(d)]);
}

export function formatCurrency(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `${toPersianNumber((amount / 1_000_000_000).toFixed(1))} میلیارد تومان`;
  }
  if (amount >= 1_000_000) {
    return `${toPersianNumber(Math.round(amount / 1_000_000))} میلیون تومان`;
  }
  return `${toPersianNumber(Math.round(amount))} تومان`;
}

export function getJalaliMonthYear(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const [jy, jm] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${jalaliMonths[jm - 1]} ${jy}`;
}

export function getJalaliYear(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  const [jy] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return jy;
}

export { jalaliMonths, jalaliDays };

export function formatDuration(hours: number): string {
  if (hours <= 0) return '۰';
  const totalMinutes = Math.round(hours * 60);

  if (totalMinutes < 60) {
    return `${toPersianNumber(totalMinutes)} دقیقه`;
  }

  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (h < 24 && m > 0) {
    return `${toPersianNumber(h)} ساعت و ${toPersianNumber(m)} دقیقه`;
  }

  if (h < 24) {
    return `${toPersianNumber(h)} ساعت`;
  }

  const days = Math.floor(h / 24);
  const remainingHours = h % 24;

  if (remainingHours > 0) {
    return `${toPersianNumber(days)} روز و ${toPersianNumber(remainingHours)} ساعت`;
  }

  return `${toPersianNumber(days)} روز`;
}

export function formatDurationShort(hours: number): string {
  if (hours <= 0) return '۰';
  const totalMinutes = Math.round(hours * 60);

  if (totalMinutes < 60) {
    return `${toPersianNumber(totalMinutes)} دقیقه`;
  }

  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (h < 24 && m > 0) {
    return `${toPersianNumber(h)}س ${toPersianNumber(m)}د`;
  }

  if (h < 24) {
    return `${toPersianNumber(h)} ساعت`;
  }

  const days = Math.floor(h / 24);
  const remainingHours = h % 24;

  if (remainingHours > 0) {
    return `${toPersianNumber(days)}ر ${toPersianNumber(remainingHours)}س`;
  }

  return `${toPersianNumber(days)} روز`;
}
