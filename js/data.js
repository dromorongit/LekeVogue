// Leke Vogue Enterprise - Product Data Service
// Connected to Backend API: lekevogue-production.up.railway.app

const API_BASE_URL = 'https://lekevogue-production.up.railway.app/api';

// Cache for products
let productsCache = null;
let categoriesCache = null;
let isLoading = false;

// Default categories (fallback if API fails)
const defaultCategories = [
    { name: "Shoes", icon: "👠", subcategories: ["Heels", "Slipper Heels", "Flat Slippers", "Flat Sandals", "Block Sandals", "Block Slippers", "Flat Shoes", "Unisex Slippers", "Sneakers", "Men's Executive Shoes", "Men's Slippers", "Men's Sandals", "Kids Shoes (Girls)", "Kids Shoes (Boys)", "Kids Shoes (Unisex)"] },
    { name: "Bags", icon: "👜" },
    { name: "T-Shirts", icon: "👕" },
    { name: "Dresses", icon: "👗" },
    { name: "Jeans", icon: "👖" },
    { name: "Underwear", icon: "🩱" },
    { name: "Wigs", icon: "💇" },
    { name: "Hair Bundles", icon: "💆" },
    { name: "Hair Extensions", icon: "✨" },
    { name: "Hair Products & Tools", icon: "💈" },
    { name: "Belts", icon: "👔" }
];

// Default products (fallback if API fails)
const defaultProducts = [
    {
        id: 1,
        name: "Elegant Stiletto Heels",
        category: "Shoes",
        price: 250,
        description: "Premium quality stiletto heels perfect for formal occasions.",
        image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400",
        images: ["https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400"],
        featured: true
    },
    {
        id: 2,
        name: "Classic Leather Loafers",
        category: "Shoes",
        price: 320,
        description: "Genuine leather loafers for men.",
        image: "https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=400",
        images: ["https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=400"],
        featured: false
    },
    {
        id: 3,
        name: "Casual Sneakers",
        category: "Shoes",
        price: 180,
        description: "Comfortable casual sneakers for everyday wear.",
        image: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400",
        images: ["https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400"],
        featured: true
    },
    {
        id: 4,
        name: "Designer Handbag",
        category: "Bags",
        price: 450,
        description: "Luxurious designer handbag with multiple compartments.",
        image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400",
        images: ["https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400"],
        featured: true
    },
    {
        id: 5,
        name: "Leather Backpack",
        category: "Bags",
        price: 380,
        description: "Genuine leather backpack with laptop compartment.",
        image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400",
        images: ["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400"],
        featured: false
    }
];

// Map backend product to frontend format
function mapBackendProduct(product) {
    return {
        id: product._id,
        name: product.product_name,
        category: product.category,
        price: product.sales_price || product.original_price,
        originalPrice: product.original_price,
        description: product.short_description,
        image: product.cover_image,
        images: product.additional_images || [product.cover_image],
        featured: product.featured_product || false,
        brand: product.brand,
        subcategory: product.subcategory,
        sizes: product.sizes || [],
        colors: product.colors || [],
        dimensions: product.dimensions_in_inches,
        stock: product.stock_quantity
    };
}

