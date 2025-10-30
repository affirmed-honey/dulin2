// Mobile menu functionality
// Product database
const products = [
    {
        id: 1,
        name: "Wavy Teddy Mirror",
        category: "Bedroom Items",
        price: 600,
        image: "img/Mirror 1.jpeg"
    },
    {
        id: 2,
        name: "Electric Kettle",
        category: "Kitchen",
        price: 299,
        image: "img/kettle1-removebg-preview.png"
    },
    {
        id: 3,
        name: "Decorative Ornament",
        category: "Ornaments",
        price: 519,
        image: "img/ornanent1.jpg"
    },
    {
        id: 4,
        name: "Office Lamp",
        category: "Lamps",
        price: 921,
        image: "img/lamp1.jpg"
    },
    {
        id: 5,
        name: "Flower Vase",
        category: "Decoration",
        price: 89,
        image: "img/flowervase3.jpg"
    },
    {
        id: 6,
        name: "Storage Rack",
        category: "Storage",
        price: 199,
        image: "img/storagerack1.jpg"
    }
    // Add more products as needed
];

// Cart Management
class Cart {
    constructor() {
        this.items = JSON.parse(localStorage.getItem('cart')) || [];
        this.updateCartCount();
    }

    addItem(productId, name, price, image, quantity = 1) {
        const existingItem = this.items.find(item => item.id === productId);
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.items.push({
                id: productId,
                name: name,
                price: price,
                image: image,
                quantity: quantity
            });
        }
        
        this.saveCart();
        this.updateCartCount();
        this.showNotification('Item added to cart!');
    }

    removeItem(productId) {
        this.items = this.items.filter(item => item.id !== productId);
        this.saveCart();
        this.updateCartCount();
    }

    updateQuantity(productId, quantity) {
        const item = this.items.find(item => item.id === productId);
        if (item) {
            item.quantity = quantity;
            if (quantity <= 0) {
                this.removeItem(productId);
            } else {
                this.saveCart();
                this.updateCartCount();
            }
        }
    }

    saveCart() {
        localStorage.setItem('cart', JSON.stringify(this.items));
    }

    updateCartCount() {
        const cartCount = document.querySelector('.cart-count');
        if (cartCount) {
            const totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
            cartCount.textContent = totalItems;
            cartCount.setAttribute('aria-label', `${totalItems} items in cart`);
        }
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);

        // Trigger animation
        setTimeout(() => notification.classList.add('show'), 10);

        // Remove notification
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }
}

// Initialize cart
const cart = new Cart();

// User Authentication
class UserAuth {
    constructor() {
        this.currentUser = JSON.parse(localStorage.getItem('currentUser'));
        this.updateAuthUI();
    }

    login(email, password) {
        // Simulate API call
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // For demo purposes, accept any email/password
                const user = {
                    id: Date.now(),
                    email: email,
                    name: email.split('@')[0]
                };
                this.currentUser = user;
                localStorage.setItem('currentUser', JSON.stringify(user));
                this.updateAuthUI();
                resolve(user);
            }, 1000);
        });
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        this.updateAuthUI();
    }

    updateAuthUI() {
        const authButton = document.querySelector('.auth-button');
        if (authButton) {
            if (this.currentUser) {
                authButton.textContent = `Hello, ${this.currentUser.name}`;
                authButton.href = 'account.html';
            } else {
                authButton.textContent = 'Login / Sign Up';
                authButton.href = 'login.html';
            }
        }
    }
}

// Initialize authentication
const auth = new UserAuth();

