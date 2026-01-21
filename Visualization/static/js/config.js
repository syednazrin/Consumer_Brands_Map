// ============================================
// CONFIGURATION
// ============================================

// Mapbox access token
const MAPBOX_TOKEN = 'pk.eyJ1IjoibXNoYW1pIiwiYSI6ImNtMGljY28zMzBqZGsycXF4MGppdmE0bWUifQ.nWArfpCw78mToZi2cN-e8w';

// Map initial settings
const MAP_CONFIG = {
    style: 'mapbox://styles/mapbox/light-v11',
    center: [101.6869, 3.1390], // Malaysia center
    zoom: 6
};

// Categories with Distribution Centers
const DC_CATEGORIES = ['99 SpeedMart', 'Food and Beverages', 'MR DIY + MR TOY'];

// Available categories
const CATEGORIES = [
    '99 SpeedMart',
    'Convenience Stores',
    'Department Stores',
    'Eco Shop',
    'Fast Fashion',
    'Food and Beverages',
    'Gold Shops',
    'MR DIY + MR TOY'
];

// File mapping for each category
const CATEGORY_FILE_MAP = {
    '99 SpeedMart': ['99 SpeedMart.geojson'],
    'Convenience Stores': ['711.geojson', 'Family Mart.geojson', 'KK Mart.geojson', 'MyNews Mart.geojson'],
    'Department Stores': ['Aeon.geojson', 'Parkson.geojson'],
    'Eco Shop': ['Eco-Shop.geojson'],
    'Fast Fashion': ['H&M.geojson', 'HLA.geojson', 'Padini.geojson', 'Uniqlo.geojson'],
    'Food and Beverages': ['MemangMeow.geojson', 'OldTown White Coffee.geojson', 'Oriental Kopi.geojson', 'Tea Garden.geojson'],
    'Gold Shops': ['Habib Jewels.geojson', 'Poh Kong.geojson', 'Tomei.geojson', 'Wah Chan.geojson'],
    'MR DIY + MR TOY': ['Mr_DIY.geojson', 'Mr_Toy.geojson']
};

// DC file paths
const DC_FILE_PATHS = {
    '99 SpeedMart': '/data/99 SpeedMart/DC/99speedmart-distribution-centers.json',
    'Food and Beverages': '/data/Food and Beverages/DC/oriental_kopi_distribution_centers.json',
    'MR DIY + MR TOY': '/data/MR DIY + MR TOY/DC/mr_diy_distribution_centers.json'
};

// Brand colors - Official brand color palette
const BRAND_COLORS = {
    // Retail Chains
    'MR DIY': '#FFC82E',
    'Mr DIY': '#FFC82E',
    'Mr_DIY': '#FFC82E',
    'MR Toy': '#E53935',
    'Mr Toy': '#E53935',
    'Mr_Toy': '#E53935',
    'Eco Shop': '#4CAF50',
    'Eco-Shop': '#4CAF50',
    '99 SpeedMart': '#FF9800',
    '99 Speedmart': '#FF9800',
    
    // Convenience Stores
    '7-Eleven': '#00A859',
    '7-eleven': '#00A859',
    '711': '#00A859',
    'Family Mart': '#00BFA5',
    'FamilyMart': '#00BFA5',
    'MyNews': '#D50000',
    'MyNews Mart': '#D50000',
    'My News': '#D50000',
    'KK Mart': '#FB8C00',
    'KK Super Mart': '#FB8C00',
    'KKMart': '#FB8C00',
    
    // Food & Beverages
    'Oriental Kopi': '#6D4C41',
    'OldTown White Coffee': '#8D6E63',
    'Old Town White Coffee': '#8D6E63',
    'OldTown': '#8D6E63',
    'Tea Garden': '#81C784',
    'TeaGarden': '#81C784',
    'Memang Meow': '#9C27B0',
    'MemangMeow': '#9C27B0',
    
    // Fast Fashion
    'Padini': '#000000',
    'H&M': '#C8102E',
    'HM': '#C8102E',
    'Uniqlo': '#E60012',
    'HLA': '#002F6C',
    
    // Department Stores
    'Parkson': '#8E44AD', // Deep Purple (distinct from Aeon's magenta)
    'Aeon': '#A0008E', // Magenta
    'AEON': '#A0008E',
    
    // Gold Shops - Distinct colors from different families
    'Tomei': '#FF6B6B', // Coral Red
    'Poh Kong': '#4ECDC4', // Turquoise
    'Habib Jewels': '#9B59B6', // Purple
    'Habib': '#9B59B6',
    'Wah Chan': '#F39C12', // Orange
    
    // Special Markers
    'Distribution Center': '#2196F3',
    'DC': '#2196F3'
};

// Extract brand name from filename
function getBrandFromFilename(filename) {
    return filename.replace('.geojson', '').replace(/_/g, ' ');
}

// Get color for a brand
function getBrandColor(brandName) {
    if (!brandName) return '#666666'; // Default gray
    
    // Try exact match first
    if (BRAND_COLORS[brandName]) {
        return BRAND_COLORS[brandName];
    }
    
    // Normalize brand name for case-insensitive matching
    const normalizedInput = brandName.toLowerCase().replace(/[\s_-]/g, '');
    
    // Try normalized matching
    for (const [key, color] of Object.entries(BRAND_COLORS)) {
        const normalizedKey = key.toLowerCase().replace(/[\s_-]/g, '');
        if (normalizedKey === normalizedInput) {
            return color;
        }
    }
    
    // Default/fallback color if not found
    console.warn(`No color found for brand: ${brandName}, using default gray`);
    return '#666666';
}

// Layer hierarchy order (bottom to top)
const LAYER_ORDER = [
    'district-fills',
    'district-borders',
    'dc-sonar-circles',
    'dc-markers',
    'store-clusters',
    'store-cluster-count',
    'store-points',
    'store-markers-individual'
];

// Make functions available globally
window.getBrandFromFilename = getBrandFromFilename;
window.getBrandColor = getBrandColor;
