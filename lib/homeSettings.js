export const defaultBusinessHours = [
  { day: "Monday", open: "09:30", close: "21:00", closed: false },
  { day: "Tuesday", open: "09:30", close: "21:00", closed: false },
  { day: "Wednesday", open: "09:30", close: "21:00", closed: false },
  { day: "Thursday", open: "09:30", close: "21:00", closed: false },
  { day: "Friday", open: "09:30", close: "21:00", closed: false },
  { day: "Saturday", open: "09:30", close: "21:00", closed: false },
  { day: "Sunday", open: "09:30", close: "21:00", closed: false },
];

export const defaultAnnouncements = [
  {
    id: "announcement-1",
    title: "Share the Serenity",
    date: "September 1, 2025 - September 30, 2025",
    description:
      "Recommend Sister Lavender Spa to a friend, and when they book a service, you'll both receive 10% off your next visit.",
    note: "Valid only for new client referrals. Discount applies once per client and may not be combined with other offers.",
  },
  {
    id: "announcement-2",
    title: "Self-Care is Better Together",
    date: "September 1, 2025 - September 30, 2025",
    description: "Bring in a friend or loved one for our head spa services and enjoy 20% off for both.",
    note: "Must pay cash and post a review for this promotion.",
  },
];

export const defaultHomeSettings = {
  businessHours: defaultBusinessHours,
  announcements: defaultAnnouncements,
  promotion: { enabled: false, id: 'welcome-offer', title: 'A little more time for you', description: 'Discover our current seasonal spa experiences.', terms: '', startDate: '', endDate: '', showOnce: true },
};
