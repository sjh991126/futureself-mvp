// Hong Kong 전체 지역 데이터 통합

export const MAIN_REGIONS = {
    'Hong Kong Island': [
        'Central',
        'Wan Chai',
        'Tin Hau',
        'Happy Valley',
        'Tai Tam',
        'Aberdeen',
        'Chai Wan',
        'Mid-Levels',
        'Kennedy Town',
        'Sheung Wan',
        'Admiralty',
        'Causeway Bay',
        'North Point',
        'Quarry Bay'
    ],
    'Kowloon': [
        'Tsim Sha Tsui',
        'Mong Kok',
        'Kowloon Tong',
        'San Po Kong',
        'Kwun Tong',
        'Kai Tak',
        'Tai Kok Tsui',
        'Kowloon City',
        'Lam Tin',
        'Jordan',
        'Yau Ma Tei',
        'Prince Edward',
        'Diamond Hill',
        'Ngau Tau Kok',
        'Kowloon Bay',
        'Hung Hom',
        'To Kwa Wan'
    ],
    'New Territories': [
        'Sha Tin',
        'Tai Po',
        'Tsuen Wan',
        'Tuen Mun',
        'Yuen Long',
        'Kwai Fong',
        'Sai Kung',
        'Fo Tan',
        'Tai Wai',
        'Tin Shui Wai',
        'Fanling',
        'Sheung Shui',
        'Ma On Shan'
    ],
    'Islands': [
        'Lantau Island',
        'Lamma Island',
        'Cheung Chau',
        'Peng Chau',
        'Tung Chung',
        'Discovery Bay',
        'Mui Wo'
    ]
};

export const REGION_MAPPING = {
    // Hong Kong Island
    'Sai Ying Pun': 'Central',
    'Shau Kei Wan': 'Chai Wan',
    'Siu Sai Wan': 'Chai Wan',
    'Wong Chuk Hang': 'Aberdeen',
    'Ap Lei Chau': 'Aberdeen',
    'Tsim Sha Tsui East': 'Tsim Sha Tsui',
    'Repulse Bay': 'Aberdeen',
    'Stanley': 'Tai Tam',
    'Shek O': 'Chai Wan',

    // Kowloon
    'Sham Shui Po': 'Mong Kok',
    'Cheung Sha Wan': 'Mong Kok',
    'Lai Chi Kok': 'Mong Kok',
    'Wong Tai Sin': 'Diamond Hill',
    'Choi Hung': 'San Po Kong',
    'Whampoa': 'Hung Hom',
    'Ho Man Tin': 'Kowloon Tong',

    // New Territories
    'City One': 'Sha Tin',
    'Siu Hong': 'Tuen Mun',
    'Long Ping': 'Yuen Long',
    'Kwai Hing': 'Kwai Fong',
    'Lai King': 'Kwai Fong',
    'Tsing Yi': 'Tsuen Wan',
    'Tseung Kwan O': 'Sai Kung',
    'Hang Hau': 'Sai Kung',
    'Lohas Park': 'Sai Kung'
};

export const LOCATION_COORDINATES = {
    // Hong Kong Island
    'Central': { latitude: 22.281, longitude: 114.157 },
    'Wan Chai': { latitude: 22.277, longitude: 114.174 },
    'Tin Hau': { latitude: 22.285, longitude: 114.194 },
    'Happy Valley': { latitude: 22.270, longitude: 114.186 },
    'Tai Tam': { latitude: 22.252, longitude: 114.213 },
    'Aberdeen': { latitude: 22.249, longitude: 114.154 },
    'Chai Wan': { latitude: 22.265, longitude: 114.237 },
    'Mid-Levels': { latitude: 22.275, longitude: 114.145 },
    'Kennedy Town': { latitude: 22.281, longitude: 114.128 },
    'Sheung Wan': { latitude: 22.286, longitude: 114.150 },
    'Admiralty': { latitude: 22.280, longitude: 114.165 },
    'Causeway Bay': { latitude: 22.280, longitude: 114.185 },
    'North Point': { latitude: 22.291, longitude: 114.200 },
    'Quarry Bay': { latitude: 22.287, longitude: 114.212 },

    // Kowloon
    'Tsim Sha Tsui': { latitude: 22.296, longitude: 114.174 },
    'Mong Kok': { latitude: 22.319, longitude: 114.169 },
    'Kowloon Tong': { latitude: 22.337, longitude: 114.177 },
    'San Po Kong': { latitude: 22.333, longitude: 114.197 },
    'Kwun Tong': { latitude: 22.312, longitude: 114.226 },
    'Kai Tak': { latitude: 22.330, longitude: 114.205 },
    'Tai Kok Tsui': { latitude: 22.320, longitude: 114.161 },
    'Kowloon City': { latitude: 22.330, longitude: 114.192 },
    'Lam Tin': { latitude: 22.307, longitude: 114.240 },
    'Jordan': { latitude: 22.304, longitude: 114.172 },
    'Yau Ma Tei': { latitude: 22.311, longitude: 114.170 },
    'Prince Edward': { latitude: 22.324, longitude: 114.168 },
    'Diamond Hill': { latitude: 22.340, longitude: 114.202 },
    'Ngau Tau Kok': { latitude: 22.316, longitude: 114.219 },
    'Kowloon Bay': { latitude: 22.324, longitude: 114.215 },
    'Hung Hom': { latitude: 22.303, longitude: 114.182 },
    'To Kwa Wan': { latitude: 22.316, longitude: 114.188 },

    // New Territories
    'Sha Tin': { latitude: 22.383, longitude: 114.188 },
    'Tai Po': { latitude: 22.451, longitude: 114.164 },
    'Tsuen Wan': { latitude: 22.370, longitude: 114.114 },
    'Tuen Mun': { latitude: 22.391, longitude: 113.976 },
    'Yuen Long': { latitude: 22.446, longitude: 114.032 },
    'Kwai Fong': { latitude: 22.357, longitude: 114.130 },
    'Sai Kung': { latitude: 22.381, longitude: 114.271 },
    'Fo Tan': { latitude: 22.395, longitude: 114.193 },
    'Tai Wai': { latitude: 22.373, longitude: 114.179 },
    'Tin Shui Wai': { latitude: 22.458, longitude: 113.999 },
    'Fanling': { latitude: 22.493, longitude: 114.138 },
    'Sheung Shui': { latitude: 22.502, longitude: 114.128 },
    'Ma On Shan': { latitude: 22.425, longitude: 114.230 },

    // Islands
    'Lantau Island': { latitude: 22.255, longitude: 113.945 },
    'Lamma Island': { latitude: 22.210, longitude: 114.125 },
    'Cheung Chau': { latitude: 22.208, longitude: 114.028 },
    'Peng Chau': { latitude: 22.287, longitude: 114.038 },
    'Tung Chung': { latitude: 22.289, longitude: 113.944 },
    'Discovery Bay': { latitude: 22.293, longitude: 114.003 },
    'Mui Wo': { latitude: 22.263, longitude: 113.995 }
};

// Helper function
export const normalizeLocation = (location) => {
    return REGION_MAPPING[location] || location;
};

export const getLocationCoordinates = (location) => {
    const normalized = normalizeLocation(location);
    return LOCATION_COORDINATES[normalized];
};