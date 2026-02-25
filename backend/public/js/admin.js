// Leke Vogue Admin Dashboard JavaScript
const API_BASE = '/api';

// State management
let authToken = localStorage.getItem('adminToken');
let currentPage = 1;
let currentCategory = '';
let currentSearch = '';

// DOM Elements
const loginPage = document.getElementById('loginPage');
const dashboardPage = document.getElementById('dashboardPage');
const loginForm = document.getElementById('loginForm');
const productForm = document.getElementById('productForm');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  if (authToken) {
    verifyToken();
  } else {
    showLoginPage();
  }
  
  setupEventListeners();
  setupEditModal();
});

// Edit Modal Functions
function setupEditModal() {
  const modal = document.getElementById('editProductModal');
  const closeBtn = document.getElementById('closeEditModal');
  const cancelBtn = document.getElementById('cancelEditBtn');
  const form = document.getElementById('editProductForm');

  closeBtn.addEventListener('click', closeEditModal);
  cancelBtn.addEventListener('click', closeEditModal);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeEditModal();
    }
  });

  form.addEventListener('submit', handleEditProductSubmit);

  // Setup image upload for edit modal
  setupEditImageUpload();
}

function openEditModal() {
  const modal = document.getElementById('editProductModal');
  modal.classList.add('active');
}

function closeEditModal() {
  const modal = document.getElementById('editProductModal');
  modal.classList.remove('active');
  document.getElementById('editProductForm').reset();
  document.getElementById('editCoverImagePreview').innerHTML = '';
  document.getElementById('editAdditionalImagesPreview').innerHTML = '';
}

let editCoverImageFile = null;
let editAdditionalImagesFiles = [];

function setupEditImageUpload() {
  const coverUpload = document.getElementById('editCoverImageUpload');
  const coverInput = document.getElementById('editCoverImage');
  
  coverUpload.addEventListener('click', () => coverInput.click());
  coverInput.addEventListener('change', (e) => {
    if (e.target.files[0]) {
      editCoverImageFile = e.target.files[0];
      previewImage(editCoverImageFile, 'editCoverImagePreview');
    }
  });

  const additionalUpload = document.getElementById('editAdditionalImagesUpload');
  const additionalInput = document.getElementById('editAdditionalImages');
  
  additionalUpload.addEventListener('click', () => additionalInput.click());
  additionalInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      editAdditionalImagesFiles = Array.from(e.target.files).slice(0, 5);
      previewMultipleImages(editAdditionalImagesFiles, 'editAdditionalImagesPreview');
    }
  });
}

