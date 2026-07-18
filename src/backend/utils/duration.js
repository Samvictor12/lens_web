/**
 * Parse JWT-style duration strings into milliseconds.
 * Supports: "7d", "1d", "15m", "3600s", bare numbers (seconds, like jsonwebtoken).
 *
 * @param {string|number} duration
 * @returns {number} Duration in milliseconds
 */
export function parseDurationToMs(duration) {
  if (typeof duration === 'number' && Number.isFinite(duration)) {
    return duration * 1000;
  }

  if (duration == null || typeof duration !== 'string') {
    throw new Error(`Invalid duration: ${duration}`);
  }

  const trimmed = duration.trim();
  const match = /^(\d+)([smhd])?$/i.exec(trimmed);

  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const value = parseInt(match[1], 10);
  const unit = (match[2] || 's').toLowerCase();
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * multipliers[unit];
}

/**
 * Add a JWT-style duration to a date.
 *
 * @param {Date} fromDate
 * @param {string|number} duration
 * @returns {Date}
 */
export function addDuration(fromDate, duration) {
  return new Date(fromDate.getTime() + parseDurationToMs(duration));
}
