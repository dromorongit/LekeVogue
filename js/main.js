// Leke Vogue Enterprise - Main JavaScript

// Cart Management
const Cart = {
    // Get cart from localStorage
    getCart() {
        const cart = localStorage.getItem('lekevogue_cart');
        return cart ? JSON.parse(cart) : [];
    },
    
    // Save cart to localStorage
    saveCart(cart) {
        localStorage.setItem('lekevogue_cart', JSON.stringify(cart));
        this.updateCartCount();
    },
    
    // Add item to cart
    addItem(productId, quantity = 1) {
        const cart = this.getCart();
        const existingItem = cart.find(item => item.id === productId);
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.push({ id: productId, quantity: quantity });
        }
        
        this.saveCart(cart);
        this.showToast('Item added to cart!', 'success');
    },
    
    // Remove item from cart
    removeItem(productId) {
        let cart = this.getCart();
        cart = cart.filter(item => item.id !== productId);
        this.saveCart(cart);
        this.showToast('Item removed from cart', 'success');
        
        // Reload page if on cart or checkout page
        if (window.location.pathname.includes('cart.html') || 
            window.location.pathname.includes('checkout.html')) {
            setTimeout(() => window.location.reload(), 500);
        }
    },
    
    // Update item quantity
    updateQuantity(productId, quantity) {
        const cart = this.getCart();
        const item = cart.find(item => item.id === productId);
        
        if (item) {
            if (quantity <= 0) {
                this.removeItem(productId);
                return;
            }
            item.quantity = quantity;
            this.saveCart(cart);
        }
        
        // Reload if on cart page
        if (window.location.pathname.includes('cart.html')) {
            setTimeout(() => window.location.reload(), 100);
        }
    },
    
    // Get cart items with full product details
    getCartItems() {
        const cart = this.getCart();
        return cart.map(item => {
            const product = getProductById(item.id);
            return {
                ...product,
                quantity: item.quantity,
                total: product ? product.price * item.quantity : 0
            };
        }).filter(item => item.id);
    },
    
    // Get cart total
    getCartTotal() {
        const items = this.getCartItems();
        return items.reduce((sum, item) => sum + item.total, 0);
    },
    
    // Get cart count
    getCartCount() {
        const cart = this.getCart();
        return cart.reduce((sum, item) => sum + item.quantity, 0);
    },
    
    // Update cart count in header
    updateCartCount() {
        const countElement = document.querySelector('.cart-count');
        if (countElement) {
            const count = this.getCartCount();
            countElement.textContent = count;
            countElement.style.display = count > 0 ? 'flex' : 'none';
        }
    },
    
    // Clear cart
    clearCart() {
        localStorage.removeItem('lekevogue_cart');
        this.updateCartCount();
    },
    
    // Show toast notification
    showToast(message, type = 'success') {
        // Remove existing toast
        const existingToast = document.querySelector('.toast');
        if (existingToast) existingToast.remove();
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

// UI Utilities
const UI = {
    // Initialize mobile menu
    initMobileMenu() {
        const menuBtn = document.querySelector('.mobile-menu-btn');
        const navLinks = document.querySelector('.nav-links');
        
        if (menuBtn && navLinks) {
            menuBtn.addEventListener('click', () => {
                navLinks.classList.toggle('active');
                menuBtn.classList.toggle('active');
            });
        }
    },
    
    // Create product card HTML
    createProductCard(product) {
        return `
            <div class="product-card" data-id="${product.id}">
                <div class="product-image">
                    <img src="${product.image}" alt="${product.name}" loading="lazy">
                    <div class="product-overlay">
                        <a href="product.html?id=${product.id}" class="btn btn-primary">View More</a>
                    </div>
                </div>
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p class="product-price">${formatPrice(product.price)}</p>
                    <div class="quantity-controls">
                        <button class="qty-btn minus" data-id="${product.id}">-</button>
                        <span class="qty-value" data-id="${product.id}">1</span>
                        <button class="qty-btn plus" data-id="${product.id}">+</button>
                    </div>
                    <button class="btn btn-secondary add-to-cart" data-id="${product.id}">Add to Cart</button>
                </div>
            </div>
        `;
    },
    
    // Render products grid
    renderProducts(products, container) {
        if (!container) return;
        
        if (products.length === 0) {
            container.innerHTML = '<p class="text-center">No products found</p>';
            return;
        }
        
        container.innerHTML = products.map(product => this.createProductCard(product)).join('');
        
        // Re-attach event listeners
        this.attachProductCardListeners();
    },
    
    // Attach event listeners to product cards
    attachProductCardListeners() {
        // Add to cart buttons
        document.querySelectorAll('.add-to-cart').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = parseInt(e.target.dataset.id);
                const qtySpan = document.querySelector(`.qty-value[data-id="${productId}"]`);
                const quantity = qtySpan ? parseInt(qtySpan.textContent) : 1;
                Cart.addItem(productId, quantity);
            });
        });
        
        // Quantity buttons
        document.querySelectorAll('.qty-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = e.target.dataset.id;
                const qtySpan = document.querySelector(`.qty-value[data-id="${productId}"]`);
                let quantity = parseInt(qtySpan.textContent);
                
                if (e.target.classList.contains('plus')) {
                    quantity++;
                } else if (e.target.classList.contains('minus')) {
                    quantity = Math.max(1, quantity - 1);
                }
                
                qtySpan.textContent = quantity;
            });
        });
    },
    
    // Render categories
    renderCategories(categories, container) {
        if (!container) return;
        
        container.innerHTML = categories.map((cat, index) => `
            <div class="category-card ${index === 0 ? 'active' : ''}" data-category="${cat.name}">
                <div class="category-icon">${cat.icon}</div>
                <h4>${cat.name}</h4>
            </div>
        `).join('');
    },
    
    // Initialize search functionality
    initSearch() {
        const searchInput = document.getElementById('searchInput');
        const searchResults = document.getElementById('searchResults');
        
        if (!searchInput || !searchResults) return;
        
        let searchTimeout;
        
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            
            if (query.length < 2) {
                searchResults.classList.remove('active');
                return;
            }
            
            searchTimeout = setTimeout(() => {
                const results = searchProducts(query);
                
                if (results.length > 0) {
                    searchResults.innerHTML = results.slice(0, 6).map(product => `
                        <a href="product.html?id=${product.id}" class="search-result-item">
                            <img src="${product.image}" alt="${product.name}">
                            <div class="search-result-info">
                                <h4>${product.name}</h4>
                                <p>${formatPrice(product.price)}</p>
                            </div>
                        </a>
                    `).join('');
                    searchResults.classList.add('active');
                } else {
                    searchResults.innerHTML = '<p style="padding: 15px; text-align: center;">No products found</p>';
                    searchResults.classList.add('active');
                }
            }, 300);
        });
        
        // Close search results on click outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                searchResults.classList.remove('active');
            }
        });
    },
    
    // Initialize category filter
    initCategoryFilter() {
        const categoryCards = document.querySelectorAll('.category-card');
        
        categoryCards.forEach(card => {
            card.addEventListener('click', () => {
                const category = card.dataset.category;
                
                // Update active state
                categoryCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                
                // Filter products
                let filteredProducts;
                if (category === 'all') {
                    filteredProducts = products;
                } else {
                    filteredProducts = getProductsByCategory(category);
                }
                
                // Find products grid and render
                const productsGrid = document.querySelector('.products-grid');
                if (productsGrid) {
                    this.renderProducts(filteredProducts, productsGrid);
                }
                
                // Update URL if on shop page
                if (window.location.pathname.includes('shop.html')) {
                    const url = new URL(window.location);
                    url.searchParams.set('category', category);
                    window.history.pushState({}, '', url);
                }
            });
        });
    },
    
    // Initialize all
    init() {
        this.initMobileMenu();
        this.initSearch();
        this.initCategoryFilter();
        Cart.updateCartCount();
    }
};

