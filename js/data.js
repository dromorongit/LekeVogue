// Product Data for Leke Vogue Enterprise
const products = [
    // Shoes
    {
        id: 1,
        name: "Elegant Stiletto Heels",
        category: "Shoes",
        price: 250,
        description: "Premium quality stiletto heels perfect for formal occasions. Features comfortable padding and durable sole.",
        image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400",
        images: [
            "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400",
            "https://images.unsplash.com/photo-1515347619252-60a4bf4fff4f?w=400",
            "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400"
        ],
        featured: true
    },
    {
        id: 2,
        name: "Classic Leather Loafers",
        category: "Shoes",
        price: 320,
        description: "Genuine leather loafers for men. Perfect for office wear and formal events.",
        image: "https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=400",
        images: [
            "https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=400",
            "https://images.unsplash.com/photo-1605812860427-4024433a70fd?w=400"
        ],
        featured: false
    },
    {
        id: 3,
        name: "Casual Sneakers",
        category: "Shoes",
        price: 180,
        description: "Comfortable casual sneakers for everyday wear. Lightweight and breathable.",
        image: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400",
        images: [
            "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400"
        ],
        featured: true
    },
    
    // Bags
    {
        id: 4,
        name: "Designer Handbag",
        category: "Bags",
        price: 450,
        description: "Luxurious designer handbag with multiple compartments. Perfect for any occasion.",
        image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400",
        images: [
            "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400",
            "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400"
        ],
        featured: true
    },
    {
        id: 5,
        name: "Leather Backpack",
        category: "Bags",
        price: 380,
        description: "Genuine leather backpack with laptop compartment. Stylish and functional.",
        image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400",
        images: [
            "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400"
        ],
        featured: false
    },
    {
        id: 6,
        name: "Elegant Clutch Bag",
        category: "Bags",
        price: 220,
        description: "Beautiful clutch bag for evening events. Features secure closure.",
        image: "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=400",
        images: [
            "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=400"
        ],
        featured: true
    },
    
    // T-Shirts
    {
        id: 7,
        name: "Premium Cotton T-Shirt",
        category: "T-Shirts",
        price: 80,
        description: "100% premium cotton t-shirt. Soft, comfortable, and durable.",
        image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400",
        images: [
            "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400",
            "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400"
        ],
        featured: true
    },
    {
        id: 8,
        name: "Graphic Print T-Shirt",
        category: "T-Shirts",
        price: 95,
        description: "Trendy graphic print t-shirt. Perfect for casual outings.",
        image: "https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=400",
        images: [
            "https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=400"
        ],
        featured: false
    },
    {
        id: 9,
        name: "V-Neck Essential Tee",
        category: "T-Shirts",
        price: 70,
        description: "Classic v-neck t-shirt. Versatile and comfortable for daily wear.",
        image: "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400",
        images: [
            "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400"
        ],
        featured: true
    },
    
    // Dresses
    {
        id: 10,
        name: "Elegant Evening Gown",
        category: "Dresses",
        price: 680,
        description: "Stunning evening gown perfect for special occasions. Features elegant draping.",
        image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400",
        images: [
            "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400",
            "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=400"
        ],
        featured: true
    },
    {
        id: 11,
        name: "Casual Summer Dress",
        category: "Dresses",
        price: 250,
        description: "Light and breezy summer dress. Perfect for casual events and everyday wear.",
        image: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400",
        images: [
            "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400"
        ],
        featured: true
    },
    {
        id: 12,
        name: "Cocktail Party Dress",
        category: "Dresses",
        price: 420,
        description: "Chic cocktail dress for parties. Flattering silhouette with elegant details.",
        image: "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=400",
        images: [
            "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=400"
        ],
        featured: false
    },
    
    // Jeans
    {
        id: 13,
        name: "Slim Fit Denim Jeans",
        category: "Jeans",
        price: 200,
        description: "Classic slim fit denim jeans. Comfortable stretch fabric.",
        image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400",
        images: [
            "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400",
            "https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=400"
        ],
        featured: true
    },
    {
        id: 14,
        name: "High Waist Jeans",
        category: "Jeans",
        price: 220,
        description: "Trendy high waist jeans with perfect fit. Flattering for all body types.",
        image: "https://images.unsplash.com/photo-1584370848010-d7fe6bc767ec?w=400",
        images: [
            "https://images.unsplash.com/photo-1584370848010-d7fe6bc767ec?w=400"
        ],
        featured: false
    },
    {
        id: 15,
        name: "Distressed Denim",
        category: "Jeans",
        price: 240,
        description: "Stylish distressed denim jeans. Perfect for casual street style.",
        image: "https://images.unsplash.com/photo-1604176354204-9268737828e4?w=400",
        images: [
            "https://images.unsplash.com/photo-1604176354204-9268737828e4?w=400"
        ],
        featured: true
    },
    
    // Underwear
    {
        id: 16,
        name: "Cotton Briefs Set",
        category: "Underwear",
        price: 120,
        description: "Pack of 3 premium cotton briefs. Comfortable for all-day wear.",
        image: "https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=400",
        images: [
            "https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=400"
        ],
        featured: false
    },
    {
        id: 17,
        name: "Lace Bikini Set",
        category: "Underwear",
        price: 95,
        description: "Elegant lace bikini set. Beautiful and comfortable.",
        image: "https://images.unsplash.com/photo-1595461135849-c5af2f3c9ee5?w=400",
        images: [
            "https://images.unsplash.com/photo-1595461135849-c5af2f3c9ee5?w=400"
        ],
        featured: true
    },
    {
        id: 18,
        name: "Sports Bra",
        category: "Underwear",
        price: 85,
        description: "Supportive sports bra for active women. Moisture-wicking fabric.",
        image: "https://images.unsplash.com/photo-1571945153237-4929e783af4a?w=400",
        images: [
            "https://images.unsplash.com/photo-1571945153237-4929e783af4a?w=400"
        ],
        featured: false
    },
    
    // Wigs
    {
        id: 19,
        name: "Human Hair Wig - Bob",
        category: "Wigs",
        price: 850,
        description: "Premium human hair bob wig. Natural look and feel. Can be styled as desired.",
        image: "https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=400",
        images: [
            "https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=400",
            "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=400"
        ],
        featured: true
    },
    {
        id: 20,
        name: "Long Curly Wig",
        category: "Wigs",
        price: 1200,
        description: "Beautiful long curly wig. Voluminous and natural-looking.",
        image: "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=400",
        images: [
            "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=400"
        ],
        featured: true
    },
    {
        id: 21,
        name: "Short Pixie Wig",
        category: "Wigs",
        price: 650,
        description: "Trendy pixie cut wig. Low maintenance and stylish.",
        image: "https://images.unsplash.com/photo-1601871893638-1814c3c19b90?w=400",
        images: [
            "https://images.unsplash.com/photo-1601871893638-1814c3c19b90?w=400"
        ],
        featured: false
    },
    
    // Hair Bundles
    {
        id: 22,
        name: "Brazilian Hair Bundle - 3 Pack",
        category: "Hair Bundles",
        price: 450,
        description: "Premium Brazilian hair bundles. 100% human hair. Perfect for weaving.",
        image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400",
        images: [
            "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400"
        ],
        featured: true
    },
    {
        id: 23,
        name: "Virgin Hair Bundle",
        category: "Hair Bundles",
        price: 550,
        description: "Raw virgin hair bundle. Can be dyed, bleached, and styled.",
        image: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=400",
        images: [
            "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=400"
        ],
        featured: true
    },
    {
        id: 24,
        name: "Malaysian Hair Bundle",
        category: "Hair Bundles",
        price: 480,
        description: "High-quality Malaysian hair. Silky texture and natural shine.",
        image: "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=400",
        images: [
            "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=400"
        ],
        featured: false
    },
    
    // Hair Extensions
    {
        id: 25,
        name: "Clip-In Hair Extensions",
        category: "Hair Extensions",
        price: 320,
        description: "Easy-to-use clip-in extensions. Instant length and volume.",
        image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400",
        images: [
            "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400"
        ],
        featured: true
    },
    {
        id: 26,
        name: "Tape-In Extensions",
        category: "Hair Extensions",
        price: 420,
        description: "Professional tape-in extensions. Seamless blend with natural hair.",
        image: "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=400",
        images: [
            "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=400"
        ],
        featured: false
    },
    {
        id: 27,
        name: "Fusion Hair Extensions",
        category: "Hair Extensions",
        price: 680,
        description: "Premium fusion extensions. Long-lasting and natural-looking.",
        image: "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=400",
        images: [
            "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=400"
        ],
        featured: true
    }
];

