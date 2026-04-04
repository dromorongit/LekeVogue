// Leke Vogue Admin Dashboard JavaScript
const API_BASE = '/api';

// State management
let authToken = localStorage.getItem('adminToken');
let currentUser = null;
let currentPage = 1;
let currentCategory = '';
let currentSearch = '';
let orderCurrentPage = 1;
let orderCurrentSearch = '';
let orderCurrentStatus = '';

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
  setupUserModal();
});

// Setup User Modal
function setupUserModal() {
  const modal = document.getElementById('addUserModal');
  const closeBtn = document.getElementById('closeUserModal');
  const cancelBtn = document.getElementById('cancelUserBtn');
  const form = document.getElementById('userForm');

  closeBtn.addEventListener('click', closeUserModal);
  cancelBtn.addEventListener('click', closeUserModal);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeUserModal();
    }
  });

  form.addEventListener('submit', handleUserSubmit);
}

function openUserModal() {
  const modal = document.getElementById('addUserModal');
  modal.classList.add('active');
}

function closeUserModal() {
  const modal = document.getElementById('addUserModal');
  modal.classList.remove('active');
  document.getElementById('userForm').reset();
}

async function handleUserSubmit(e) {
  e.preventDefault();
  
  const fullName = document.getElementById('userFullName').value;
  const email = document.getElementById('userEmail').value;
  const password = document.getElementById('userPassword').value;
  const role = document.getElementById('userRole').value;

  if (!fullName || !email || !password) {
    showToast('Please fill in all required fields', 'error');
    return;
  }

  try {
    showLoading();
    
    const response = await fetch(`${API_BASE}/auth/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ fullName, email, password, role })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast('User created successfully!', 'success');
      closeUserModal();
      loadUsers();
    } else {
      showToast(data.message || 'Failed to create user', 'error');
    }
  } catch (error) {
    console.error('Create user error:', error);
    showToast('Failed to create user', 'error');
  } finally {
    hideLoading();
  }
}

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
  if (salesPrice !== null) {
    formData.append('sales_price', salesPrice);
  }
  formData.append('category', category);
  formData.append('sizes', document.getElementById('editSizes').value);
  formData.append('colors', document.getElementById('editColors').value);
  
  const { colorSizes: editColorSizes, sizeStocks: editSizeStocks } = getColorSizeData('editColorSizeMatrix', 'edit-color-size-color', 'edit-color-size-sizes');
  formData.append('color_sizes', JSON.stringify(editColorSizes));
  formData.append('size_stock', JSON.stringify(editSizeStocks));
  
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
      document.getElementById('editSalesPrice').value = product.sales_price || '';
      document.getElementById('editCategory').value = product.category;
      document.getElementById('editSizes').value = product.sizes ? product.sizes.join(', ') : '';
      document.getElementById('editColors').value = product.colors ? product.colors.join(', ') : '';
      
      const editColorSizeContainer = document.getElementById('editColorSizeMatrix');
      editColorSizeContainer.innerHTML = '';
      if (product.color_sizes && Object.keys(product.color_sizes).length > 0) {
        for (const [color, sizes] of Object.entries(product.color_sizes)) {
          const sizeStocks = product.size_stock && product.size_stock[color] ? product.size_stock[color] : {};
          addEditColorSizeRow(color, sizes.join(', '), sizeStocks);
        }
      }
      
      setTimeout(() => updateStockFromColorSizeEdit(), 100);
      
      document.getElementById('editDimensions').value = product.dimensions_in_inches || '';
      document.getElementById('editStockQuantity').value = product.stock_quantity;
      document.getElementById('editFeaturedProduct').checked = product.featured_product;
      
      if (product.cover_image) {
        document.getElementById('editCoverImagePreview').innerHTML = `
          <div class="image-preview-item">
            <img src="${product.cover_image}" alt="Current Cover">
          </div>
        `;
      }
      
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
  
  // Navigation - handled dynamically based on role in setupNavigation()
  
  // Search and filter - Products
  document.getElementById('searchInput').addEventListener('input', debounce(handleSearch, 500));
  document.getElementById('categoryFilter').addEventListener('change', handleCategoryFilter);
  
  // Search and filter - Orders
  document.getElementById('orderSearchInput').addEventListener('input', debounce(handleOrderSearch, 500));
  document.getElementById('orderStatusFilter').addEventListener('change', handleOrderStatusFilter);
  
  // Product form
  productForm.addEventListener('submit', handleProductSubmit);
  
  // Buttons
  document.getElementById('viewAllOrdersBtn')?.addEventListener('click', () => showPage('orders'));
  document.getElementById('addNewProductBtn')?.addEventListener('click', () => showPage('add-product'));
  document.getElementById('cancelBtn')?.addEventListener('click', () => showPage('products'));
  document.getElementById('addUserBtn')?.addEventListener('click', openUserModal);
  document.getElementById('backToOrdersBtn')?.addEventListener('click', () => showPage('orders'));
  
  // Image upload areas
  setupImageUpload();
  
  // Color-size matrix buttons
  document.getElementById('addColorSizeBtn').addEventListener('click', () => addColorSizeRow());
  document.getElementById('addEditColorSizeBtn').addEventListener('click', () => addEditColorSizeRow());
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
      currentUser = data.user;
      localStorage.setItem('adminToken', authToken);
      localStorage.setItem('adminUser', JSON.stringify(data.user));
      showToast('Login successful!', 'success');
      setupNavigation(data.user.role);
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
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      currentUser = data.user;
      localStorage.setItem('adminUser', JSON.stringify(data.user));
      setupNavigation(data.user.role);
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
  currentUser = null;
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminUser');
  showLoginPage();
  showToast('Logged out successfully', 'success');
}

// Setup Navigation based on role
function setupNavigation(role) {
  const nav = document.getElementById('sidebarNav');
  const isSuperAdmin = role === 'super_admin';
  
  let navHTML = '';
  
  // Dashboard - visible to all
  navHTML += `
    <a class="nav-item active" data-page="dashboard">
      <i class="fas fa-th-large"></i>
      <span>Dashboard</span>
    </a>
  `;
  
  // Orders - visible to all
  navHTML += `
    <a class="nav-item" data-page="orders">
      <i class="fas fa-shopping-cart"></i>
      <span>Orders</span>
    </a>
  `;
  
  // Products - super_admin only
  if (isSuperAdmin) {
    navHTML += `
      <a class="nav-item" data-page="products">
        <i class="fas fa-box"></i>
        <span>Products</span>
      </a>
      <a class="nav-item" data-page="add-product">
        <i class="fas fa-plus-circle"></i>
        <span>Add Product</span>
      </a>
      <a class="nav-item" data-page="users">
        <i class="fas fa-users"></i>
        <span>Users</span>
      </a>
      <a class="nav-item" data-page="settings">
        <i class="fas fa-cog"></i>
        <span>Settings</span>
      </a>
    `;
  }
  
  nav.innerHTML = navHTML;
  
  // Re-attach click listeners
  nav.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.getAttribute('data-page');
      if (page) {
        showPage(page);
      }
    });
  });
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
  document.getElementById('ordersView').style.display = 'none';
  document.getElementById('orderDetailsView').style.display = 'none';
  document.getElementById('productsView').style.display = 'none';
  document.getElementById('addProductView').style.display = 'none';
  document.getElementById('usersView').style.display = 'none';
  document.getElementById('settingsView').style.display = 'none';
  
  // Show requested view
  switch(page) {
    case 'dashboard':
      document.getElementById('dashboardView').style.display = 'block';
      loadDashboard();
      break;
    case 'orders':
      document.getElementById('ordersView').style.display = 'block';
      loadOrders();
      break;
    case 'order-details':
      // Handled separately in viewOrder
      break;
    case 'products':
      document.getElementById('productsView').style.display = 'block';
      loadProducts();
      break;
    case 'add-product':
      document.getElementById('addProductView').style.display = 'block';
      resetProductForm();
      break;
    case 'users':
      document.getElementById('usersView').style.display = 'block';
      loadUsers();
      break;
    case 'settings':
      document.getElementById('settingsView').style.display = 'block';
      break;
  }
}

// Dashboard
async function loadDashboard() {
  try {
    const response = await fetch(`${API_BASE}/orders/stats`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      document.getElementById('totalOrders').textContent = data.data.totalOrders;
      document.getElementById('newOrders').textContent = data.data.newOrders;
      document.getElementById('processingOrders').textContent = data.data.processingOrders;
      document.getElementById('totalRevenue').textContent = `GHS ${data.data.totalRevenue.toFixed(2)}`;
    }
    
    // Load recent orders
    const ordersResponse = await fetch(`${API_BASE}/orders?limit=5&sort=desc`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    const ordersData = await ordersResponse.json();
    
    if (ordersData.success) {
      renderRecentOrders(ordersData.orders);
    }
  } catch (error) {
    console.error('Load dashboard error:', error);
  }
}

function renderRecentOrders(orders) {
  const tbody = document.getElementById('recentOrdersTable');
  
  if (orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <i class="fas fa-shopping-cart"></i>
            <h3>No Orders Yet</h3>
            <p>Orders will appear here after successful payments</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = orders.map(order => `
    <tr>
      <td><strong>${order.orderNumber}</strong></td>
      <td>${order.customerFullName}</td>
      <td>GHS ${order.totalAmount.toFixed(2)}</td>
      <td><span class="status-badge ${getOrderStatusClass(order.orderStatus)}">${formatOrderStatus(order.orderStatus)}</span></td>
      <td>${formatDate(order.createdAt)}</td>
      <td>
        <button class="edit-btn" onclick="viewOrder('${order._id}')">View</button>
      </td>
    </tr>
  `).join('');
}

// Orders
async function loadOrders(page = 1) {
  orderCurrentPage = page;
  
  let url = `${API_BASE}/orders?page=${page}&limit=10`;
  
  if (orderCurrentStatus) {
    url += `&status=${orderCurrentStatus}`;
  }
  
  if (orderCurrentSearch) {
    url += `&search=${encodeURIComponent(orderCurrentSearch)}`;
  }
  
  try {
    showLoading();
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    const data = await response.json();
    
    if (data.success) {
      renderOrdersTable(data.orders);
      renderOrdersPagination(data.page, data.pages);
    } else {
      showToast('Failed to load orders', 'error');
    }
  } catch (error) {
    console.error('Load orders error:', error);
    showToast('Failed to load orders', 'error');
  } finally {
    hideLoading();
  }
}

function renderOrdersTable(orders) {
  const tbody = document.getElementById('ordersTable');
  
  if (orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty-state">
            <i class="fas fa-shopping-cart"></i>
            <h3>No Orders Found</h3>
            <p>No orders match your search criteria</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = orders.map(order => `
    <tr>
      <td><strong>${order.orderNumber}</strong></td>
      <td>${order.customerFullName}</td>
      <td>${order.customerPhone || '-'}</td>
      <td>GHS ${order.totalAmount.toFixed(2)}</td>
      <td><span class="status-badge ${order.paymentStatus === 'paid' ? 'success' : 'warning'}">${order.paymentStatus}</span></td>
      <td><span class="status-badge ${getOrderStatusClass(order.orderStatus)}">${formatOrderStatus(order.orderStatus)}</span></td>
      <td>${formatDate(order.createdAt)}</td>
      <td>
        <button class="edit-btn" onclick="viewOrder('${order._id}')">View</button>
      </td>
    </tr>
  `).join('');
}

function renderOrdersPagination(page, pages) {
  const pagination = document.getElementById('ordersPagination');
  
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
  
  pagination.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!btn.disabled) {
        loadOrders(parseInt(btn.dataset.page));
      }
    });
  });
}

async function viewOrder(orderId) {
  try {
    showLoading();
    
    const response = await fetch(`${API_BASE}/orders/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    const data = await response.json();
    
    if (data.success) {
      renderOrderDetails(data.order);
      showPage('order-details');
    } else {
      showToast('Failed to load order', 'error');
    }
  } catch (error) {
    console.error('View order error:', error);
    showToast('Failed to load order', 'error');
  } finally {
    hideLoading();
  }
}

function renderOrderDetails(order) {
  const content = document.getElementById('orderDetailsContent');
  
  content.innerHTML = `
    <div class="order-details-grid">
      <div class="order-info-section">
        <h3>Order Information</h3>
        <div class="detail-row">
          <span class="label">Order Number:</span>
          <span class="value">${order.orderNumber}</span>
        </div>
        <div class="detail-row">
          <span class="label">Date:</span>
          <span class="value">${formatDate(order.createdAt)}</span>
        </div>
        <div class="detail-row">
          <span class="label">Payment Status:</span>
          <span class="value"><span class="status-badge ${order.paymentStatus === 'paid' ? 'success' : 'warning'}">${order.paymentStatus}</span></span>
        </div>
        <div class="detail-row">
          <span class="label">Payment Reference:</span>
          <span class="value">${order.paymentReference || '-'}</span>
        </div>
      </div>
      
      <div class="customer-info-section">
        <h3>Customer Information</h3>
        <div class="detail-row">
          <span class="label">Name:</span>
          <span class="value">${order.customerFullName}</span>
        </div>
        <div class="detail-row">
          <span class="label">Phone:</span>
          <span class="value">${order.customerPhone}</span>
        </div>
        <div class="detail-row">
          <span class="label">Email:</span>
          <span class="value">${order.customerEmail || '-'}</span>
        </div>
        <div class="detail-row">
          <span class="label">Delivery Address:</span>
          <span class="value">${order.deliveryAddress || '-'}</span>
        </div>
      </div>
      
      <div class="order-items-section">
        <h3>Ordered Items</h3>
        ${order.orderItems.map(item => `
          <div class="order-item">
            <div class="item-info">
              <strong>${item.productName}</strong>
              <span>${item.selectedColor || ''} ${item.selectedSize ? 'Size ' + item.selectedSize : ''}</span>
              <span>Qty: ${item.quantity} x GHS ${item.unitPrice.toFixed(2)}</span>
            </div>
            <div class="item-total">GHS ${item.lineTotal.toFixed(2)}</div>
          </div>
        `).join('')}
      </div>
      
      <div class="order-total-section">
        <div class="detail-row total">
          <span class="label">Total Amount:</span>
          <span class="value">GHS ${order.totalAmount.toFixed(2)}</span>
        </div>
      </div>
      
      <div class="order-status-section">
        <h3>Update Order Status</h3>
        <div class="status-update-form">
          <select id="orderStatusSelect" class="filter-select">
            <option value="new" ${order.orderStatus === 'new' ? 'selected' : ''}>New</option>
            <option value="processing" ${order.orderStatus === 'processing' ? 'selected' : ''}>Processing</option>
            <option value="ready_for_pickup" ${order.orderStatus === 'ready_for_pickup' ? 'selected' : ''}>Ready for Pickup</option>
            <option value="completed" ${order.orderStatus === 'completed' ? 'selected' : ''}>Completed</option>
            <option value="cancelled" ${order.orderStatus === 'cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
          <button class="btn btn-primary" onclick="updateOrderStatus('${order._id}')">
            <i class="fas fa-save"></i> Update Status
          </button>
        </div>
      </div>
      
      <div class="order-notes-section">
        <h3>Internal Notes</h3>
        <textarea id="orderNoteText" rows="4" placeholder="Add internal note...">${order.internalNote || ''}</textarea>
        <button class="btn btn-primary" onclick="addOrderNote('${order._id}')" style="margin-top: 10px;">
          <i class="fas fa-save"></i> Save Note
        </button>
      </div>
    </div>
  `;
}

async function updateOrderStatus(orderId) {
  const status = document.getElementById('orderStatusSelect').value;
  
  try {
    showLoading();
    
    const response = await fetch(`${API_BASE}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ orderStatus: status })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast('Order status updated!', 'success');
      viewOrder(orderId);
    } else {
      showToast(data.message || 'Failed to update status', 'error');
    }
  } catch (error) {
    console.error('Update status error:', error);
    showToast('Failed to update status', 'error');
  } finally {
    hideLoading();
  }
}

async function addOrderNote(orderId) {
  const note = document.getElementById('orderNoteText').value;
  
  if (!note) {
    showToast('Please enter a note', 'error');
    return;
  }
  
  try {
    showLoading();
    
    const response = await fetch(`${API_BASE}/orders/${orderId}/note`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ internalNote: note })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast('Note saved!', 'success');
      viewOrder(orderId);
    } else {
      showToast(data.message || 'Failed to save note', 'error');
    }
  } catch (error) {
    console.error('Save note error:', error);
    showToast('Failed to save note', 'error');
  } finally {
    hideLoading();
  }
}

function handleOrderSearch(e) {
  orderCurrentSearch = e.target.value;
  loadOrders(1);
}

function handleOrderStatusFilter(e) {
  orderCurrentStatus = e.target.value;
  loadOrders(1);
}

// Users Management (Super Admin)
async function loadUsers() {
  try {
    showLoading();
    
    const response = await fetch(`${API_BASE}/auth/users`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    const data = await response.json();
    
    if (data.success) {
      renderUsersTable(data.users);
    } else {
      showToast('Failed to load users', 'error');
    }
  } catch (error) {
    console.error('Load users error:', error);
    showToast('Failed to load users', 'error');
  } finally {
    hideLoading();
  }
}

function renderUsersTable(users) {
  const tbody = document.getElementById('usersTable');
  
  if (users.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <i class="fas fa-users"></i>
            <h3>No Users</h3>
            <p>Add users to manage the system</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = users.map(user => `
    <tr>
      <td>${user.fullName}</td>
      <td>${user.email}</td>
      <td><span class="status-badge ${user.role === 'super_admin' ? 'purple' : 'info'}">${user.role}</span></td>
      <td><span class="status-badge ${user.isActive ? 'success' : 'danger'}">${user.isActive ? 'Active' : 'Inactive'}</span></td>
      <td>${formatDate(user.createdAt)}</td>
      <td>
        <button class="edit-btn" onclick="toggleUserStatus('${user._id}')">${user.isActive ? 'Deactivate' : 'Activate'}</button>
      </td>
    </tr>
  `).join('');
}

async function toggleUserStatus(userId) {
  if (!confirm('Are you sure you want to change this user\'s status?')) {
    return;
  }
  
  try {
    showLoading();
    
    const response = await fetch(`${API_BASE}/auth/users/${userId}/toggle-status`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast('User status updated!', 'success');
      loadUsers();
    } else {
      showToast(data.message || 'Failed to update user', 'error');
    }
  } catch (error) {
    console.error('Toggle user status error:', error);
    showToast('Failed to update user status', 'error');
  } finally {
    hideLoading();
  }
}

// Products (from original code)
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
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
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
          <button class="edit-btn" data-id="${product._id}">Edit</button>
          <button class="delete-btn" data-id="${product._id}">Delete</button>
        </div>
      </td>
    </tr>
  `}).join('');

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

// Product Form (from original code)
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
  const coverUpload = document.getElementById('coverImageUpload');
  const coverInput = document.getElementById('coverImage');
  
  coverUpload.addEventListener('click', () => coverInput.click());
  coverInput.addEventListener('change', (e) => {
    if (e.target.files[0]) {
      coverImageFile = e.target.files[0];
      previewImage(coverImageFile, 'coverImagePreview');
    }
  });
  
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
  
  const productName = document.getElementById('productName').value;
  const brand = document.getElementById('brand').value;
  const shortDescription = document.getElementById('shortDescription').value;
  const originalPrice = parseFloat(document.getElementById('originalPrice').value);
  const salesPriceInput = document.getElementById('salesPrice').value;
  const salesPrice = salesPriceInput && salesPriceInput.trim() !== '' ? parseFloat(salesPriceInput) : null;
  const category = document.getElementById('category').value;
  const stockQuantity = parseInt(document.getElementById('stockQuantity').value);
  
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
  if (salesPrice !== null) {
    formData.append('sales_price', salesPrice);
  }
  formData.append('category', category);
  formData.append('sizes', document.getElementById('sizes').value);
  formData.append('colors', document.getElementById('colors').value);
  
  const { colorSizes, sizeStocks } = getColorSizeData('colorSizeMatrix', 'color-size-color', 'color-size-sizes');
  formData.append('color_sizes', JSON.stringify(colorSizes));
  formData.append('size_stock', JSON.stringify(sizeStocks));
  
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
    
    const response = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast('Product created successfully!', 'success');
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

// Helper Functions
function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function getOrderStatusClass(status) {
  const classes = {
    'new': 'info',
    'processing': 'warning',
    'ready_for_pickup': 'success',
    'completed': 'success',
    'cancelled': 'danger'
  };
  return classes[status] || 'info';
}

function formatOrderStatus(status) {
  const labels = {
    'new': 'New',
    'processing': 'Processing',
    'ready_for_pickup': 'Ready for Pickup',
    'completed': 'Completed',
    'cancelled': 'Cancelled'
  };
  return labels[status] || status;
}

// Color-Size Matrix Functions (from original code)
function addColorSizeRow(color = '', sizes = '', sizeStocks = {}) {
  const container = document.getElementById('colorSizeMatrix');
  const row = document.createElement('div');
  row.className = 'color-size-row';
  row.style.cssText = 'display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px; align-items: flex-start;';
  row.innerHTML = `
    <div style="display: flex; gap: 10px; align-items: center; width: 100%;">
      <input type="text" placeholder="Color (e.g., Black)" value="${color}" class="color-size-color" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
      <input type="text" placeholder="Sizes (e.g., 38, 39)" value="${sizes}" class="color-size-sizes" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
      <button type="button" onclick="this.closest('.color-size-row').remove(); updateStockFromColorSize();" style="padding: 8px 12px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <div class="size-stock-inputs" style="width: 100%; display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px;">
      <span style="width: 100%; font-size: 12px; color: #666;">Stock per size:</span>
    </div>
  `;
  container.appendChild(row);
  
  const sizesInput = row.querySelector('.color-size-sizes');
  const stockInputsContainer = row.querySelector('.size-stock-inputs');
  
  const updateSizeStockInputs = () => {
    const sizeList = sizesInput.value.split(',').map(s => s.trim()).filter(s => s);
    const existingStockInputs = stockInputsContainer.querySelectorAll('.size-stock-item');
    existingStockInputs.forEach(el => el.remove());
    
    sizeList.forEach(size => {
      const stockValue = sizeStocks[size] || 1;
      const stockItem = document.createElement('div');
      stockItem.className = 'size-stock-item';
      stockItem.style.cssText = 'display: flex; align-items: center; gap: 5px; background: white; padding: 5px 10px; border-radius: 4px; border: 1px solid #ddd;';
      stockItem.innerHTML = `
        <span style="font-size: 12px;">Size ${size}:</span>
        <input type="number" min="0" value="${stockValue}" class="size-stock-value" data-size="${size}" style="width: 50px; padding: 4px; border: 1px solid #ddd; border-radius: 4px;" placeholder="0">
      `;
      stockInputsContainer.appendChild(stockItem);
    });
  };
  
  sizesInput.addEventListener('input', updateSizeStockInputs);
  
  if (sizes) {
    updateSizeStockInputs();
    updateStockFromColorSize();
  }
}

function addEditColorSizeRow(color = '', sizes = '', sizeStocks = {}) {
  const container = document.getElementById('editColorSizeMatrix');
  const row = document.createElement('div');
  row.className = 'edit-color-size-row';
  row.style.cssText = 'display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px; align-items: flex-start;';
  row.innerHTML = `
    <div style="display: flex; gap: 10px; align-items: center; width: 100%;">
      <input type="text" placeholder="Color (e.g., Black)" value="${color}" class="edit-color-size-color" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
      <input type="text" placeholder="Sizes (e.g., 38, 39)" value="${sizes}" class="edit-color-size-sizes" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
      <button type="button" onclick="this.closest('.edit-color-size-row').remove(); updateStockFromColorSizeEdit();" style="padding: 8px 12px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <div class="edit-size-stock-inputs" style="width: 100%; display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px;">
      <span style="width: 100%; font-size: 12px; color: #666;">Stock per size:</span>
    </div>
  `;
  container.appendChild(row);
  
  const sizesInput = row.querySelector('.edit-color-size-sizes');
  const stockInputsContainer = row.querySelector('.edit-size-stock-inputs');
  
  const updateSizeStockInputs = () => {
    const sizeList = sizesInput.value.split(',').map(s => s.trim()).filter(s => s);
    const existingStockInputs = stockInputsContainer.querySelectorAll('.edit-size-stock-item');
    existingStockInputs.forEach(el => el.remove());
    
    sizeList.forEach(size => {
      const stockValue = sizeStocks[size] || 1;
      const stockItem = document.createElement('div');
      stockItem.className = 'edit-size-stock-item';
      stockItem.style.cssText = 'display: flex; align-items: center; gap: 5px; background: white; padding: 5px 10px; border-radius: 4px; border: 1px solid #ddd;';
      stockItem.innerHTML = `
        <span style="font-size: 12px;">Size ${size}:</span>
        <input type="number" min="0" value="${stockValue}" class="edit-size-stock-value" data-size="${size}" style="width: 50px; padding: 4px; border: 1px solid #ddd; border-radius: 4px;" placeholder="0">
      `;
      stockInputsContainer.appendChild(stockItem);
    });
  };
  
  sizesInput.addEventListener('input', updateSizeStockInputs);
  
  if (sizes) {
    updateSizeStockInputs();
    updateStockFromColorSizeEdit();
  }
}

function getColorSizeData(containerId, colorClass, sizesClass) {
  const container = document.getElementById(containerId);
  const isEdit = containerId.includes('edit');
  const colorClassSelector = isEdit ? '.edit-color-size-color' : '.color-size-color';
  const sizesClassSelector = isEdit ? '.edit-color-size-sizes' : '.color-size-sizes';
  const stockClassSelector = isEdit ? '.edit-size-stock-value' : '.size-stock-value';
  
  const rows = container.querySelectorAll('.color-size-row, .edit-color-size-row');
  const colorSizes = {};
  const sizeStocks = {};
  
  rows.forEach(row => {
    const colorInput = row.querySelector(colorClassSelector);
    const sizesInput = row.querySelector(sizesClassSelector);
    
    if (colorInput && sizesInput && colorInput.value.trim()) {
      const color = colorInput.value.trim();
      const sizes = sizesInput.value.split(',').map(s => s.trim()).filter(s => s);
      if (sizes.length > 0) {
        colorSizes[color] = sizes;
        
        sizeStocks[color] = {};
        const stockInputs = row.querySelectorAll(stockClassSelector);
        stockInputs.forEach(stockInput => {
          const size = stockInput.dataset.size;
          const stockValue = parseInt(stockInput.value) || 0;
          sizeStocks[color][size] = stockValue;
        });
      }
    }
  });
  
  return { colorSizes, sizeStocks };
}

function updateStockFromColorSize() {
  const container = document.getElementById('colorSizeMatrix');
  const rows = container.querySelectorAll('.color-size-row');
  let totalStock = 0;
  
  rows.forEach(row => {
    const sizesInput = row.querySelector('.color-size-sizes');
    const stockInputs = row.querySelectorAll('.size-stock-value');
    
    if (sizesInput && sizesInput.value.trim()) {
      if (stockInputs.length > 0) {
        stockInputs.forEach(stockInput => {
          const stockValue = parseInt(stockInput.value) || 0;
          totalStock += stockValue;
        });
      }
    }
  });
  
  const stockInput = document.getElementById('stockQuantity');
  if (totalStock > 0) {
    stockInput.value = totalStock;
  }
}

function updateStockFromColorSizeEdit() {
  const container = document.getElementById('editColorSizeMatrix');
  const rows = container.querySelectorAll('.edit-color-size-row');
  let totalStock = 0;
  
  rows.forEach(row => {
    const sizesInput = row.querySelector('.edit-color-size-sizes');
    const stockInputs = row.querySelectorAll('.edit-size-stock-value');
    
    if (sizesInput && sizesInput.value.trim()) {
      if (stockInputs.length > 0) {
        stockInputs.forEach(stockInput => {
          const stockValue = parseInt(stockInput.value) || 0;
          totalStock += stockValue;
        });
      }
    }
  });
  
  const stockInput = document.getElementById('editStockQuantity');
  if (totalStock > 0) {
    stockInput.value = totalStock;
  }
}