// Paystack Integration
const Paystack = {
    // Initialize Paystack payment
    async initializePayment(email, amount, onSuccess, onClose) {
        // Note: Replace with your actual Paystack public key
        const publicKey = 'pk_test_your_public_key_here';
        
        const handler = PaystackPop.setup({
            key: publicKey,
            email: email,
            amount: amount * 100, // Convert to kobo
            currency: 'GHS',
            ref: 'LV' + Date.now(),
            onClose: () => {
                if (onClose) onClose();
            },
            callback: (response) => {
                if (onSuccess) onSuccess(response);
            }
        });
        
        handler.openIframe();
    }
};

// WhatsApp Integration
const WhatsApp = {
    // Generate order message
    generateOrderMessage(customerName, phone, items, total) {
        let message = `*New Order from Leke Vogue Website*\n\n`;
        message += `*Customer Details*\n`;
        message += `Name: ${customerName}\n`;
        message += `Phone: ${phone}\n\n`;
        message += `*Ordered Items*\n`;
        
        items.forEach(item => {
            message += `- ${item.name} x${item.quantity} = GHS ${item.total.toFixed(2)}\n`;
        });
        
        message += `\n*Total Amount: GHS ${total.toFixed(2)}*\n\n`;
        message += `Order placed via Leke Vogue Website`;
        
        return encodeURIComponent(message);
    },
    
    // Open WhatsApp with order
    sendOrder(customerName, phone, items, total) {
        const message = this.generateOrderMessage(customerName, phone, items, total);
        const phoneNumber = '233500098510'; // Business phone number
        const url = `https://wa.me/${phoneNumber}?text=${message}`;
        window.open(url, '_blank');
    }
};

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    UI.init();
});

// Export for global use
window.Cart = Cart;
window.UI = UI;
window.Paystack = Paystack;
window.WhatsApp = WhatsApp;
window.products = products;
window.categories = categories;
window.getFeaturedProducts = getFeaturedProducts;
window.getProductsByCategory = getProductsByCategory;
window.getProductById = getProductById;
window.searchProducts = searchProducts;
window.getRelatedProducts = getRelatedProducts;
window.formatPrice = formatPrice;