async function handleEditProductSubmit(e) {
  e.preventDefault();
  
  const productId = document.getElementById('editProductId').value;
  
  const productName = document.getElementById('editProductName').value;
  const brand = document.getElementById('editBrand').value;
  const shortDescription = document.getElementById('editShortDescription').value;
  const originalPrice = parseFloat(document.getElementById('editOriginalPrice').value);
  const salesPriceInput = document.getElementById('editSalesPrice').value;
  const salesPrice = salesPriceInput && salesPriceInput.trim() !== '' ? parseFloat(salesPriceInput) : null;
  const category = document.getElementById('editCategory').value;
  const stockQuantity = parseInt(document.getElementById('editStockQuantity').value);
  
  if (!originalPrice && originalPrice !== 0) {
    showToast('Original price is required', 'error');
    return;
  }
  
  if (salesPrice !== null && salesPrice > originalPrice) {
    showToast('Sales price cannot exceed original price', 'error');
    return;
  }
  
  const formData = new FormData();
  formData.append('product_name', productName);
  formData.append('brand', brand);
  formData.append('short_description', shortDescription);
  formData.append('original_price', originalPrice);
  // Only append sales_price if explicitly provided
  if (salesPrice !== null) {
    formData.append('sales_price', salesPrice);
  }
  formData.append('category', category);
  formData.append('subcategory', document.getElementById('editSubcategory').value);
  formData.append('sizes', document.getElementById('editSizes').value);
  formData.append('colors', document.getElementById('editColors').value);
  formData.append('dimensions_in_inches', document.getElementById('editDimensions').value);
  formData.append('stock_quantity', stockQuantity || 0);
  formData.append('featured_product', document.getElementById('editFeaturedProduct').checked);
  
  if (editCoverImageFile) {
    formData.append('cover_image', editCoverImageFile);
  }
  
  editAdditionalImagesFiles.forEach(file => {
    formData.append('additional_images', file);
  });
  
  try {
    showLoading();
    
    const response = await fetch(`${API_BASE}/products/${productId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast('Product updated successfully!', 'success');
      closeEditModal();
      loadProducts(currentPage);
    } else {
      showToast(data.message || 'Failed to update product', 'error');
    }
  } catch (error) {
    console.error('Update product error:', error);
    showToast('Failed to update product', 'error');
  } finally {
    hideLoading();
  }
}

// Modify editProduct function to open modal
async function editProduct(id) {
  try {
    showLoading();
    
    const response = await fetch(`${API_BASE}/products/${id}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    const data = await response.json();
    
    if (data.success) {
      const product = data.data;
      
      document.getElementById('editProductId').value = product._id;
      document.getElementById('editProductName').value = product.product_name;
      document.getElementById('editBrand').value = product.brand || '';
      document.getElementById('editShortDescription').value = product.short_description;
      document.getElementById('editOriginalPrice').value = product.original_price;
      // Only set sales_price if it has a value (not null)
      document.getElementById('editSalesPrice').value = product.sales_price || '';
      document.getElementById('editCategory').value = product.category;
      document.getElementById('editSubcategory').value = product.subcategory || '';
      document.getElementById('editSizes').value = product.sizes ? product.sizes.join(', ') : '';
      document.getElementById('editColors').value = product.colors ? product.colors.join(', ') : '';
      document.getElementById('editDimensions').value = product.dimensions_in_inches || '';
      document.getElementById('editStockQuantity').value = product.stock_quantity;
      document.getElementById('editFeaturedProduct').checked = product.featured_product;
      
      // Show existing cover image
      if (product.cover_image) {
        document.getElementById('editCoverImagePreview').innerHTML = `
          <div class="image-preview-item">
            <img src="${product.cover_image}" alt="Current Cover">
          </div>
        `;
      }
      
      // Show existing additional images
      if (product.additional_images && product.additional_images.length > 0) {
        document.getElementById('editAdditionalImagesPreview').innerHTML = product.additional_images.map(img => `
          <div class="image-preview-item">
            <img src="${img}" alt="Additional Image">
          </div>
        `).join('');
      }
      
      openEditModal();
    } else {
      showToast('Failed to load product', 'error');
    }
  } catch (error) {
    console.error('Edit product error:', error);
    showToast('Failed to load product', 'error');
  } finally {
    hideLoading();
  }
}

// Event Listeners
function setupEventListeners() {
  // Login form
  loginForm.addEventListener('submit', handleLogin);

  // Hamburger menu
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const sidebar = document.querySelector('.sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');

  if (hamburgerBtn) {
    hamburgerBtn.addEventListener('click', () => {
      sidebar.classList.toggle('active');
      sidebarOverlay.classList.toggle('active');
    });
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', () => {
      sidebar.classList.remove('active');
      sidebarOverlay.classList.remove('active');
    });
  }

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);
  
  // Navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.getAttribute('data-page');
      if (page) {
        showPage(page);
      }
    });
  });
  
  // Search and filter
  document.getElementById('searchInput').addEventListener('input', debounce(handleSearch, 500));
  document.getElementById('categoryFilter').addEventListener('change', handleCategoryFilter);
  
  // Product form
  productForm.addEventListener('submit', handleProductSubmit);
  
  // View All and Add New Product buttons
  document.getElementById('viewAllBtn').addEventListener('click', () => showPage('products'));
  document.getElementById('addNewProductBtn').addEventListener('click', () => showPage('add-product'));
  document.getElementById('cancelBtn').addEventListener('click', () => showPage('products'));
  
  // Image upload areas
  setupImageUpload();
}

// Authentication
async function handleLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  showLoading();
  
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      authToken = data.token;
      localStorage.setItem('adminToken', authToken);
      showToast('Login successful!', 'success');
      showDashboardPage();
      loadDashboard();
    } else {
      showToast(data.message || 'Login failed', 'error');
    }
  } catch (error) {
    console.error('Login error:', error);
    showToast('Login failed. Please try again.', 'error');
  } finally {
    hideLoading();
  }
}

