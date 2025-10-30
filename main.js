// Mobile menu functionality
// Helper to display Naira from kobo
const toNaira = (kobo) => `₦${Math.round((Number(kobo) || 0) / 100).toLocaleString()}`;

document.addEventListener("DOMContentLoaded", () => {
    // Auth UI: personalize nav and handle logout
    (async function initAuthUI() {
        try {
            const res = await fetch('/api/auth/me');
            const me = res.ok ? await res.json() : null;
            const nav = document.querySelector('.navbar nav .nav-links');
            if (!nav) return;

            // Find existing auth link or placeholder
            let authLink = nav.querySelector('a.auth-button');
            if (!authLink) {
                // Try to find any link that says signUp|Login
                authLink = Array.from(nav.querySelectorAll('a')).find(a => /login|signup|signUp/i.test(a.textContent || '')) || null;
                if (authLink) authLink.classList.add('auth-button');
            }

            if (me && me.email) {
                // Replace auth link with greeting (links to account) and logout
                const li = authLink ? authLink.closest('li') : document.createElement('li');
                if (!li.parentElement) nav.appendChild(li);
                li.innerHTML = '';
                const greet = document.createElement('a');
                greet.href = 'account.html';
                greet.textContent = `Hello, ${me.name || me.email.split('@')[0]}`;
                greet.className = 'auth-greeting';
                const sep = document.createElement('span');
                sep.textContent = ' • ';
                sep.className = 'auth-sep';
                const account = document.createElement('a');
                account.href = 'account.html';
                account.textContent = 'My Account';
                account.className = 'auth-account';
                const sep2 = document.createElement('span');
                sep2.textContent = ' • ';
                sep2.className = 'auth-sep';
                const logout = document.createElement('a');
                logout.href = '#';
                logout.textContent = 'Logout';
                logout.className = 'auth-logout';
                logout.addEventListener('click', async (e) => {
                    e.preventDefault();
                    try {
                        await fetch('/api/auth/logout', { method: 'POST' });
                    } catch {}
                    localStorage.removeItem('dulin_user');
                    window.location.reload();
                });
                li.appendChild(greet);
                li.appendChild(sep);
                li.appendChild(account);
                li.appendChild(sep2);
                li.appendChild(logout);
            } else {
                // Ensure auth link points to login
                if (authLink) authLink.setAttribute('href', 'login.html');
            }
        } catch (e) {
            // ignore UI personalization failure
        }
    })();
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
                        <p>${product.category || ''}</p>
                    </div>
                    <div class="result-price">${toNaira(product.price)}</div>
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

    let staticCache = null;
    async function getStatic() {
        if (staticCache) return staticCache;
        try {
            const res = await fetch('/static-products.json');
            if (!res.ok) return [];
            const data = await res.json();
            staticCache = Array.isArray(data) ? data : [];
        } catch (e) {
            staticCache = [];
        }
        return staticCache;
    }

    async function searchProducts(query) {
        const q = encodeURIComponent(query.trim());
        const [resp, statics] = await Promise.all([
            fetch(`/api/products?q=${q}`),
            getStatic(),
        ]);
        const apiData = resp.ok ? await resp.json() : [];
        const apiList = Array.isArray(apiData) ? apiData : [];
        const qLower = decodeURIComponent(q).toLowerCase();
        const staticMatches = (Array.isArray(statics) ? statics : []).filter(s =>
            (s.name||'').toLowerCase().includes(qLower) || (s.category||'').toLowerCase().includes(qLower)
        ).map(s => ({ id: s.id || null, name: s.name, category: s.category, image: s.image, price: (Number(s.price)||0)*100 }));
        // Merge, prioritize API results, then static, limit to 10
        const merged = [...apiList, ...staticMatches].slice(0, 10);
        return merged;
    }

    searchInput.addEventListener('input', async (e) => {
        const query = e.target.value.trim();
        if (query.length >= 2) {
            const results = await searchProducts(query);
            displayResults(results);
        } else {
            hideResults();
        }
    });

    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (query.length >= 2) {
            const results = await searchProducts(query);
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
        // Navigate to product details page
        window.location.href = `product-details.html?id=${productId}`;
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


