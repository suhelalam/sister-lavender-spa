// pages/api/get-availability.js - SIMPLER VERSION
export default async function handler(req, res) {
  const { startDate } = req.body;

  const generateTimeSlots = (dateString) => {
    const slots = [];
    const durationMinutes = 30;
    
    // Your timezone offset from UTC in hours (e.g., -5 for EST, -6 for CST, etc.)
    const timezoneOffset = -6; // ← CHANGE THIS TO YOUR OFFSET
    
    const [year, month, day] = dateString.split('-');
    
    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay();
    
    // Check if Tuesday (day 2) - return empty array
    if (dayOfWeek === 2) { // 2 = Tuesday
      return []; // No slots for Tuesdays
    }
    
    const isSunday = dayOfWeek === 0;
    
    const startHour = 9;
    const startMinute = 30;
    const endHour = isSunday ? 18 : 20;

    let currentHour = startHour;
    let currentMinute = startMinute;

    while (currentHour < endHour || (currentHour === endHour && currentMinute === 0)) {
      // Create date in local time, then adjust for UTC
      const localDate = new Date(year, month - 1, day, currentHour, currentMinute);
      const utcDate = new Date(localDate.getTime() - (timezoneOffset * 60 * 60 * 1000));
      
      const now = new Date();
      if (utcDate > now) {
        slots.push({
          startAt: utcDate.toISOString(),
          endAt: new Date(utcDate.getTime() + durationMinutes * 60000).toISOString()
        });
      }

      currentMinute += durationMinutes;
      if (currentMinute >= 60) {
        currentHour += Math.floor(currentMinute / 60);
        currentMinute = currentMinute % 60;
      }
    }

    return slots;
  };

  try {
    if (!startDate) return res.status(400).json({ success: false, error: 'startDate required' });
    
    const slots = generateTimeSlots(startDate);
    res.status(200).json({ success: true, availabilities: slots });
    
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate availability' });
  }
}