async function verifyToken() {
  try {
    const response = await fetch(`${API_BASE}/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      showDashboardPage();
      loadDashboard();
    } else {
      showLoginPage();
    }
  } catch (error) {
    console.error('Token verification error:', error);
    showLoginPage();
  }
}

function handleLogout() {
  authToken = null;
  localStorage.removeItem('adminToken');
  showLoginPage();
  showToast('Logged out successfully', 'success');
}

// Page Navigation
function showLoginPage() {
  loginPage.style.display = 'flex';
  dashboardPage.style.display = 'none';
}

function showDashboardPage() {
  loginPage.style.display = 'none';
  dashboardPage.style.display = 'flex';
}

function showPage(page) {
  // Close mobile sidebar when navigating
  const sidebar = document.querySelector('.sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  if (window.innerWidth <= 768) {
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
  }

  // Update navigation active state
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('data-page') === page) {
      item.classList.add('active');
    }
  });
  
  // Hide all views
  document.getElementById('dashboardView').style.display = 'none';
  document.getElementById('productsView').style.display = 'none';
  document.getElementById('addProductView').style.display = 'none';
  
  // Show requested view
  switch(page) {
    case 'dashboard':
      document.getElementById('dashboardView').style.display = 'block';
      loadDashboard();
      break;
    case 'products':
      document.getElementById('productsView').style.display = 'block';
      loadProducts();
      break;
    case 'add-product':
      document.getElementById('addProductView').style.display = 'block';
      resetProductForm();
      break;
  }
}

// Dashboard
async function loadDashboard() {
  try {
    const response = await fetch(`${API_BASE}/products/stats`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      document.getElementById('totalProducts').textContent = data.data.totalProducts;
      document.getElementById('featuredProducts').textContent = data.data.featuredProducts;
      document.getElementById('lowStockItems').textContent = data.data.lowStockItems;
      document.getElementById('outOfStock').textContent = data.data.outOfStock;
    }
    
    // Load recent products
    const productsResponse = await fetch(`${API_BASE}/products?limit=5&sort=desc`);
    const productsData = await productsResponse.json();
    
    if (productsData.success) {
      renderRecentProducts(productsData.data);
    }
  } catch (error) {
    console.error('Load dashboard error:', error);
  }
}

function renderRecentProducts(products) {
  const tbody = document.getElementById('recentProductsTable');
  tbody.innerHTML = products.map(product => {
    // Calculate display price: use sales_price if it's less than original_price
    const displayPrice = (product.sales_price && product.sales_price < product.original_price) 
      ? product.sales_price 
      : product.original_price;
    const showOriginal = product.sales_price && product.sales_price < product.original_price;
    
    return `
    <tr>
      <td>
        <div class="product-info">
          <img src="${product.cover_image}" alt="${product.product_name}" class="product-thumb" onerror="this.src='https://via.placeholder.com/50'">
          <div>
            <div class="product-name">${product.product_name}</div>
            <div class="product-brand">${product.brand}</div>
          </div>
        </div>
      </td>
      <td>${product.category}</td>
      <td>
        <span class="price">GH₵${displayPrice.toFixed(2)}</span>
        ${showOriginal ? `<br><span class="original-price">GH₵${product.original_price.toFixed(2)}</span>` : ''}
      </td>
      <td>
        <span class="stock-badge ${getStockClass(product.stock_quantity)}">${product.stock_quantity}</span>
      </td>
      <td>
        ${product.featured_product ? '<span class="featured-badge">Featured</span>' : '-'}
      </td>
    </tr>
  `}).join('');
}

// Products
async function loadProducts(page = 1) {
  currentPage = page;
  
  let url = `${API_BASE}/products?page=${page}&limit=10`;
  
  if (currentCategory) {
    url += `&category=${currentCategory}`;
  }
  
  if (currentSearch) {
    url += `&search=${encodeURIComponent(currentSearch)}`;
  }
  
  try {
    showLoading();
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.success) {
      renderProductsTable(data.data);
      renderPagination(data.page, data.pages);
    } else {
      showToast('Failed to load products', 'error');
    }
  } catch (error) {
    console.error('Load products error:', error);
    showToast('Failed to load products', 'error');
  } finally {
    hideLoading();
  }
}

function renderProductsTable(products) {
  const tbody = document.getElementById('productsTable');
  
  if (products.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <i class="fas fa-box-open"></i>
            <h3>No Products Found</h3>
            <p>Add your first product to get started</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = products.map(product => {
    // Calculate display price: use sales_price if it's less than original_price
    const displayPrice = (product.sales_price && product.sales_price < product.original_price) 
      ? product.sales_price 
      : product.original_price;
    const showOriginal = product.sales_price && product.sales_price < product.original_price;
    
    return `
    <tr>
      <td>
        <div class="product-info">
          <img src="${product.cover_image}" alt="${product.product_name}" class="product-thumb" onerror="this.src='https://via.placeholder.com/50'">
          <div>
            <div class="product-name">${product.product_name}</div>
            <div class="product-brand">${product.brand}</div>
          </div>
        </div>
      </td>
      <td>${product.category}</td>
      <td>
        <span class="price">GH₵${displayPrice.toFixed(2)}</span>
        ${showOriginal ? `<br><span class="original-price">GH₵${product.original_price.toFixed(2)}</span>` : ''}
      </td>
      <td>
        <span class="stock-badge ${getStockClass(product.stock_quantity)}">${product.stock_quantity}</span>
      </td>
      <td>
        ${product.featured_product ? '<span class="featured-badge">Featured</span>' : '-'}
      </td>
      <td>
        <div class="actions">
          <button class="edit-btn" data-id="${product._id}" title="Edit">
            Edit
          </button>
          <button class="delete-btn" data-id="${product._id}" title="Delete">
            Delete
          </button>
        </div>
      </td>
    </tr>
  `}).join('');

  // Add event listeners to buttons
  tbody.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => editProduct(btn.dataset.id));
  });
  tbody.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteProduct(btn.dataset.id));
  });
}

function renderPagination(page, pages) {
  const pagination = document.getElementById('pagination');
  
  if (pages <= 1) {
    pagination.innerHTML = '';
    return;
  }
  
  let html = `
    <button class="page-btn" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''}>
      <i class="fas fa-chevron-left"></i>
    </button>
  `;
  
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || (i >= page - 1 && i <= page + 1)) {
      html += `<button class="page-btn" data-page="${i}" ${i === page ? 'style="background: var(--primary-purple);"' : ''}>${i}</button>`;
    } else if (i === page - 2 || i === page + 2) {
      html += `<span>...</span>`;
    }
  }
  
  html += `
    <button class="page-btn" data-page="${page + 1}" ${page === pages ? 'disabled' : ''}>
      <i class="fas fa-chevron-right"></i>
    </button>
  `;
  
  pagination.innerHTML = html;
  
  // Add event listeners to pagination buttons
  pagination.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!btn.disabled) {
        loadProducts(parseInt(btn.dataset.page));
      }
    });
  });
}

function handleSearch(e) {
  currentSearch = e.target.value;
  loadProducts(1);
}

function handleCategoryFilter(e) {
  currentCategory = e.target.value;
  loadProducts(1);
}

function getStockClass(quantity) {
  if (quantity === 0) return 'out-of-stock';
  if (quantity < 10) return 'low-stock';
  return 'in-stock';
}

// Product Form
function resetProductForm() {
  document.getElementById('productId').value = '';
  document.getElementById('formTitle').textContent = 'Add New Product';
  document.getElementById('submitBtn').innerHTML = '<i class="fas fa-save"></i> Save Product';
  productForm.reset();
  document.getElementById('coverImagePreview').innerHTML = '';
  document.getElementById('additionalImagesPreview').innerHTML = '';
}

let coverImageFile = null;
let additionalImagesFiles = [];

function setupImageUpload() {
  // Cover image
  const coverUpload = document.getElementById('coverImageUpload');
  const coverInput = document.getElementById('coverImage');
  
  coverUpload.addEventListener('click', () => coverInput.click());
  coverInput.addEventListener('change', (e) => {
    if (e.target.files[0]) {
      coverImageFile = e.target.files[0];
      previewImage(coverImageFile, 'coverImagePreview');
    }
  });
  
  // Additional images
  const additionalUpload = document.getElementById('additionalImagesUpload');
  const additionalInput = document.getElementById('additionalImages');
  
  additionalUpload.addEventListener('click', () => additionalInput.click());
  additionalInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      additionalImagesFiles = Array.from(e.target.files).slice(0, 5);
      previewMultipleImages(additionalImagesFiles, 'additionalImagesPreview');
    }
  });
}

function previewImage(file, previewId) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const preview = document.getElementById(previewId);
    preview.innerHTML = `
      <div class="image-preview-item">
        <img src="${e.target.result}" alt="Preview">
        <button type="button" class="remove-btn" onclick="removeCoverImage()">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
  };
  reader.readAsDataURL(file);
}

