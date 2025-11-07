// pages/api/get-availability.js
export default async function handler(req, res) {
  const { startDate } = req.body; // YYYY-MM-DD

  // Generate hardcoded time slots with different hours for Sunday
  const generateTimeSlots = (dateString) => {
    const slots = [];
    const durationMinutes = 60; // 60-minute slots

    // Create date in local timezone
    const localDate = new Date(dateString + 'T00:00:00');
    
    // Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const dayOfWeek = localDate.getDay();
    
    // Set different hours for Sunday vs other days
    const isSunday = dayOfWeek === 0;
    const startHour = 9;  // 9:30 AM for all days
    const startMinute = 30;
    const endHour = isSunday ? 18 : 20; // 6:00 PM for Sunday, 8:00 PM for other days

    let currentHour = startHour;
    let currentMinute = startMinute;

    while (currentHour < endHour || (currentHour === endHour && currentMinute === 0)) {
      const slotDate = new Date(localDate);
      slotDate.setHours(currentHour, currentMinute, 0, 0);
      
      // Only add slots that are in the future (not in the past)
      const now = new Date();
      if (slotDate > now) {
        slots.push({
          startAt: slotDate.toISOString(),
          endAt: new Date(slotDate.getTime() + durationMinutes * 60000).toISOString()
        });
      }

      // Move to next slot
      currentMinute += durationMinutes;
      if (currentMinute >= 60) {
        currentHour += Math.floor(currentMinute / 60);
        currentMinute = currentMinute % 60;
      }
    }

    return slots;
  };

  try {
    // Validate input
    if (!startDate) {
      return res.status(400).json({ success: false, error: 'startDate is required' });
    }

    const slots = generateTimeSlots(startDate);
    
    // Debug logging
    const localDate = new Date(startDate + 'T00:00:00');
    const dayOfWeek = localDate.getDay();
    const isSunday = dayOfWeek === 0;
    const hours = isSunday ? '9:30 AM - 6:00 PM' : '9:30 AM - 8:00 PM';
    
    console.log('Requested date:', startDate, `(${isSunday ? 'Sunday' : 'Weekday'})`);
    console.log('Operating hours:', hours);
    console.log('Generated slots:', slots.length);
    
    res.status(200).json({ 
      success: true, 
      availabilities: slots,
      note: `Using hardcoded availability (${hours})`
    });
    
  } catch (err) {
    console.error('Error generating availability:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate availability',
      details: err.message 
    });
  }
}