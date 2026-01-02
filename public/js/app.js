// LoopCart Main Application
class LoopCart {
    constructor() {
        this.products = [];
        this.cart = JSON.parse(localStorage.getItem('loopcart-cart')) || [];
        this.wishlist = JSON.parse(localStorage.getItem('loopcart-wishlist')) || [];
        this.init();
    }

    async init() {
        await this.loadProducts();
        this.setupEventListeners();
        this.updateUI();
        this.setupSmoothScrolling();
    }

    async loadProducts(filters = {}) {
        try {
            this.showLoading(true);
            const response = await fetch(`/api/products`);
            const data = await response.json();
            this.products = data.products || this.getSampleProducts();
            this.renderProducts();
        } catch (error) {
            console.log('Using sample products');
            this.products = this.getSampleProducts();
            this.renderProducts();
        } finally {
            this.showLoading(false);
        }
    }

    getSampleProducts() {
        return [
            {
                _id: '1',
                name: "iPhone 12 Pro",
                price: 45000,
                category: "electronics",
                location: "delhi",
                image: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=300&h=200&fit=crop",
                description: "Like new iPhone 12 Pro with 256GB storage. Includes original box and accessories.",
                seller: "Rahul Sharma",
                phone: "+919876543210",
                condition: "excellent",
                isAvailable: true
            },
            {
                _id: '2',
                name: "Wooden Study Table",
                price: 3500,
                category: "furniture",
                location: "mumbai",
                image: "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=300&h=200&fit=crop",
                description: "Solid wooden study table in excellent condition. Perfect for home office.",
                seller: "Priya Patel",
                phone: "+919876543211",
                condition: "good",
                isAvailable: true
            },
            {
                _id: '3',
                name: "Designer Handbag",
                price: 8000,
                category: "clothing",
                location: "bangalore",
                image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=300&h=200&fit=crop",
                description: "Genuine leather handbag from a premium brand. Used only a few times.",
                seller: "Anjali Mehta",
                phone: "+919876543212",
                condition: "excellent",
                isAvailable: true
            }
        ];
    }

    renderProducts() {
        const grid = document.getElementById('products-grid');
        if (!grid) return;

        if (this.products.length === 0) {
            grid.innerHTML = '<div class="col-12 text-center"><p>No products found.</p></div>';
            return;
        }

        grid.innerHTML = this.products.map(product => this.createProductCard(product)).join('');
    }

    createProductCard(product) {
        const isInWishlist = this.wishlist.some(item => item.id === product._id);
        return `
            <div class="col-lg-4 col-md-6">
                <div class="product-card">
                    <div class="position-relative">
                        <div class="product-image" style="background-image: url('${product.image}')"></div>
                        <span class="condition-badge">${product.condition}</span>
                    </div>
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title">${product.name}</h5>
                            <button class="wishlist-btn ${isInWishlist ? 'active' : ''}" onclick="loopCart.toggleWishlist('${product._id}')">
                                <i class="fas fa-heart"></i>
                            </button>
                        </div>
                        <p class="product-price">₹${product.price.toLocaleString('en-IN')}</p>
                        <p class="product-location">
                            <i class="fas fa-map-marker-alt"></i> ${product.location}
                        </p>
                        <p class="card-text">${product.description}</p>
                        <div class="d-flex justify-content-between align-items-center mt-3">
                            <button class="btn btn-primary" onclick="loopCart.addToCart('${product._id}')">
                                <i class="fas fa-cart-plus"></i> Add to Cart
                            </button>
                            <button class="whatsapp-btn" onclick="loopCart.contactSeller('${product._id}')">
                                <i class="fab fa-whatsapp"></i> Contact
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    addToCart(productId) {
        const product = this.products.find(p => p._id === productId);
        if (!product) {
            this.showNotification('Product not found', 'error');
            return;
        }

        const existingItem = this.cart.find(item => item.productId === productId);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.cart.push({
                productId: product._id,
                name: product.name,
                price: product.price,
                image: product.image,
                quantity: 1,
                location: product.location
            });
        }

        localStorage.setItem('loopcart-cart', JSON.stringify(this.cart));
        this.updateUI();
        this.showNotification(`${product.name} added to cart!`, 'success');
    }

    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.productId !== productId);
        localStorage.setItem('loopcart-cart', JSON.stringify(this.cart));
        this.updateUI();
        this.showNotification('Item removed from cart', 'success');
    }

    updateQuantity(productId, newQuantity) {
        if (newQuantity < 1) {
            this.removeFromCart(productId);
            return;
        }

        const item = this.cart.find(item => item.productId === productId);
        if (item) {
            item.quantity = newQuantity;
            localStorage.setItem('loopcart-cart', JSON.stringify(this.cart));
            this.updateUI();
        }
    }

    toggleWishlist(productId) {
        const product = this.products.find(p => p._id === productId);
        if (!product) return;

        const existingIndex = this.wishlist.findIndex(item => item.id === productId);
        if (existingIndex >= 0) {
            this.wishlist.splice(existingIndex, 1);
            this.showNotification('Removed from wishlist', 'success');
        } else {
            this.wishlist.push({
                id: product._id,
                name: product.name,
                price: product.price,
                image: product.image,
                location: product.location
            });
            this.showNotification('Added to wishlist!', 'success');
        }

        localStorage.setItem('loopcart-wishlist', JSON.stringify(this.wishlist));
        this.updateUI();
        this.renderProducts();
    }

    contactSeller(productId) {
        const product = this.products.find(p => p._id === productId);
        if (!product) return;

        const message = `Hi, I'm interested in your ${product.name} listed on LoopCart for ₹${product.price}. Is it still available?`;
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${product.phone}?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
    }

