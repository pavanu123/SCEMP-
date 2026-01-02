// Wishlist functionality
let wishlistItems = JSON.parse(localStorage.getItem('loopcart-wishlist')) || [];

// Add item to wishlist
function addToWishlist(product) {
    const existingItem = wishlistItems.find(item => item.id === product.id || item._id === product._id);
    if (!existingItem) {
        wishlistItems.push(product);
        localStorage.setItem('loopcart-wishlist', JSON.stringify(wishlistItems));
        updateWishlistCount();
        return true;
    }
    return false;
}

// Remove item from wishlist
function removeFromWishlist(itemId) {
    wishlistItems = wishlistItems.filter(item => item.id !== itemId && item._id !== itemId);
    localStorage.setItem('loopcart-wishlist', JSON.stringify(wishlistItems));
    renderWishlist();
    updateWishlistCount();
}

// Check if item is in wishlist
function isInWishlist(productId) {
    return wishlistItems.some(item => item.id === productId || item._id === productId);
}

// Render wishlist page
function renderWishlist() {
    const wishlistContainer = document.getElementById('wishlistItems');
    if (!wishlistContainer) return;

    if (wishlistItems.length === 0) {
        wishlistContainer.innerHTML = `
            <div class="empty-wishlist">
                <div class="empty-wishlist-icon">❤️</div>
                <h3>Your wishlist is empty</h3>
                <p>Start adding items to your wishlist by clicking the heart icon!</p>
                <a href="index.html" class="btn btn-primary btn-large">Browse Products</a>
            </div>
        `;
        return;
    }

    wishlistContainer.innerHTML = wishlistItems.map(item => `
        <div class="wishlist-item" data-id="${item._id || item.id}">
            <div class="item-image">
                <img src="${item.image}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/300x300?text=Product+Image'">
            </div>
            <div class="item-details">
                <h3 class="item-title">${item.name}</h3>
                <div class="item-price">₹${item.price || '0.00'}</div>
                <div class="item-actions">
                    <button class="btn btn-primary add-to-cart-btn" onclick="addToCartFromWishlist('${item._id || item.id}')">Add to Cart</button>
                    <button class="btn btn-danger remove-btn" onclick="removeFromWishlist('${item._id || item.id}')">Remove</button>
                </div>
            </div>
        </div>
    `).join('');
}

// Update wishlist count + hearts
function updateWishlistCount() {
    const count = wishlistItems.length;
    document.querySelectorAll('.wishlist-count').forEach(el => {
        el.textContent = count;
        el.style.display = count > 0 ? 'inline' : 'none';
    });
    updateProductHeartIcons();
}

// Update product hearts (sync UI)
function updateProductHeartIcons() {
    document.querySelectorAll('.wishlist-btn').forEach(btn => {
        const productId = btn.getAttribute('data-product-id');
        if (isInWishlist(productId)) {
            btn.innerHTML = '❤️';
            btn.style.color = '#ff4757';
        } else {
            btn.innerHTML = '🤍';
            btn.style.color = '#333';
        }
    });
}

// Add to cart from wishlist
function addToCartFromWishlist(productId) {
    const item = wishlistItems.find(item => item.id === productId || item._id === productId);
    if (item) {
        if (typeof addToCart === 'function') addToCart(item);
        alert(`Added ${item.name} to cart!`);
    }
}

// Initialize wishlist
document.addEventListener('DOMContentLoaded', () => {
    wishlistItems = JSON.parse(localStorage.getItem('loopcart-wishlist')) || [];
    renderWishlist();
    updateWishlistCount();

    // Attach event listeners once products exist
    setTimeout(() => {
        document.querySelectorAll('.wishlist-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const productId = this.getAttribute('data-product-id');
                const product = getProductById(productId);
                if (!product) return;

                if (isInWishlist(productId)) {
                    removeFromWishlist(productId);
                    this.innerHTML = '🤍';
                    this.style.color = '#333';
                } else {
                    addToWishlist(product);
                    this.innerHTML = '❤️';
                    this.style.color = '#ff4757';
                }
            });
        });
    }, 200);
});

function getProductById(productId) {
    if (typeof products !== 'undefined') {
        return products.find(p => p._id === productId || p.id === productId);
    }
    console.warn('getProductById fallback used');
    return { _id: productId, name: 'Product ' + productId, price: 0, image: 'https://via.placeholder.com/300x300?text=Product' };
}
