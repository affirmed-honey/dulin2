// Cart functionality
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Update cart count in navigation
function updateCartCount() {
    const cartCount = document.querySelector('.cart-count');
    if (cartCount) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
    }
}

// Add to cart function
function addToCart(product) {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: 1
        });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    showNotification(`${product.name} has been added to your cart!`);
}

// Show notification
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <p>${message}</p>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// Remove from cart function
function removeFromCart(index) {
  cart.splice(index, 1);
  localStorage.setItem('cart', JSON.stringify(cart));
  renderCartItems();
  updateCartCount();
}

// Update quantity function
function updateQuantity(index, change) {
  cart[index].quantity += change;
  
  if (cart[index].quantity < 1) {
    cart[index].quantity = 1;
  }
  
  localStorage.setItem('cart', JSON.stringify(cart));
  renderCartItems();
  updateCartCount();
}

// Render cart items on cart page
function renderCartItems() {
  const cartItemsContainer = document.getElementById('cart-items');
  
  if (!cartItemsContainer) return;
  
  if (cart.length === 0) {
    cartItemsContainer.innerHTML = '<p>Your cart is empty.</p>';
    document.getElementById('checkout-btn').disabled = true;
    updateCartSummary();
    return;
  }
  
  cartItemsContainer.innerHTML = '';
  
  cart.forEach((item, index) => {
    const cartItem = document.createElement('div');
    cartItem.className = 'cart-item';
    cartItem.innerHTML = `
      <img src="${item.image}" alt="${item.name}" />
      <div class="cart-item-details">
        <h4 class="cart-item-title">${item.name}</h4>
        <p class="cart-item-price">₦${item.price.toLocaleString()}</p>
        <div class="cart-item-quantity">
          <button onclick="updateQuantity(${index}, -1)">-</button>
          <span>${item.quantity}</span>
          <button onclick="updateQuantity(${index}, 1)">+</button>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart(${index})">Remove</button>
      </div>
    `;
    cartItemsContainer.appendChild(cartItem);
  });
  
  updateCartSummary();
}

// Update cart summary
function updateCartSummary() {
  if (!document.getElementById('subtotal')) return;
  
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = subtotal > 50000 ? 0 : 1500; // Free shipping over ₦50,000
  const tax = subtotal * 0.075; // 7.5% tax
  const total = subtotal + shipping + tax;
  
  document.getElementById('subtotal').textContent = `₦${subtotal.toLocaleString()}`;
  document.getElementById('shipping').textContent = `₦${shipping.toLocaleString()}`;
  document.getElementById('tax').textContent = `₦${tax.toLocaleString()}`;
  document.getElementById('total').textContent = `₦${total.toLocaleString()}`;
}

// Initialize cart page
if (document.getElementById('cart-items')) {
  renderCartItems();
  
  // Enable checkout button if cart is not empty
  if (cart.length > 0) {
    document.getElementById('checkout-btn').disabled = false;
  }
}

// Make functions available globally
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;
window.updateCartCount = updateCartCount;