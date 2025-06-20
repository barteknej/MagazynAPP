// Application state
let authToken = localStorage.getItem('authToken');
let productsList = [];
let currentProductId = null;
let productModal = null;

// If token exists but doesn't have Bearer prefix, add it
if (authToken && !authToken.startsWith('Bearer ')) {
    authToken = `Bearer ${authToken}`;
    localStorage.setItem('authToken', authToken);
}

// Initialize login handling
async function handleLogin() {
    console.log('handleLogin function triggered');
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    console.log('Username:', username);
    console.log('Password:', password);

    if (!username || !password) {
        console.log('Missing username or password');
        showError('loginError', 'Please enter username and password');
        return;
    }

    try {
        hideError('loginError');
        hideError('productError');
        console.log('Attempting login...');
        
        const response = await fetch(endpoints.login, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        console.log('Server response:', response);

        let data;
        try {
            data = await response.json();
            console.log('Parsed response data:', data);
        } catch (e) {
            console.error('Failed to parse JSON response:', e);
            throw new Error('Invalid server response format');
        }

        if (!response.ok) {
            console.error('Login failed:', data);
            throw new Error(data?.message || 'Login failed');
        }

        if (!data || typeof data.token !== 'string') {
            console.error('Invalid response data:', data);
            throw new Error('Invalid server response - no token received');
        }

        console.log('Login successful');
        
        // Always store token with Bearer prefix
        const newToken = data.token.startsWith('Bearer ') ? data.token : `Bearer ${data.token}`;
        authToken = newToken;
        localStorage.setItem('authToken', newToken);

        console.log('Token set successfully');

        // Ensure authToken is updated globally after login
        authToken = newToken;
        localStorage.setItem('authToken', newToken);

        // Debugging log to confirm token propagation
        console.log('Updated authToken:', authToken);

        // Immediately use the updated token for API calls
        try {
            await loadProducts();
        } catch (error) {
            console.error('Failed to load initial products:', error);
            showError('productError', 'Failed to load products: ' + error.message);
        }

        showProductInterface();
    } catch (error) {
        console.error('Login error:', error);
        showError('loginError', 'Login failed: ' + error.message);
    }
}

// API Configuration
const API_URL = 'http://localhost:5221';
const endpoints = {
    login: `${API_URL}/api/users/authenticate`,
    products: `${API_URL}/api/Product`,
    productsByType: (type) => `${API_URL}/api/Product/type/${type}`,
    productById: (id) => `${API_URL}/api/Product/${id}`
};

async function fetchWithAuth(url, options = {}) {
    if (!authToken) {
        showLoginForm();
        throw new Error('Not authenticated');
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': authToken,
        ...options.headers
    };

    try {
        console.log('Fetching:', url);
        const response = await fetch(url, { ...options, headers });
        
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                logout();
                throw new Error('Session expired - please login again');
            }
            
            const errorText = await response.text();
            let errorMessage;
            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.message || errorData.error || errorData.title || response.statusText;
            } catch(e) {
                errorMessage = errorText || response.statusText;
            }
            throw new Error(errorMessage || 'Server error');
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            const responseToken = response.headers.get('Authorization');
            
            // Update token if a new one is provided in headers
            if (responseToken) {
                const newToken = responseToken.startsWith('Bearer ') ? responseToken : `Bearer ${responseToken}`;
                authToken = newToken;
                localStorage.setItem('authToken', newToken);
                console.log('Token updated from headers');
            }
            
            // If data contains a new token, update it
            if (data && typeof data.token === 'string') {
                const newToken = data.token.startsWith('Bearer ') ? data.token : `Bearer ${data.token}`;
                authToken = newToken;
                localStorage.setItem('authToken', newToken);
                console.log('Token updated from response');
            }

            // Return the data depending on what we got
            if (Array.isArray(data)) {
                return data;
            } else if (data && Array.isArray(data.products)) {
                return data.products;
            } else {
                return data;
            }
        }

        return null;
    } catch (error) {
        console.error('Fetch error:', error);
        if (error.message.includes('Session expired')) {
            showLoginForm();
        }
        throw error;
    }
}