// API Service
const API = {
    // Fetch all products from backend
    async getProducts(options = {}) {
        if (productsCache && !options.refresh) {
            return productsCache;
        }

        try {
            const params = new URLSearchParams();
            if (options.category) params.append('category', options.category);
            if (options.featured) params.append('featured', 'true');
            if (options.search) params.append('search', options.search);
            if (options.sort) params.append('sort', options.sort);
            if (options.limit) params.append('limit', options.limit.toString());
            if (options.page) params.append('page', options.page.toString());

            const queryString = params.toString();
            const url = `${API_BASE_URL}/products${queryString ? '?' + queryString : ''}`;

            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                productsCache = data.data.map(mapBackendProduct);
                return productsCache;
            } else {
                throw new Error(data.message || 'Failed to fetch products');
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            // Return default products if API fails
            return defaultProducts;
        }
    },

    // Fetch single product by ID
    async getProductById(id) {
        // First check cache
        if (productsCache) {
            const cached = productsCache.find(p => p.id === id);
            if (cached) return cached;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/products/${id}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                return mapBackendProduct(data.data);
            } else {
                throw new Error(data.message || 'Product not found');
            }
        } catch (error) {
            console.error('Error fetching product:', error);
            // Try to find in default products
            return defaultProducts.find(p => p.id === parseInt(id)) || null;
        }
    },

    // Fetch featured products
    async getFeaturedProducts() {
        try {
            const response = await fetch(`${API_BASE_URL}/products/featured/list`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                return data.data.map(mapBackendProduct);
            } else {
                throw new Error(data.message || 'Failed to fetch featured products');
            }
        } catch (error) {
            console.error('Error fetching featured products:', error);
            // Return default featured products
            return defaultProducts.filter(p => p.featured);
        }
    },

    // Fetch products by category
    async getProductsByCategory(category) {
        try {
            const response = await fetch(`${API_BASE_URL}/products/category/${encodeURIComponent(category)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                return data.data.map(mapBackendProduct);
            } else {
                throw new Error(data.message || 'Failed to fetch products');
            }
        } catch (error) {
            console.error('Error fetching products by category:', error);
            // Filter default products by category
            return defaultProducts.filter(p => p.category === category);
        }
    },

    // Get categories from products (extract unique categories)
    async getCategories() {
        if (categoriesCache) {
            return categoriesCache;
        }

        try {
            const products = await this.getProducts();
            const categoryNames = [...new Set(products.map(p => p.category))];
            
            // Map to expected format with icons
            const categoryMap = {
                "Shoes": { name: "Shoes", icon: "👠", subcategories: ["Heels", "Slipper Heels", "Flat Slippers", "Flat Sandals", "Block Sandals", "Block Slippers", "Flat Shoes", "Unisex Slippers", "Sneakers", "Men's Executive Shoes", "Men's Slippers", "Men's Sandals", "Kids Shoes (Girls)", "Kids Shoes (Boys)", "Kids Shoes (Unisex)"] },
                "Bags": { name: "Bags", icon: "👜" },
                "T-Shirts": { name: "T-Shirts", icon: "👕" },
                "Dresses": { name: "Dresses", icon: "👗" },
                "Jeans": { name: "Jeans", icon: "👖" },
                "Underwear": { name: "Underwear", icon: "🩱" },
                "Wigs": { name: "Wigs", icon: "💇" },
                "Hair Bundles": { name: "Hair Bundles", icon: "💆" },
                "Hair Extensions": { name: "Hair Extensions", icon: "✨" },
                "Hair Products & Tools": { name: "Hair Products & Tools", icon: "💈" },
                "Belts": { name: "Belts", icon: "👔" }
            };

            categoriesCache = categoryNames.map(name => categoryMap[name] || { name, icon: "📦" });
            return categoriesCache;
        } catch (error) {
            console.error('Error getting categories:', error);
            return defaultCategories;
        }
    }
};

// Export functions for use in other files
// These functions now fetch from the API instead of using hardcoded data

// Get all products
async function getProducts() {
    return await API.getProducts();
}

// Get featured products
async function getFeaturedProducts() {
    return await API.getFeaturedProducts();
}

// Get products by category
async function getProductsByCategory(category) {
    return await API.getProductsByCategory(category);
}

// Get product by ID
async function getProductById(id) {
    return await API.getProductById(id);
}

// Search products (client-side filtering on cached products)
async function searchProducts(query) {
    const searchTerm = query.toLowerCase();
    const products = await API.getProducts();
    
    return products.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.category.toLowerCase().includes(searchTerm) ||
        (product.description && product.description.toLowerCase().includes(searchTerm))
    );
}

// Get related products
async function getRelatedProducts(productId, limit = 4) {
    const product = await getProductById(productId);
    if (!product) return [];
    
    const products = await API.getProducts();
    
    return products
        .filter(p => p.category === product.category && p.id !== product.id)
        .slice(0, limit);
}

// Get categories
async function getCategories() {
    return await API.getCategories();
}

// Format price to Ghana Cedis
function formatPrice(price) {
    return `GHS ${(price || 0).toFixed(2)}`;
}

// Legacy: Keep synchronous versions for backward compatibility
// These use default/fallback data when API is unavailable
const products = defaultProducts;
const categories = defaultCategories;

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        API,
        getProducts,
        getFeaturedProducts,
        getProductsByCategory,
        getProductById,
        searchProducts,
        getRelatedProducts,
        getCategories,
        formatPrice,
        products,
        categories
    };
}
