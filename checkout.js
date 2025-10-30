// Checkout functionality
document.addEventListener('DOMContentLoaded', function() {
  const checkoutBtn = document.getElementById('checkout-btn');
  const checkoutModal = document.getElementById('checkout-modal');
  const successModal = document.getElementById('success-modal');
  const closeBtn = document.querySelector('.close');
  const checkoutForm = document.getElementById('checkout-form');
  const continueShoppingBtn = document.getElementById('continue-shopping');
  const successBody = successModal ? successModal.querySelector('p') : null;
  
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', function() {
      checkoutModal.style.display = 'block';
    });
  }
  
  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      checkoutModal.style.display = 'none';
    });
  }
  
  if (continueShoppingBtn) {
    continueShoppingBtn.addEventListener('click', function() {
      successModal.style.display = 'none';
      window.location.href = 'index.html';
    });
  }
  
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const name = document.getElementById('name').value;
      const email = document.getElementById('email').value;

      // Build items payload from localStorage cart
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      if (!Array.isArray(cart) || cart.length === 0) {
        alert('Your cart is empty.');
        return;
      }
      const items = cart.map((it) => ({ productId: it.id, quantity: it.quantity }));

      try {
        const resp = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, items })
        });
        if (!resp.ok) throw new Error('Failed to place order');
        const data = await resp.json();

        // Clear cart after successful order
        localStorage.removeItem('cart');
        updateCartCount();

        // Hide checkout modal and show success modal with order details
        checkoutModal.style.display = 'none';
        if (successBody) {
          successBody.innerHTML = `Order #${data.id} placed successfully. Total: ₦${Number(data.total).toLocaleString()}`;
        }
        successModal.style.display = 'block';
      } catch (err) {
        console.error(err);
        alert('There was a problem completing your order. Please try again.');
      }
    });
  }
  
  // Close modals when clicking outside
  window.addEventListener('click', function(event) {
    if (event.target === checkoutModal) {
      checkoutModal.style.display = 'none';
    }
    if (event.target === successModal) {
      successModal.style.display = 'none';
      window.location.href = 'index.html';
    }
  });
});