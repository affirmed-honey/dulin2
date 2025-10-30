// Get product ID from URL
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

// Elements
const mainImage = document.getElementById('main-product-image');
const productTitle = document.querySelector('.product-title');
const productPrice = document.querySelector('.product-price');
const productDescription = document.querySelector('.product-description');
const quantityInput = document.getElementById('quantity');
const addToCartBtn = document.querySelector('.add-to-cart-btn');
const thumbnailList = document.querySelector('.thumbnail-list');

// Load product details
async function loadProductDetails() {
    try {
        if (!productId) throw new Error('Missing product id');
        // Fetch from local API served by Express
        const response = await fetch(`/api/products/${productId}`);
        if (!response.ok) throw new Error('Product not found');
        const product = await response.json();
        
        // Update page content
    document.title = `DULIN | ${product.name}`;
        document.querySelector('.product-name').textContent = product.name;
        mainImage.src = product.image;
        mainImage.alt = product.name;
        productTitle.textContent = product.name;
        // Product.price is stored as integer cents in DB
    const priceNumber = typeof product.price === 'number' ? product.price : Number(product.price) || 0;
    // Display in Naira (₦), values stored as kobo in DB
    productPrice.textContent = `₦${(priceNumber / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
        productDescription.textContent = product.description || 'No description available.';

        // Set up thumbnails if product has multiple images
        if (product.images && product.images.length > 0) {
            thumbnailList.innerHTML = product.images.map(img => `
                <img src="${img}" alt="${product.name}" class="thumbnail" 
                     onclick="updateMainImage('${img}')">
            `).join('');
        }

        // Set up add to cart functionality
        addToCartBtn.onclick = () => {
            const quantity = Math.max(1, parseInt(quantityInput.value) || 1);
            // Use global addToCart from cart.js; increment quantity accordingly
            if (typeof window.addToCart === 'function') {
                for (let i = 0; i < quantity; i++) {
                    window.addToCart({
                        id: product.id,
                        name: product.name,
                        // cart.js expects price in Naira units (not kobo)
                        price: Math.round(priceNumber / 100),
                        image: product.image
                    });
                }
            } else {
                console.warn('addToCart function not available');
            }
        };

    } catch (error) {
        console.error('Error:', error);
        // Handle error state
        document.querySelector('.product-details').innerHTML = `
            <div class="error-message">
                <h2>Product Not Found</h2>
                <p>Sorry, we couldn't find the product you're looking for.</p>
                <a href="furniture.html" class="btn">Return to Products</a>
            </div>
        `;
    }
}

// Update main image when clicking thumbnails
function updateMainImage(imageSrc) {
    mainImage.src = imageSrc;
    // Update thumbnail active state
    document.querySelectorAll('.thumbnail').forEach(thumb => {
        thumb.classList.toggle('active', thumb.src === imageSrc);
    });
}

// Quantity controls
document.querySelector('.qty-btn.minus').onclick = () => {
    if (quantityInput.value > 1) {
        quantityInput.value = parseInt(quantityInput.value) - 1;
    }
};

document.querySelector('.qty-btn.plus').onclick = () => {
    quantityInput.value = parseInt(quantityInput.value) + 1;
};

// Initialize
loadProductDetails();