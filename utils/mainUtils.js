const getUnixTimestamp = (dateStr) => {
  const date = new Date(
    dateStr.substring(0, 4), // Year
    dateStr.substring(4, 6) - 1, // Month (zero-indexed)
    dateStr.substring(6, 8) // Day
  );
  return Math.floor(date.getTime() / 1000); // Convert to Unix timestamp (in seconds)
};

module.exports = { getUnixTimestamp };
