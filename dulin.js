document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    menuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });

    // Basic cart functionality (placeholder)
    const addToCartButtons = document.querySelectorAll('button');
    addToCartButtons.forEach(button => {
        button.addEventListener('click', () => {
            alert('Item added to cart!');
            // Implement actual cart logic here, e.g., using localStorage
        });
    });
});