// Categories data
const categories = [
    { name: "Shoes", icon: "👠" },
    { name: "Bags", icon: "👜" },
    { name: "T-Shirts", icon: "👕" },
    { name: "Dresses", icon: "👗" },
    { name: "Jeans", icon: "👖" },
    { name: "Underwear", icon: "🩱" },
    { name: "Wigs", icon: "💇" },
    { name: "Hair Bundles", icon: "💆" },
    { name: "Hair Extensions", icon: "✨" }
];

// Get featured products
function getFeaturedProducts() {
    return products.filter(product => product.featured);
}

// Get products by category
function getProductsByCategory(category) {
    return products.filter(product => product.category === category);
}

// Get product by ID
function getProductById(id) {
    return products.find(product => product.id === parseInt(id));
}

// Search products
function searchProducts(query) {
    const searchTerm = query.toLowerCase();
    return products.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.category.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm)
    );
}

// Get related products
function getRelatedProducts(productId, limit = 4) {
    const product = getProductById(productId);
    if (!product) return [];
    
    return products
        .filter(p => p.category === product.category && p.id !== product.id)
        .slice(0, limit);
}

// Format price to Ghana Cedis
function formatPrice(price) {
    return `GHS ${price.toFixed(2)}`;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        products,
        categories,
        getFeaturedProducts,
        getProductsByCategory,
        getProductById,
        searchProducts,
        getRelatedProducts,
        formatPrice
    };
}