// Product Management Functions
async function loadProducts() {
    try {
        hideError('productError');
        console.log('Loading products...');
        const response = await fetchWithAuth(endpoints.products);
        
        if (!response || !Array.isArray(response)) {
            console.error('Invalid products response:', response);
            throw new Error('Invalid response format from server');
        }
        
        productsList = response;
        console.log('Products loaded:', productsList);
        displayProducts(productsList);
    } catch (error) {
        console.error('Load products error:', error);
        showError('productError', 'Error loading products: ' + error.message);
        if (error.message.includes('Session expired')) {
            showLoginForm();
        }
    }
}

function displayProducts(products) {
    const tbody = document.getElementById('productTableBody');
    if (!tbody) {
        console.error('Product table body not found');
        return;
    }
    tbody.innerHTML = '';

    products.forEach(product => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${product.id}</td>
            <td>${product.name}</td>
            <td>${product.type}</td>
            <td>${product.price} PLN</td>
            <td>
                <span class="badge ${product.inStock ? 'bg-success' : 'bg-danger'}">
                    ${product.inStock ? 'Available' : 'Out of stock'}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-primary me-2" onclick="editProduct(${product.id})">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteProduct(${product.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function searchByType() {
    const type = document.getElementById('searchType').value.trim();
    if (!type) {
        showError('productError', 'Please enter a type to search');
        return;
    }

    try {
        hideError('productError');
        const products = await fetchWithAuth(endpoints.productsByType(type));
        if (Array.isArray(products) && products.length > 0) {
            productsList = products;
            displayProducts(products);
        } else {
            showError('productError', 'No products found with this type');
        }
    } catch (error) {
        showError('productError', 'Error searching products: ' + error.message);
    }
}

async function searchById() {
    const id = document.getElementById('searchId').value.trim();
    if (!id) {
        showError('productError', 'Please enter an ID to search');
        return;
    }

    try {
        hideError('productError');
        const response = await fetchWithAuth(endpoints.productById(id));
        console.log('Fetched response:', response); // Debugging log

        // Ensure the response is correctly handled
        const product = response.product || response;
        console.log('Extracted product:', product); // Debugging log

        if (product && product.id) {
            productsList = [product];
            displayProducts(productsList);
        } else {
            console.warn('Product not found:', product); // Debugging log
            showError('productError', 'No product found with this ID');
        }
    } catch (error) {
        console.error('Error searching product by ID:', error);
        showError('productError', 'Error searching product: ' + error.message);
    }
}

async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
        await fetchWithAuth(`${endpoints.products}/${id}`, {
            method: 'DELETE'
        });
        await loadProducts();
    } catch (error) {
        showError('productError', 'Error deleting product: ' + error.message);
    }
}

function editProduct(id) {
    currentProductId = id;
    const product = productsList.find(p => p.id === id);
    if (!product) return;

    document.getElementById('productModalTitle').textContent = 'Edit Product';
    document.getElementById('productName').value = product.name;
    document.getElementById('productDescription').value = product.type;
    document.getElementById('productQuantity').value = product.price;
    document.getElementById('productInStock').checked = product.inStock;
    
    productModal.show();
}

function showAddProductModal() {
    currentProductId = null;
    document.getElementById('productModalTitle').textContent = 'Add Product';
    document.getElementById('productName').value = '';
    document.getElementById('productDescription').value = '';
    document.getElementById('productQuantity').value = '';
    document.getElementById('productInStock').checked = false;
    
    productModal.show();
}

async function saveProduct() {
    const productData = {
        name: document.getElementById('productName').value,
        type: document.getElementById('productDescription').value,
        price: parseInt(document.getElementById('productQuantity').value),
        inStock: document.getElementById('productInStock').checked
    };

    if (!productData.name || !productData.type) {
        showError('productError', 'Name and Type are required');
        return;
    }

    try {
        hideError('productError');
        if (currentProductId) {
            await fetchWithAuth(`${endpoints.products}/${currentProductId}`, {
                method: 'PUT',
                body: JSON.stringify(productData)
            });
        } else {
            await fetchWithAuth(endpoints.products, {
                method: 'POST',
                body: JSON.stringify(productData)
            });
        }

        productModal.hide();
        await loadProducts();
    } catch (error) {
        showError('productError', 'Error saving product: ' + error.message);
    }
}

