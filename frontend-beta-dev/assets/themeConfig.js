export const ALL_THEMES = [
    { key: 'after_work', label: 'After work', icon: 'briefcase-outline', id: 1, serverId: 'Chilling After Work' },
    { key: 'dating', label: 'Dating', icon: 'heart-outline', id: 2, serverId: 'Dating in Hong Kong' },
    { key: 'media', label: 'Media/arts', icon: 'film-outline', id: 3, serverId: 'Explore art and culture in Hong Kong' },
    { key: 'food', label: 'Food tour', icon: 'restaurant-outline', id: 4, serverId: 'Explore food and drink in Hong Kong' },
    { key: 'nature', label: 'Nature', icon: 'leaf-outline', id: 5, serverId: 'Nature Escapes' },
    { key: 'fitness', label: 'Fitness', icon: 'fitness-outline', id: 6, serverId: 'Fitness & Wellness' },
    { key: 'shopping', label: 'Shopping', icon: 'cart-outline', id: 7, serverId: 'Shopping Spree' },
    { key: 'nightlife', label: 'Nightlife', icon: 'wine-outline', id: 8, serverId: 'Nightlife' },
    { key: 'kid', label: 'Kid-friendly', icon: 'happy-outline', id: 9, serverId: 'Kid-Friendly Fun' },
    { key: 'pet', label: 'Pet-friendly', icon: 'paw-outline', id: 10, serverId: 'Pet-Friendly' },
    { key: 'budget', label: 'Budget-friendly', icon: 'wallet-outline', id: 11, serverId: 'Budget-Friendly' },
    { key: 'seasonal', label: 'Seasonal', icon: 'flower-outline', id: 12, serverId: 'Seasonal' },
    { key: 'relax', label: 'Relax', icon: 'bed-outline', id: 13, serverId: 'Relax & Recharge' },
    { key: 'adventure', label: 'Adventure', icon: 'compass-outline', id: 14, serverId: 'Adventure Mode' }
];


export const getThemeById = (id) => {
    return ALL_THEMES.find(theme => theme.id === id) || ALL_THEMES[0];
};

export const DEFAULT_THEME_ORDER = [1, 2, 3, 4];