function previewMultipleImages(files, previewId) {
  const preview = document.getElementById(previewId);
  preview.innerHTML = '';
  
  files.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.innerHTML += `
        <div class="image-preview-item">
          <img src="${e.target.result}" alt="Preview ${index + 1}">
          <button type="button" class="remove-btn" onclick="removeAdditionalImage(${index})">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `;
    };
    reader.readAsDataURL(file);
  });
}

function removeCoverImage() {
  coverImageFile = null;
  document.getElementById('coverImagePreview').innerHTML = '';
  document.getElementById('coverImage').value = '';
}

function removeAdditionalImage(index) {
  additionalImagesFiles.splice(index, 1);
  previewMultipleImages(additionalImagesFiles, 'additionalImagesPreview');
}

async function handleProductSubmit(e) {
  e.preventDefault();
  
  const productId = document.getElementById('productId').value;
  const isEdit = !!productId;
  
  // Validate - Brand and Sales Price are now optional
  const productName = document.getElementById('productName').value;
  const brand = document.getElementById('brand').value;
  const shortDescription = document.getElementById('shortDescription').value;
  const originalPrice = parseFloat(document.getElementById('originalPrice').value);
  const salesPriceInput = document.getElementById('salesPrice').value;
  const salesPrice = salesPriceInput && salesPriceInput.trim() !== '' ? parseFloat(salesPriceInput) : null;
  const category = document.getElementById('category').value;
  const stockQuantity = parseInt(document.getElementById('stockQuantity').value);
  
  // Validate original price if provided
  if (!originalPrice && originalPrice !== 0) {
    showToast('Original price is required', 'error');
    return;
  }
  
  // Validate sales price if provided (can't exceed original)
  if (salesPrice !== null && salesPrice > originalPrice) {
    showToast('Sales price cannot exceed original price', 'error');
    return;
  }
  
  if (!isEdit && !coverImageFile) {
    showToast('Cover image is required', 'error');
    return;
  }
  
  const formData = new FormData();
  formData.append('product_name', productName);
  formData.append('brand', brand);
  formData.append('short_description', shortDescription);
  formData.append('original_price', originalPrice);
  // Only append sales_price if explicitly provided
  if (salesPrice !== null) {
    formData.append('sales_price', salesPrice);
  }
  formData.append('category', category);
  formData.append('subcategory', document.getElementById('subcategory').value);
  formData.append('sizes', document.getElementById('sizes').value);
  formData.append('colors', document.getElementById('colors').value);
  formData.append('dimensions_in_inches', document.getElementById('dimensions').value);
  formData.append('stock_quantity', stockQuantity || 0);
  formData.append('featured_product', document.getElementById('featuredProduct').checked);
  
  if (coverImageFile) {
    formData.append('cover_image', coverImageFile);
  }
  
  additionalImagesFiles.forEach(file => {
    formData.append('additional_images', file);
  });
  
  try {
    showLoading();
    
    const url = isEdit 
      ? `${API_BASE}/products/${productId}`
      : `${API_BASE}/products`;
    
    const response = await fetch(url, {
      method: isEdit ? 'PUT' : 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast(isEdit ? 'Product updated successfully!' : 'Product created successfully!', 'success');
      showPage('products');
    } else {
      showToast(data.message || 'Failed to save product', 'error');
    }
  } catch (error) {
    console.error('Save product error:', error);
    showToast('Failed to save product', 'error');
  } finally {
    hideLoading();
  }
}

// Delete Product
async function deleteProduct(id) {
  if (!confirm('Are you sure you want to delete this product?')) {
    return;
  }
  
  try {
    showLoading();
    
    const response = await fetch(`${API_BASE}/products/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast('Product deleted successfully!', 'success');
      loadProducts(currentPage);
      loadDashboard();
    } else {
      showToast(data.message || 'Failed to delete product', 'error');
    }
  } catch (error) {
    console.error('Delete product error:', error);
    showToast('Failed to delete product', 'error');
  } finally {
    hideLoading();
  }
}

// Utility Functions
function showLoading() {
  document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
  document.getElementById('loadingOverlay').style.display = 'none';
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
