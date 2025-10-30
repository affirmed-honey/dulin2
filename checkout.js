// Checkout functionality
document.addEventListener('DOMContentLoaded', function() {
  const checkoutBtn = document.getElementById('checkout-btn');
  const checkoutModal = document.getElementById('checkout-modal');
  const successModal = document.getElementById('success-modal');
  const closeBtn = document.querySelector('.close');
  const checkoutForm = document.getElementById('checkout-form');
  const continueShoppingBtn = document.getElementById('continue-shopping');
  
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
    checkoutForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // In a real app, you would process the payment here
      // For this demo, we'll just show the success message
      
      // Get form values
      const name = document.getElementById('name').value;
      const email = document.getElementById('email').value;
      
      // Clear the cart
      localStorage.removeItem('cart');
      updateCartCount();
      
      // Hide checkout modal and show success modal
      checkoutModal.style.display = 'none';
      successModal.style.display = 'block';
      
      // In a real app, you would send this data to your server
      console.log('Order completed for:', name, email);
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