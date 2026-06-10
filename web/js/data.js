/* Content mirrored from Figma "Trippy Premium → New Designs" flows */
const DATA = {
  user: { name: "Amy", handle: "@amy.lee", inviteHandle: "@amy.joy", followers: 104, following: 100 },

  onboarding: [
    { title: "Find the best activities", body: "Browse or get AI-powered activity suggestions." },
    { title: "Plan trips in seconds", body: "Let TrippyAI build your perfect TripList — dates, spots and routes included." },
    { title: "Travel with your people", body: "Share TripLists, collaborate with friends and join the community." },
  ],

  collage: [
    { img: "assets/cat_weather_forecasting.jpg", label: "Weather Forecasting" },
    { img: "assets/cat_nature_feels.jpg", label: "Nature Feels" },
    { img: "assets/cat_photogenic_spots.jpg", label: "Arts & Culture" },
    { img: "assets/cat_wan_chai_wednesday.jpg", label: "After Work" },
    { img: "assets/cat_most_popular_visits.jpg", label: "Most Popular Visits" },
    { img: "assets/cat_must_eat_dishes.jpg", label: "Must-Eat Dishes" },
    { img: "assets/cat_budget_friendly.jpg", label: "Budget Friendly" },
    { img: "assets/cat_island_hopping.jpg", label: "Exploring Hong Kong" },
    { img: "assets/cat_flea_street.jpg", label: "Coffee Addicts" },
    { img: "assets/cat_girls_night_out.jpg", label: "Photogenic Spots" },
    { img: "assets/cat_pets_matter.jpg", label: "Pets Matter" },
    { img: "assets/cat_music_fest.jpg", label: "Music Fest" },
  ],

  /* TrippySpot for You — default themes (After work / Dating / Media·arts / Food tour) */
  themes: [
    { key: "after_work", label: "After work", icon: "briefcase" },
    { key: "dating", label: "Dating", icon: "heart" },
    { key: "media", label: "Media/ arts", icon: "film" },
    { key: "food", label: "Food tour", icon: "food" },
  ],

  spots: [
    {
      n: 1, name: "The Rooftop Bar", cat: "Cocktail Bar", status: "open", statusText: "Open now",
      mins: 5, tags: ["Trending", "Rooftop", "Cocktails"], hot: true, img: "assets/cat_girls_night_out.jpg",
    },
    {
      n: 2, name: "Sunset Lounge", cat: "Wine Bar", status: "busy", statusText: "Busy",
      mins: 8, tags: ["Happy Hour", "Wine", "Casual"], hot: false, img: "assets/cat_photogenic_spots.jpg",
    },
    {
      n: 3, name: "Carbone Hong Kong", cat: "Italian Restaurant", status: "open", statusText: "Open now",
      mins: 12, tags: ["Fine Dining", "Italian", "Date Night"], hot: false, img: "assets/cat_must_eat_dishes.jpg",
    },
  ],

  trip: {
    title: "Time to enjoy nature ⛰️",
    owner: "Amy",
    date: "May 11",
    day: "Day 1: May 11",
    photos: ["assets/cat_nature_feels.jpg", "assets/cat_island_hopping.jpg", "assets/cat_photogenic_spots.jpg"],
    places: [
      { n: 1, name: "Pak Kung Au", sub: "Trailhead · Lantau Island", img: "assets/cat_nature_feels.jpg" },
      { n: 2, name: "Cheung Sha Beach", sub: "Beach · 25 min hike", img: "assets/cat_island_hopping.jpg" },
      { n: 3, name: "Pui O Beach", sub: "Sunset spot · Café nearby", img: "assets/cat_photogenic_spots.jpg" },
    ],
  },

  madeForYou: {
    triplists: [
      { name: "State of Pure Euphoria", items: 10, img: "assets/cat_music_fest.jpg" },
      { name: "Scenic Hike Escape", items: 10, img: "assets/cat_most_popular_visits.jpg" },
      { name: "I want to tan", items: 10, img: "assets/cat_island_hopping.jpg" },
      { name: "Boat Tours & Cruises", items: 10, img: "assets/cat_weather_forecasting.jpg" },
      { name: "YOLO Adventures", items: 10, img: "assets/cat_made_for_you.jpg" },
      { name: "Taste of Hong Kong", items: 8, img: "assets/cat_must_eat_dishes.jpg" },
    ],
    places: [
      { name: "Victoria Peak Garden", items: "Viewpoint · Central", img: "assets/cat_photogenic_spots.jpg" },
      { name: "Yardley Brothers Taproom", items: "Craft beer · Kwai Chung", img: "assets/cat_wan_chai_wednesday.jpg" },
      { name: "Tai O Fishing Village", items: "Heritage · Lantau", img: "assets/cat_island_hopping.jpg" },
      { name: "Kau Kee Beef Brisket", items: "Local eats · Sheung Wan", img: "assets/cat_must_eat_dishes.jpg" },
    ],
  },

  hotels: {
    trend: [
      { d: "Mon", v: 580 }, { d: "Tue", v: 520 }, { d: "Wed", v: 610 }, { d: "Thu", v: 480 },
      { d: "Fri", v: 420 }, { d: "Sat", v: 460 }, { d: "Sun", v: 390 },
    ],
    cheaper: "18% cheaper this week",
    deals: [
      { city: "Da Nang", country: "Vietnam", price: 450, rating: 4.8, off: "20%", best: true, img: "assets/cat_island_hopping.jpg" },
      { city: "Bangkok", country: "Thailand", price: 320, rating: 4.7, off: "18%", best: false, img: "assets/cat_most_popular_visits.jpg" },
      { city: "Taipei", country: "Taiwan", price: 380, rating: 4.6, off: "12%", best: false, img: "assets/cat_photogenic_spots.jpg" },
      { city: "Osaka", country: "Japan", price: 520, rating: 4.9, off: "15%", best: false, img: "assets/cat_must_eat_dishes.jpg" },
    ],
  },

  posts: [
    {
      name: "Amanda Moore", avatar: "assets/cat_girls_night_out.jpg",
      meta: "May 10 · ⌖ Central, Hong Kong",
      title: "What to do in Central?",
      body: "I’m looking for recommendations on what to do and see! Hoping to check out local favs.",
      tag: "Questions", likes: 5, comments: 0, ago: "3 hours ago",
    },
    {
      name: "Shawn Neilson", avatar: "assets/cat_most_popular_visits.jpg",
      meta: "May 10 · ⌖ Central, Hong Kong",
      title: "Any tips on beginner friendly hikes?",
      body: "I want to take my gf out on a outdoor date, but it’s her first time hiking! Please please help me out!!",
      tag: "Questions", likes: 12, comments: 4, ago: "5 hours ago",
    },
  ],

  profileTriplists: [
    { name: "Weekend Unwind", items: 6, img: "assets/cat_island_hopping.jpg" },
    { name: "Adrenaline Adventures", items: 8, img: "assets/cat_nature_feels.jpg" },
    { name: "Cafe Hopping Kinda Day~", items: 4, img: "assets/cat_must_eat_dishes.jpg" },
  ],

  regions: [
    { name: "Central", img: "assets/cat_girls_night_out.jpg" },
    { name: "Wanchai", img: "assets/cat_wan_chai_wednesday.jpg" },
    { name: "Eastern", img: "assets/cat_most_popular_visits.jpg" },
  ],

  groupSizes: ["Solo", "💑 Couple", "👫 Friends", "👨‍👩‍👧 Family", "🐕 Companion Pets"],

  categories: [
    "Select or Search Category Type", "After Work", "Dating", "Media/ Arts", "Food Tour", "Nature",
    "Fitness", "Shopping", "Nightlife", "Kid-friendly", "Pet-friendly", "Budget-friendly",
  ],
};