    updateUI() {
        // Update cart count
        const cartCount = this.cart.reduce((total, item) => total + item.quantity, 0);
        const cartCountElement = document.getElementById('cart-count');
        if (cartCountElement) cartCountElement.textContent = cartCount;

        // Update wishlist count
        const wishlistCountElement = document.getElementById('wishlist-count');
        if (wishlistCountElement) wishlistCountElement.textContent = this.wishlist.length;

        // Update cart page
        this.renderCartPage();

        // Update wishlist page
        this.renderWishlistPage();
    }

    renderCartPage() {
        const cartItemsElement = document.getElementById('cart-items');
        const emptyCartElement = document.getElementById('empty-cart-message');
        
        if (!cartItemsElement) return;

        if (this.cart.length === 0) {
            if (emptyCartElement) emptyCartElement.style.display = 'block';
            cartItemsElement.innerHTML = '';
            return;
        }

        if (emptyCartElement) emptyCartElement.style.display = 'none';

        cartItemsElement.innerHTML = this.cart.map(item => `
            <div class="cart-item">
                <div class="d-flex align-items-center">
                    <img src="${item.image}" alt="${item.name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;">
                    <div class="flex-grow-1 ml-3">
                        <h6 class="mb-1">${item.name}</h6>
                        <p class="mb-1 text-muted">
                            <i class="fas fa-map-marker-alt"></i> ${item.location}
                        </p>
                        <p class="mb-0"><strong>₹${item.price.toLocaleString('en-IN')} each</strong></p>
                    </div>
                    <div class="text-right">
                        <p class="product-price mb-2">₹${(item.price * item.quantity).toLocaleString('en-IN')}</p>
                        <div class="d-flex align-items-center justify-content-end">
                            <button class="btn btn-sm btn-outline-secondary" onclick="loopCart.updateQuantity('${item.productId}', ${item.quantity - 1})">-</button>
                            <span class="mx-2" style="min-width: 30px; text-align: center; font-weight: 600;">${item.quantity}</span>
                            <button class="btn btn-sm btn-outline-secondary" onclick="loopCart.updateQuantity('${item.productId}', ${item.quantity + 1})">+</button>
                            <button class="btn btn-sm btn-outline-danger ml-2" onclick="loopCart.removeFromCart('${item.productId}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        this.updateCartSummary();
    }

    updateCartSummary() {
        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = Math.round(subtotal * 0.05); // 5% tax, rounded
        const total = subtotal + tax;

        // Update the display
        const subtotalElement = document.getElementById('cart-subtotal');
        const taxElement = document.getElementById('cart-tax');
        const totalElement = document.getElementById('cart-total');
        const checkoutBtn = document.getElementById('checkout-btn');

        if (subtotalElement) subtotalElement.textContent = `₹${subtotal.toLocaleString('en-IN')}`;
        if (taxElement) taxElement.textContent = `₹${tax.toLocaleString('en-IN')}`;
        if (totalElement) totalElement.textContent = `₹${total.toLocaleString('en-IN')}`;
        
        if (checkoutBtn) checkoutBtn.disabled = this.cart.length === 0;
    }

    renderWishlistPage() {
        const wishlistItemsElement = document.getElementById('wishlist-items');
        const emptyWishlistElement = document.getElementById('empty-wishlist-message');
        
        if (!wishlistItemsElement) return;

        if (this.wishlist.length === 0) {
            wishlistItemsElement.innerHTML = '';
            if (emptyWishlistElement) emptyWishlistElement.style.display = 'block';
            return;
        }

        if (emptyWishlistElement) emptyWishlistElement.style.display = 'none';

        wishlistItemsElement.innerHTML = this.wishlist.map(item => {
            // Find the full product details from products array
            const product = this.products.find(p => p._id === item.id) || item;
            return `
                <div class="col-lg-4 col-md-6">
                    <div class="product-card">
                        <div class="position-relative">
                            <div class="product-image" style="background-image: url('${product.image}')"></div>
                            <span class="condition-badge">${product.condition || 'good'}</span>
                        </div>
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h5 class="card-title">${product.name}</h5>
                                <button class="wishlist-btn active" onclick="loopCart.toggleWishlist('${item.id}')">
                                    <i class="fas fa-heart"></i>
                                </button>
                            </div>
                            <p class="product-price">₹${product.price.toLocaleString('en-IN')}</p>
                            <p class="product-location">
                                <i class="fas fa-map-marker-alt"></i> ${product.location}
                            </p>
                            <p class="card-text">${product.description || 'No description available'}</p>
                            <div class="d-flex justify-content-between align-items-center mt-3">
                                <button class="btn btn-primary" onclick="loopCart.addToCart('${item.id}')">
                                    <i class="fas fa-cart-plus"></i> Add to Cart
                                </button>
                                <button class="whatsapp-btn" onclick="loopCart.contactSeller('${item.id}')">
                                    <i class="fab fa-whatsapp"></i> Contact
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    setupEventListeners() {
        // Search and filter events
        const searchButton = document.getElementById('search-button');
        const searchInput = document.getElementById('search-input');
        
        if (searchButton) searchButton.addEventListener('click', () => this.applyFilters());
        if (searchInput) searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.applyFilters();
        });

        // Cart buttons
        const checkoutBtn = document.getElementById('checkout-btn');
        const clearCartBtn = document.getElementById('clear-cart-btn');

        if (checkoutBtn) checkoutBtn.addEventListener('click', () => this.proceedToCheckout());
        if (clearCartBtn) clearCartBtn.addEventListener('click', () => this.clearCart());
    }