document.addEventListener("DOMContentLoaded", () => {
    // Initialize add to cart buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const productId = button.dataset.productId;
            const productCard = button.closest('.product-card');
            const name = productCard.querySelector('h3').textContent;
            const price = parseFloat(productCard.querySelector('.product-info p').textContent.replace('$', ''));
            const image = productCard.querySelector('img').src;
            
            cart.addItem(productId, name, price, image);
        });
    });

    // Handle product link clicks
    document.querySelectorAll('.product-link').forEach(link => {
        link.addEventListener('click', (e) => {
            const productId = link.closest('.product-card').dataset.productId;
            localStorage.setItem('selectedProduct', productId);
        });
    });
    // Search functionality
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    const searchForm = document.getElementById('search-form');

    function displayResults(results) {
        if (results.length === 0) {
            searchResults.innerHTML = '<div class="no-results">No products found</div>';
        } else {
            searchResults.innerHTML = results.map(product => `
                <div class="search-result-item" data-product-id="${product.id}">
                    <img src="${product.image}" alt="${product.name}">
                    <div class="result-info">
                        <h4>${product.name}</h4>
                        <p>${product.category}</p>
                    </div>
                    <div class="result-price">$${product.price}</div>
                </div>
            `).join('');
        }
        searchResults.classList.add('active');
    }

    function hideResults() {
        setTimeout(() => {
            searchResults.classList.remove('active');
        }, 200);
    }

    function searchProducts(query) {
        return products.filter(product => 
            product.name.toLowerCase().includes(query.toLowerCase()) ||
            product.category.toLowerCase().includes(query.toLowerCase())
        );
    }

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        if (query.length >= 2) {
            const results = searchProducts(query);
            displayResults(results);
        } else {
            hideResults();
        }
    });

    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (query.length >= 2) {
            const results = searchProducts(query);
            displayResults(results);
        }
    });

    // Hide results when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchResults.contains(e.target) && !searchInput.contains(e.target)) {
            hideResults();
        }
    });

    // Handle clicking on search results
    searchResults.addEventListener('click', (e) => {
        const resultItem = e.target.closest('.search-result-item');
        if (resultItem) {
            const productId = resultItem.dataset.productId;
            // You can redirect to the product page or show a modal
            console.log(`Selected product: ${productId}`);
            // For now, we'll just hide the results
            hideResults();
            searchInput.value = '';
        }
    });
    const hamburger = document.querySelector('.hamburger');
    const nav = document.querySelector('nav');
    const navLinks = document.querySelector('.nav-links');
    const body = document.body;

    if (hamburger && nav && navLinks) {
        const isMobile = () => window.innerWidth <= 768;

        // Set initial ARIA attributes
        hamburger.setAttribute('aria-label', 'Menu');
        hamburger.setAttribute('aria-expanded', 'false');
        nav.setAttribute('aria-hidden', 'true');

        const toggleMenu = (open = null) => {
            if (!isMobile()) return;

            const isOpen = open !== null ? open : !nav.classList.contains('active');
            
            hamburger.setAttribute('aria-expanded', isOpen);
            nav.setAttribute('aria-hidden', !isOpen);
            
            if (isOpen) {
                hamburger.classList.add('active');
                nav.classList.add('active');
                navLinks.classList.add('active');
                body.style.overflow = 'hidden';
            } else {
                hamburger.classList.remove('active');
                nav.classList.remove('active');
                navLinks.classList.remove('active');
                body.style.overflow = '';
            }
        };

        // Toggle menu on hamburger click
        hamburger.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMenu();
        });

        // Close menu when clicking on a link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => toggleMenu(false));
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (isMobile() && 
                nav.classList.contains('active') && 
                !nav.contains(e.target) && 
                !hamburger.contains(e.target)) {
                toggleMenu(false);
            }
        });

        // Handle keyboard navigation
        nav.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && nav.classList.contains('active')) {
                toggleMenu(false);
            }
        });

        // Reset styles on window resize
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (!isMobile()) {
                    toggleMenu(false);
                }
            }, 250);
        });
    }
});

// Product carousel controls
const productList = document.querySelector('.product-list');
const prevBtn = document.querySelector('.prev');
const nextBtn = document.querySelector('.next');
if (productList && prevBtn && nextBtn) {
    nextBtn.addEventListener('click', () => {
        productList.scrollBy({ left: 300, behavior: 'smooth' });
    });

    prevBtn.addEventListener('click', () => {
        productList.scrollBy({ left: -300, behavior: 'smooth' });
    });
}

// Testimonial carousel controls
const testimonialList = document.querySelector('.testimonial-list');
const tPrev = document.querySelector('.t-prev');
const tNext = document.querySelector('.t-next');
if (testimonialList && tPrev && tNext) {
    tNext.addEventListener('click', () => {
        testimonialList.scrollBy({ left: 300, behavior: 'smooth' });
    });

    tPrev.addEventListener('click', () => {
        testimonialList.scrollBy({ left: -300, behavior: 'smooth' });
    });
}

// Optional: smooth scroll to top when navigating categories
document.querySelectorAll('.shop-btn').forEach(button => {
  button.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

//Faq page
const accordions = document.querySelectorAll(".accordion");

accordions.forEach((accordion => {
    accordion.addEventListener("click", function () {
        this.classList.toggle("active");

        const panel = this.nextElementSibling;
        if (panel.style.maxHeight) {
            panel.style.maxHeight = null;
            panel.style.padding = "0,20px";
        } else {
            panel.style.maxHeight = panel.scrollHeight + "px";
            panel.style.padding = "0px";
        }

    });
}));

// Newsletter Popup Trigger
window.addEventListener("load", () => {
  setTimeout(() => {
    document.getElementById("newsletterPopup").classList.add("active");
  }, 6000); // show popup after 6 seconds
});

// Close popup
document.querySelector(".close-popup").addEventListener("click", () => {
  document.getElementById("newsletterPopup").classList.remove("active");
});

// Optional: Smooth scroll for all anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    document.querySelector(this.getAttribute("href")).scrollIntoView({
      behavior: "smooth"
    });
  });
});