// Authentication Functions
async function handleLogin() {
    console.log('handleLogin function triggered');
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    console.log('Username:', username);
    console.log('Password:', password);

    if (!username || !password) {
        console.log('Missing username or password');
        showError('loginError', 'Please enter username and password');
        return;
    }

    try {
        hideError('loginError');
        hideError('productError');
        console.log('Attempting login...');
        
        const response = await fetch(endpoints.login, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        console.log('Server response:', response);

        let data;
        try {
            data = await response.json();
            console.log('Parsed response data:', data);
        } catch (e) {
            console.error('Failed to parse JSON response:', e);
            throw new Error('Invalid server response format');
        }

        if (!response.ok) {
            console.error('Login failed:', data);
            throw new Error(data?.message || 'Login failed');
        }

        if (!data || typeof data.token !== 'string') {
            console.error('Invalid response data:', data);
            throw new Error('Invalid server response - no token received');
        }

        console.log('Login successful');
        
        // Always store token with Bearer prefix
        const newToken = data.token.startsWith('Bearer ') ? data.token : `Bearer ${data.token}`;
        authToken = newToken;
        localStorage.setItem('authToken', newToken);

        console.log('Token set successfully');

        // Ensure authToken is updated globally after login
        authToken = newToken;
        localStorage.setItem('authToken', newToken);

        // Debugging log to confirm token propagation
        console.log('Updated authToken:', authToken);

        // Immediately use the updated token for API calls
        try {
            await loadProducts();
        } catch (error) {
            console.error('Failed to load initial products:', error);
            showError('productError', 'Failed to load products: ' + error.message);
        }

        showProductInterface();
    } catch (error) {
        console.error('Login error:', error);
        showError('loginError', 'Login failed: ' + error.message);
    }
}

function logout() {
    authToken = null;
    localStorage.removeItem('authToken');
    showLoginForm();
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

// UI Helper Functions
function showError(elementId, message) {
    const errorDiv = document.getElementById(elementId);
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

function hideError(elementId) {
    const errorDiv = document.getElementById(elementId);
    errorDiv.classList.add('hidden');
}

function showLoginForm() {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('productInterface').classList.add('hidden');
}

function showProductInterface() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('productInterface').classList.remove('hidden');
}

const style = document.createElement('style');
style.textContent = `
    .btn-primary {
        background-color: #4f46e5;
        border-color: #4f46e5;
        color: #ffffff;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        transition: background-color 0.3s, box-shadow 0.3s;
    }
    .btn-primary:hover {
        background-color: #4338ca;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
    }
    .btn-danger {
        background-color: #dc3545;
        border-color: #dc3545;
        color: #fff;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .btn-outline-secondary {
        border-color: #6c757d;
        color: #6c757d;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .table-striped tbody tr:nth-of-type(odd) {
        background-color: #f9fafb;
    }

    .table-striped tbody tr:nth-of-type(even) {
        background-color: #ffffff;
    }

    .table-striped tbody tr:hover {
        background-color: #e5e7eb;
        transition: background-color 0.3s;
    }
`;
document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', () => {
    productModal = new bootstrap.Modal(document.getElementById('productModal'));
    
    const loginButton = document.getElementById('loginButton');
    if (loginButton) {
        loginButton.addEventListener('click', handleLogin);
    }
    
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleLogin();
            }
        });
    }
    
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
        authToken = storedToken.startsWith('Bearer ') ? storedToken : `Bearer ${storedToken}`;
        localStorage.setItem('authToken', authToken);
        
        showProductInterface();
        loadProducts().catch(error => {
            console.error('Initial load failed:', error);
            if (error.message.includes('Unauthorized') || 
                error.message.includes('Session expired') || 
                error.message.includes('Not authenticated')) {
                logout();
                showError('loginError', 'Session expired. Please login again.');
            }
        });
    } else {
        showLoginForm();
    }

    document.getElementById('searchType')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchByType();
        }
    });

    document.getElementById('searchId')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchById();
        }
    });
});