/* Demo fallback for the daily Top 50 (used when the TrippyAI server is off).
   Deterministic per day so the ranking "changes daily" even in demo mode. */
function buildTrendingFallback(kind) {
  const bases = kind === "categories"
    ? ["Rooftop Bars", "Harbour Hikes", "Dim Sum Crawls", "Night Markets", "Speakeasies", "Beach Days",
       "Gallery Hopping", "Street Food", "Sunset Spots", "Coffee Crawls", "Temple Walks", "Island Hopping",
       "Live Music", "Vintage Shopping", "Ramen Hunts", "Skyline Views", "Tai Chi Mornings", "Junk Boat Trips",
       "K-BBQ Nights", "Hidden Bookshops", "Egg Waffle Tours", "Neon Photo Walks", "Wet Market Tours",
       "Craft Beer Taprooms", "Omakase Counters"]
    : ["Golden Hour at West Kowloon", "Sai Kung Island Hop", "Dragon's Back & Beach", "Old Town Central Walk",
       "Mong Kok After Dark", "Lantau Big Buddha Day", "Cheung Chau Bike Loop", "PMQ Design Crawl",
       "Victoria Peak Sunrise", "Yau Ma Tei Food Run", "Star Ferry & Symphony", "Tai O Stilt Village",
       "K-Town Cafe Hop", "Quarry Bay Monster Walk", "Stanley Seaside Stroll", "Temple Street Eats",
       "Kennedy Town Sunset", "Po Toi Island Escape", "Sham Shui Po Threads", "Repulse Bay Reset",
       "Soho Gallery Night", "Lamma Island Seafood", "Hidden Speakeasy Trail", "Peng Chau Slow Day",
       "Kowloon Walled City Park"];
  const areas = ["Central", "Tsim Sha Tsui", "Wan Chai", "Sheung Wan", "Mong Kok", "Sai Kung",
    "Causeway Bay", "Kennedy Town", "Sham Shui Po", "Stanley"];
  const blurbs = ["Locals can't stop sharing it", "Perfect for this week's weather", "Reels are blowing up",
    "New openings this month", "Weekend queues say it all", "Golden-hour favourite", "Big with couples right now",
    "Budget-friendly pick", "Editors' pick this week", "Back in season"];
  const day = Math.floor(Date.now() / 86400000);
  const items = [];
  for (let i = 0; i < 50; i++) {
    const base = bases[(i + day) % bases.length];
    const suffixed = i < bases.length ? base : `${base} · ${areas[(i * 3 + day) % areas.length]}`;
    items.push({
      name: suffixed,
      area: areas[(i * 7 + day) % areas.length],
      blurb: blurbs[(i * 5 + day) % blurbs.length],
      trend: i < 3 ? "up" : ["up", "same", "new", "down", "same", "up"][(i + day) % 6],
      score: Math.max(20, 99 - i - ((i * day) % 7)),
    });
  }
  return { date: new Date().toISOString().slice(0, 10), items, demo: true };
}