    setupSmoothScrolling() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });
    }

    applyFilters() {
        // Simple filter implementation
        this.renderProducts();
    }

    clearCart() {
        if (this.cart.length === 0) {
            this.showNotification('Cart is already empty!', 'error');
            return;
        }

        if (confirm('Are you sure you want to clear your cart?')) {
            this.cart = [];
            localStorage.setItem('loopcart-cart', JSON.stringify(this.cart));
            this.updateUI();
            this.showNotification('Cart cleared successfully!', 'success');
        }
    }

    proceedToCheckout() {
        if (this.cart.length === 0) {
            this.showNotification('Your cart is empty!', 'error');
            return;
        }

        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = Math.round(subtotal * 0.05);
        const total = subtotal + tax;
        
        this.showNotification(`Proceeding to checkout with total: ₹${total.toLocaleString('en-IN')}`, 'success');
    }

    showLoading(show) {
        const grid = document.getElementById('products-grid');
        if (!grid) return;
        if (show) {
            grid.innerHTML = '<div class="col-12 text-center"><div class="loading-spinner"></div><p>Loading products...</p></div>';
        }
    }

    showNotification(message, type) {
        // Create a simple notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 10px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            background: ${type === 'success' ? '#28a745' : '#dc3545'};
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.loopCart = new LoopCart();
});