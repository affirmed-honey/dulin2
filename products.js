document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('api-products-grid');
  const sortSelect = document.getElementById('sort');
  const searchInput = document.getElementById('product-search');
  const searchForm = document.getElementById('products-search-form');
  const searchResults = document.getElementById('products-search-results');

  if (!grid) return;

  const formatNaira = (kobo) => `₦${Math.round((Number(kobo) || 0) / 100).toLocaleString()}`;
  const formatNairaFromNaira = (n) => `₦${(Number(n)||0).toLocaleString()}`;

  let staticCatalog = [];
  async function loadStaticCatalog() {
    if (staticCatalog.length) return staticCatalog;
    try {
      const res = await fetch('/static-products.json');
      if (!res.ok) return [];
      const data = await res.json();
      staticCatalog = Array.isArray(data) ? data : [];
    } catch(e) {
      staticCatalog = [];
    }
    return staticCatalog;
  }

  async function loadProducts() {
    try {
      grid.innerHTML = '<div class="loading">Loading products...</div>';
      const params = new URLSearchParams();
      if (sortSelect && sortSelect.value) params.set('sort', sortSelect.value);
      if (searchInput && searchInput.value.trim()) params.set('q', searchInput.value.trim());
      const [dbRes, staticItems] = await Promise.all([
        fetch(`/api/products${params.toString() ? `?${params.toString()}` : ''}`),
        loadStaticCatalog(),
      ]);
      if (!dbRes.ok) throw new Error('Failed to load products');
      const dbProducts = await dbRes.json();

      // Map DB products to unified shape
      const dbMapped = (Array.isArray(dbProducts) ? dbProducts : []).map(p => ({
        source: 'db',
        backendId: p.id,
        id: `db-${p.id}`,
        name: p.name,
        category: p.category || '',
        image: p.image,
        priceKobo: p.price,
        priceNaira: Math.round((Number(p.price)||0)/100),
      }));

      // Filter static by q locally
      const q = searchInput && searchInput.value.trim().toLowerCase();
      const staticFiltered = (Array.isArray(staticItems) ? staticItems : []).filter(s => {
        if (!q) return true;
        return (s.name||'').toLowerCase().includes(q) || (s.category||'').toLowerCase().includes(q);
      }).map((s, idx) => ({
        source: 'static',
        backendId: null,
        id: `static-${idx}-${(s.image||'')}`,
        name: s.name,
        category: s.category || '',
        image: s.image,
        priceNaira: Number(s.price) || 0,
      }));

      // Merge and sort
      let merged = [...dbMapped, ...staticFiltered];
      const sort = sortSelect && sortSelect.value;
      if (sort === 'price-asc') merged.sort((a,b)=> (a.priceNaira||0)-(b.priceNaira||0));
      if (sort === 'price-desc') merged.sort((a,b)=> (b.priceNaira||0)-(a.priceNaira||0));
      if (sort === 'name') merged.sort((a,b)=> (a.name||'').localeCompare(b.name||''));

      if (!Array.isArray(merged) || merged.length === 0) {
        grid.innerHTML = '<div class="empty">No products available.</div>';
        return;
      }

      grid.innerHTML = merged.map(p => {
        const img = p.image || 'img/placeholder.png';
        const priceHtml = p.source === 'db' ? formatNaira(p.priceKobo) : formatNairaFromNaira(p.priceNaira);
        const addPayload = p.source === 'db'
          ? { id: p.backendId, name: p.name, price: Math.round((Number(p.priceKobo)||0)/100), image: img }
          : { id: p.id, name: p.name, price: p.priceNaira, image: img };
        const addData = JSON.stringify(addPayload).replace(/'/g, "&apos;");
        const linkStart = p.source === 'db' ? `<a href="product-details.html?id=${p.backendId}" aria-label="View ${p.name}">` : '';
        const linkEnd = p.source === 'db' ? `</a>` : '';
        return `
          <div class="product-card">
            ${linkStart}
              <img src="${img}" alt="${p.name}">
            ${linkEnd}
            <div class="product-info">
              <h3>${p.name}</h3>
              <div class="price">${priceHtml}</div>
              <button class="add-to-cart" data-product='${addData}'>Add to Cart</button>
            </div>
          </div>
        `;
      }).join('');

      // Wire add-to-cart buttons
      grid.querySelectorAll('.add-to-cart').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const dataAttr = e.currentTarget.getAttribute('data-product');
          try {
            const prod = JSON.parse(dataAttr.replace(/&apos;/g, "'"));
            if (typeof window.addToCart === 'function') {
              window.addToCart(prod);
            }
          } catch (err) {
            console.error('Failed to add to cart', err);
          }
        });
      });
    } catch (err) {
      console.error(err);
      grid.innerHTML = '<div class="error">Could not load products. Please try again later.</div>';
    }
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', loadProducts);
  }

  // Search interactions
  let searchDebounce;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(loadProducts, 250);
    });
  }
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      loadProducts();
    });
  }

  // Suggestion dropdown similar to homepage
  const toSuggestionHtml = (item) => `
    <div class="search-result-item" data-source="${item.source}" data-backend-id="${item.backendId ?? ''}">
      <img src="${item.image || 'img/placeholder.png'}" alt="${item.name}">
      <div class="result-info">
        <h4>${item.name}</h4>
        <p>${item.category || ''}</p>
      </div>
      <div class="result-price">₦${(item.priceNaira || Math.round((Number(item.priceKobo)||0)/100) || 0).toLocaleString()}</div>
    </div>`;

  function showSuggestions(list) {
    if (!searchResults) return;
    if (!Array.isArray(list) || list.length === 0) {
      searchResults.innerHTML = '<div class="no-results">No products found</div>';
    } else {
      // Limit suggestions
      const limited = list.slice(0, 8);
      searchResults.innerHTML = limited.map(toSuggestionHtml).join('');
    }
    searchResults.classList.add('active');
  }

  function hideSuggestionsSoon() {
    if (!searchResults) return;
    setTimeout(() => searchResults.classList.remove('active'), 150);
  }

  async function loadSuggestions() {
    if (!searchInput || !searchResults) return;
    const q = searchInput.value.trim();
    if (q.length < 2) { searchResults.classList.remove('active'); return; }
    // Reuse merged dataset from loadProducts path
    const params = new URLSearchParams();
    if (sortSelect && sortSelect.value) params.set('sort', sortSelect.value);
    params.set('q', q);
    const [dbRes, staticItems] = await Promise.all([
      fetch(`/api/products?${params.toString()}`),
      loadStaticCatalog(),
    ]);
    const dbProducts = dbRes.ok ? await dbRes.json() : [];
    const dbMapped = (Array.isArray(dbProducts) ? dbProducts : []).map(p => ({
      source: 'db', backendId: p.id, name: p.name, category: p.category || '', image: p.image, priceKobo: p.price,
    }));
    const qLower = q.toLowerCase();
    const staticFiltered = (Array.isArray(staticItems) ? staticItems : []).filter(s =>
      (s.name||'').toLowerCase().includes(qLower) || (s.category||'').toLowerCase().includes(qLower)
    ).map(s => ({ source: 'static', backendId: null, name: s.name, category: s.category || '', image: s.image, priceNaira: Number(s.price)||0 }));
    const merged = [...dbMapped, ...staticFiltered];
    showSuggestions(merged);
  }

  if (searchInput) {
    let suggestDebounce;
    searchInput.addEventListener('input', () => {
      clearTimeout(suggestDebounce);
      suggestDebounce = setTimeout(loadSuggestions, 200);
    });
    searchInput.addEventListener('blur', hideSuggestionsSoon);
  }

  if (searchResults) {
    searchResults.addEventListener('click', (e) => {
      const item = e.target.closest('.search-result-item');
      if (!item) return;
      const source = item.getAttribute('data-source');
      const backendId = item.getAttribute('data-backend-id');
      if (source === 'db' && backendId) {
        window.location.href = `product-details.html?id=${backendId}`;
        return;
      }
      // For static, just filter the grid by the selected name
      const name = item.querySelector('h4')?.textContent || '';
      if (searchInput) searchInput.value = name;
      loadProducts();
      hideSuggestionsSoon();
    });
    // Hide when clicking outside
    document.addEventListener('click', (e) => {
      if (!searchResults.contains(e.target) && !searchForm.contains(e.target)) {
        searchResults.classList.remove('active');
      }
    });
  }

  loadProducts();
});
