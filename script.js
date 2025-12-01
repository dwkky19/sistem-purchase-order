// =============================================
// FITUR KEAMANAN
// =============================================
(function() {
    'use strict';
    
    // Mencegah klik kanan
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
    });
    
    // Mencegah akses developer tools
    document.addEventListener('keydown', function(e) {
        if (
            e.key === 'F12' ||
            (e.ctrlKey && e.shiftKey && e.key === 'I') ||
            (e.ctrlKey && e.shiftKey && e.key === 'J') ||
            (e.ctrlKey && e.key === 'U') ||
            (e.ctrlKey && e.key === 'u')
        ) {
            e.preventDefault();
            return false;
        }
    });
    
    // Mendeteksi pembukaan developer tools
    let devtools = function() {};
    devtools.toString = function() {
        showAlert('Akses Developer Tools tidak diizinkan', 'danger');
        return '';
    };
    console.log('%c', devtools);
})();

// =============================================
// KELAS DATABASE SIMULASI
// =============================================
class PurchaseOrderDB {
    constructor() {
        this.loadFromStorage();
        // Data pengguna sistem
        this.users = [
            { username: 'admin', password: 'admin123', name: 'Administrator', role: 'admin' },
            { username: 'user', password: 'user123', name: 'Regular User', role: 'user' }
        ];
        this.currentUser = null;
    }
    
    // Memuat data dari localStorage
    loadFromStorage() {
        try {
            const storedData = localStorage.getItem('purchaseOrders');
            
            if (storedData) {
                this.purchaseOrders = JSON.parse(storedData);
            } else {
                this.purchaseOrders = [];
            }
            
            // Inisialisasi nomor PO terakhir berdasarkan data yang ada
            this.calculateLastPONumber();
            
        } catch (error) {
            console.error('Error loading from storage:', error);
            this.purchaseOrders = [];
            this.calculateLastPONumber();
        }
    }
    
    // Menghitung nomor PO terakhir berdasarkan data yang ada
    calculateLastPONumber() {
        if (!this.purchaseOrders || this.purchaseOrders.length === 0) {
            this.lastPONumber = 0;
        } else {
            // Ekstrak nomor PO dan cari yang tertinggi
            const poNumbers = this.purchaseOrders
                .map(po => {
                    const match = po.poNumber.match(/PO-(\d+)-/);
                    return match ? parseInt(match[1]) : 0;
                })
                .filter(num => !isNaN(num));
            
            this.lastPONumber = poNumbers.length > 0 ? Math.max(...poNumbers) : 0;
        }
        
        // Simpan ke localStorage
        localStorage.setItem('lastPONumber', this.lastPONumber.toString());
    }
    
    // Menyimpan data ke localStorage
    saveToStorage() {
        try {
            localStorage.setItem('purchaseOrders', JSON.stringify(this.purchaseOrders));
        } catch (error) {
            console.error('Error saving to storage:', error);
        }
    }
    
    // Autentikasi pengguna
    login(username, password) {
        const user = this.users.find(u => u.username === username && u.password === password);
        if (user) {
            this.currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));
            return { success: true, user };
        } else {
            return { success: false, message: 'Username atau password salah' };
        }
    }
    
    // Logout pengguna
    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        return { success: true };
    }
    
    // Mendapatkan pengguna yang sedang login
    getCurrentUser() {
        return this.currentUser || JSON.parse(localStorage.getItem('currentUser'));
    }
    
    // Generate nomor PO baru
    generatePONumber() {
        this.lastPONumber++;
        const year = new Date().getFullYear();
        const poNumber = `PO-${this.lastPONumber.toString().padStart(4, '0')}-${year}`;
        
        // Simpan ke localStorage
        localStorage.setItem('lastPONumber', this.lastPONumber.toString());
        
        return poNumber;
    }
    
    // Operasi Purchase Order
    addPurchaseOrder(poData) {
        try {
            // Cek apakah nomor PO sudah ada
            const existingPO = this.purchaseOrders.find(po => po.poNumber === poData.poNumber);
            if (existingPO) {
                return { success: false, message: 'Nomor PO sudah digunakan. Silakan refresh halaman untuk mendapatkan nomor PO baru.' };
            }
            
            const newPO = {
                id: Date.now(),
                poNumber: poData.poNumber,
                poDate: poData.poDate,
                department: poData.department,
                items: poData.items,
                status: 'draft',
                createdBy: this.getCurrentUser().name,
                createdAt: new Date().toISOString(),
                updatedAt: poData.updatedAt || new Date().toISOString()
            };
            
            if (!Array.isArray(this.purchaseOrders)) {
                this.purchaseOrders = [];
            }
            
            this.purchaseOrders.push(newPO);
            
            // Simpan ke localStorage
            this.saveToStorage();
            
            return { success: true, data: newPO };
            
        } catch (error) {
            console.error('Error saving PO:', error);
            return { success: false, message: 'Gagal menyimpan PO: ' + error.message };
        }
    }
    
    // Mendapatkan semua data Purchase Order dengan sorting terbaru
    getAllPurchaseOrders() {
        this.loadFromStorage();
        const purchaseOrders = this.purchaseOrders || [];
        
        // Sort berdasarkan updatedAt terbaru
        return purchaseOrders.sort((a, b) => {
            const dateA = new Date(a.updatedAt || a.createdAt);
            const dateB = new Date(b.updatedAt || b.createdAt);
            return dateB - dateA; // Descending (terbaru dulu)
        });
    }
    
    // Pencarian Purchase Order
    searchPurchaseOrders(query) {
        const purchaseOrders = this.getAllPurchaseOrders();
        if (!query) return purchaseOrders;
        
        const lowercaseQuery = query.toLowerCase();
        return purchaseOrders.filter(po => {
            const matchesPO = po.poNumber.toLowerCase().includes(lowercaseQuery);
            const matchesDept = po.department.toLowerCase().includes(lowercaseQuery);
            const matchesItems = po.items && po.items.some(item => 
                item.name.toLowerCase().includes(lowercaseQuery)
            );
            
            return matchesPO || matchesDept || matchesItems;
        });
    }
    
    // Mendapatkan PO berdasarkan ID
    getPOById(id) {
        return this.getAllPurchaseOrders().find(po => po.id === id);
    }
    
    // Update status PO
    updatePOStatus(id, status) {
        const poIndex = this.purchaseOrders.findIndex(po => po.id === id);
        if (poIndex !== -1) {
            this.purchaseOrders[poIndex].status = status;
            this.purchaseOrders[poIndex].updatedAt = new Date().toISOString();
            this.saveToStorage();
            return { success: true, data: this.purchaseOrders[poIndex] };
        }
        return { success: false, message: 'PO tidak ditemukan' };
    }
}

// =============================================
// VARIABEL GLOBAL
// =============================================

// Inisialisasi database sebagai variabel global
let db;

// Variabel global untuk menyimpan state PO sementara
let currentPONumber = null;

// =============================================
// SISTEM ALERT/PESAN
// =============================================

// Fungsi untuk menampilkan alert/pesan
function showAlert(message, type) {
    const alertContainer = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    alertContainer.appendChild(alert);
    
    // Tampilkan alert
    setTimeout(() => {
        alert.classList.add('show');
    }, 100);
    
    // Sembunyikan alert setelah 5 detik
    setTimeout(() => {
        alert.classList.remove('show');
        
        // Hapus dari DOM setelah transisi
        setTimeout(() => {
            alert.remove();
        }, 300);
    }, 5000);
}

// =============================================
// FUNGSI MANAJEMEN PURCHASE ORDER
// =============================================

// Fungsi untuk mengatur nomor PO
function setupPONumber() {
    // Jika sudah ada currentPONumber, gunakan yang itu
    // Jika belum, generate yang baru
    if (!currentPONumber) {
        currentPONumber = db.generatePONumber();
    }
    document.getElementById('poNumber').value = currentPONumber;
}

// Fungsi untuk reset form dan generate PO baru
function resetPOForm() {
    // Generate PO number baru untuk transaksi berikutnya
    currentPONumber = db.generatePONumber();
    document.getElementById('poNumber').value = currentPONumber;
    
    // Reset form lainnya
    document.getElementById('poForm').reset();
    
    // Set tanggal minimum 7 hari dari hari ini
    const today = new Date();
    const timezoneOffset = today.getTimezoneOffset() * 60000;
    const localDate = new Date(today - timezoneOffset);
    const minDate = new Date(localDate);
    minDate.setDate(minDate.getDate() + 7);
    const minDateString = minDate.toISOString().split('T')[0];
    
    const poDateInput = document.getElementById('poDate');
    poDateInput.value = minDateString;
    poDateInput.min = minDateString;
    
    // Hapus items dan tambahkan satu default
    document.getElementById('itemList').innerHTML = '';
    addItem();
    
    // Kembali ke step 1
    goToStep(1);
}

// =============================================
// FUNGSI VALIDASI FORM
// =============================================

// Validasi Step 1: Informasi PO
function validateStep1() {
    const poDate = document.getElementById('poDate');
    const department = document.getElementById('department');
    
    // Dapatkan tanggal hari ini dalam timezone Indonesia
    const today = new Date();
    const timezoneOffset = today.getTimezoneOffset() * 60000;
    const localDate = new Date(today - timezoneOffset);
    const todayString = localDate.toISOString().split('T')[0];
    
    // Hitung tanggal minimum (7 hari dari hari ini)
    const minDate = new Date(localDate);
    minDate.setDate(minDate.getDate() + 7);
    const minDateString = minDate.toISOString().split('T')[0];
    
    // Cek apakah tanggal minimal 7 hari dari hari ini
    if (poDate.value < minDateString) {
        showAlert('Tanggal PO harus minimal 7 hari ke depan dari hari ini', 'warning');
        poDate.focus();
        return false;
    }
    
    if (!poDate.value) {
        showAlert('Tanggal PO harus diisi', 'warning');
        poDate.focus();
        return false;
    }
    
    if (!department.value) {
        showAlert('Departemen harus dipilih', 'warning');
        department.focus();
        return false;
    }
    
    return true;
}

// Validasi Step 2: Detail Barang
function validateStep2() {
    const items = document.querySelectorAll('.item-card');
    
    if (items.length === 0) {
        showAlert('Minimal harus ada 1 barang dalam PO', 'warning');
        return false;
    }
    
    // Validasi setiap item
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const name = item.querySelector('.item-name').value;
        const quantity = item.querySelector('.item-quantity').value;
        const price = item.querySelector('.item-price').value;
        const unit = item.querySelector('.item-unit').value;
        const description = item.querySelector('.item-description').value;
        
        if (!name) {
            showAlert(`Nama barang ke-${i+1} harus diisi`, 'warning');
            item.querySelector('.item-name').focus();
            return false;
        }
        
        if (!quantity || quantity < 1) {
            showAlert(`Jumlah barang ke-${i+1} harus minimal 1`, 'warning');
            item.querySelector('.item-quantity').focus();
            return false;
        }
        
        if (!price || price < 1) {
            showAlert(`barang ke-${i+1} harus minimal 1`, 'warning');
            item.querySelector('.item-price').focus();
            return false;
        }
        
        if (!unit) {
            showAlert(`Satuan barang ke-${i+1} harus dipilih`, 'warning');
            item.querySelector('.item-unit').focus();
            return false;
        }
        
        // Validasi deskripsi minimal 5 huruf
        if (!description || description.trim().length < 5) {
            showAlert(`Deskripsi barang ke-${i+1} harus diisi minimal 5 huruf`, 'warning');
            item.querySelector('.item-description').focus();
            return false;
        }
        
        // Validasi deskripsi tidak boleh angka
        if (containsOnlyNumbers(description)) {
            showAlert(`Deskripsi barang ke-${i+1} tidak boleh hanya berisi angka`, 'warning');
            item.querySelector('.item-description').focus();
            return false;
        }
    }
    
    return true;
}

// Helper function untuk mengecek apakah string hanya berisi angka
function containsOnlyNumbers(str) {
    return /^\d+$/.test(str.replace(/\s/g, ''));
}

// =============================================
// FUNGSI NAVIGASI STEP FORM
// =============================================

// Navigasi antar step
function goToStep(stepNumber) {
    // Sembunyikan semua steps
    document.querySelectorAll('.step-content').forEach(step => {
        step.classList.remove('active');
    });
    
    // Tampilkan step target
    document.querySelector(`.step-content[data-step="${stepNumber}"]`).classList.add('active');
    
    // Update indikator step
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active', 'completed');
        
        const stepNum = parseInt(step.getAttribute('data-step'));
        if (stepNum === stepNumber) {
            step.classList.add('active');
        } else if (stepNum < stepNumber) {
            step.classList.add('completed');
        }
    });
}

// =============================================
// FUNGSI MANAJEMEN ITEM BARANG
// =============================================

// Menambah item barang dengan satuan
function addItem() {
    const itemList = document.getElementById('itemList');
    const itemCount = itemList.children.length + 1;
    
    const itemHTML = `
        <div class="item-card">
            <div class="item-header">
                <div class="item-title">Barang #${itemCount}</div>
                <button type="button" class="remove-item">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Nama Barang</label>
                    <input type="text" class="form-control item-name" required maxlength="100" placeholder="Masukkan nama barang">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Jumlah</label>
                    <input type="number" class="form-control item-quantity" required min="1" max="10000" placeholder="Masukkan jumlah">
                </div>
                <div class="form-group">
                    <label>Satuan</label>
                    <div class="price-unit-container">
                        <div class="price-input-wrapper">
                            <span class="currency-symbol">Rp</span>
                            <input type="number" class="form-control item-price" required min="1000" step="1000" placeholder="Masukkan harga">
                        </div>
                        <select class="form-control item-unit">
                            <option value="PCS">PCS</option>
                            <option value="BOX">BOX</option>
                            <option value="PACK">PACK</option>
                            <option value="RIM">RIM</option>
                            <option value="ROLL">ROLL</option>
                            <option value="LSN">LSN</option>
                            <option value="UNIT">UNIT</option>
                            <option value="SET">SET</option>
                            <option value="MTR">MTR</option>
                            <option value="KG">KG</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="form-group">
                <label>Deskripsi Barang <small>(minimal 5 huruf, tidak boleh hanya angka)</small></label>
                <textarea class="form-control item-description" rows="2" maxlength="500" placeholder="Masukkan deskripsi barang (minimal 5 huruf, tidak boleh hanya angka)" required></textarea>
                <div class="validation-error" id="descriptionError">Deskripsi tidak boleh hanya berisi angka</div>
            </div>
        </div>
    `;
    
    itemList.insertAdjacentHTML('beforeend', itemHTML);
    
    // Tambahkan event listener untuk tombol hapus
    const newItem = itemList.lastElementChild;
    newItem.querySelector('.remove-item').addEventListener('click', function() {
        if (itemList.children.length > 1) {
            newItem.remove();
            updateItemNumbers();
        } else {
            showAlert('Minimal harus ada 1 barang dalam PO', 'warning');
        }
    });
    
    // Tambahkan validasi untuk field deskripsi
    const descriptionField = newItem.querySelector('.item-description');
    const errorElement = newItem.querySelector('.validation-error');
    
    descriptionField.addEventListener('input', function() {
        validateDescriptionField(this, errorElement);
    });
    
    descriptionField.addEventListener('blur', function() {
        validateDescriptionField(this, errorElement);
    });
}

// Validasi field deskripsi
function validateDescriptionField(field, errorElement) {
    const value = field.value.trim();
    
    if (containsOnlyNumbers(value)) {
        field.classList.add('error');
        errorElement.style.display = 'block';
        return false;
    } else {
        field.classList.remove('error');
        errorElement.style.display = 'none';
        return true;
    }
}

// Update nomor item
function updateItemNumbers() {
    const items = document.querySelectorAll('.item-card');
    items.forEach((item, index) => {
        item.querySelector('.item-title').textContent = `Barang #${index + 1}`;
    });
}

// =============================================
// FUNGSI TABEL DATABASE
// =============================================

// Update tabel database
function updateDatabaseTable(poList = null) {
    const tableBody = document.getElementById('poTableBody');
    const emptyMessage = document.getElementById('emptyMessage');
    
    // Selalu ambil data terbaru dari database
    const purchaseOrders = poList || db.getAllPurchaseOrders();
    
    if (!purchaseOrders || purchaseOrders.length === 0) {
        tableBody.innerHTML = '';
        emptyMessage.style.display = 'block';
        return;
    }
    
    emptyMessage.style.display = 'none';
    
    tableBody.innerHTML = purchaseOrders.map(po => {
        const totalItems = po.items ? po.items.length : 0;
        const totalPrice = po.items ? po.items.reduce((sum, item) => sum + (item.quantity * item.price), 0) : 0;
        const statusClass = `status-${po.status}`;
        const statusText = getStatusText(po.status);
        
        // Format tanggal update
        const updateDate = new Date(po.updatedAt || po.createdAt);
        const displayDate = updateDate.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        return `
            <tr>
                <td><strong>${po.poNumber}</strong></td>
                <td>${new Date(po.poDate).toLocaleDateString('id-ID')}</td>
                <td>${po.department}</td>
                <td>${totalItems} item</td>
                <td>Rp ${totalPrice.toLocaleString('id-ID')}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${po.createdBy}<br><small>${displayDate}</small></td>
                <td>
                    <button class="btn" data-action="view" data-id="${po.id}">
                        <i class="fas fa-eye"></i> Lihat
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    // Tambahkan event listeners ke tombol aksi
    document.querySelectorAll('[data-action="view"]').forEach(button => {
        button.addEventListener('click', function() {
            const poId = parseInt(this.getAttribute('data-id'));
            showPODetail(poId);
        });
    });
}

// Mendapatkan teks status
function getStatusText(status) {
    switch(status) {
        case 'draft': return 'Draft';
        case 'release': return 'Release';
        case 'completed': return 'Selesai';
        case 'canceled': return 'Dibatalkan';
        default: return 'Tidak Diketahui';
    }
}

// =============================================
// FUNGSI MODAL DETAIL PURCHASE ORDER
// =============================================

// Tampilkan modal detail PO
function showPODetail(poId) {
    const po = db.getPOById(poId);
    if (!po) {
        showAlert('Data PO tidak ditemukan', 'danger');
        return;
    }
    
    // Isi modal dengan data PO
    document.getElementById('detailPoNumber').value = po.poNumber;
    document.getElementById('detailPoDate').value = new Date(po.poDate).toLocaleDateString('id-ID');
    document.getElementById('detailDepartment').value = po.department;
    
    // Update badge status
    const statusBadge = document.getElementById('detailStatus');
    statusBadge.className = `status-badge status-${po.status}`;
    statusBadge.textContent = getStatusText(po.status);
    
    // Isi tabel items
    const itemsBody = document.getElementById('detailItemsBody');
    itemsBody.innerHTML = '';
    
    if (po.items && po.items.length > 0) {
        let totalPrice = 0;
        
        po.items.forEach(item => {
            const itemTotal = item.quantity * item.price;
            totalPrice += itemTotal;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${item.quantity} ${item.unit || ''}</td>
                <td>Rp ${item.price.toLocaleString('id-ID')} / ${item.unit || 'Unit'}</td>
                <td>Rp ${itemTotal.toLocaleString('id-ID')}</td>
                <td>${item.description || '-'}</td>
            `;
            itemsBody.appendChild(row);
        });
        
        document.getElementById('detailTotal').value = `Rp ${totalPrice.toLocaleString('id-ID')}`;
    }
    
    // Set data-id untuk tombol status
    document.querySelectorAll('.status-btn').forEach(button => {
        button.setAttribute('data-id', poId);
    });
    
    // Cek role user dan set permissions yang sesuai
    const currentUser = db.getCurrentUser();
    if (currentUser) {
        // User biasa hanya bisa melakukan Release
        if (currentUser.role === 'user') {
            document.querySelector('.status-btn.release').classList.remove('disabled');
            document.querySelector('.status-btn.release').disabled = false;
            
            document.querySelector('.status-btn.complete').classList.add('disabled');
            document.querySelector('.status-btn.complete').disabled = true;
            
            document.querySelector('.status-btn.cancel').classList.add('disabled');
            document.querySelector('.status-btn.cancel').disabled = true;
        } 
        // Admin bisa melakukan semua aksi
        else if (currentUser.role === 'admin') {
            document.querySelectorAll('.status-btn').forEach(button => {
                button.classList.remove('disabled');
                button.disabled = false;
            });
        }
    }
    
    // Tampilkan informasi waktu update
    const updateDate = new Date(po.updatedAt || po.createdAt);
    const displayDate = updateDate.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Tambahkan informasi update time ke modal
    let updateInfo = document.querySelector('.update-info');
    if (!updateInfo) {
        updateInfo = document.createElement('div');
        updateInfo.className = 'update-info';
        document.querySelector('.modal-body').appendChild(updateInfo);
    }
    updateInfo.innerHTML = `<small><i class="fas fa-clock"></i> Terakhir update: ${displayDate}</small>`;
    
    // Tampilkan modal
    document.getElementById('poDetailModal').classList.add('active');
}

// Tutup modal detail PO
function closePODetailModal() {
    document.getElementById('poDetailModal').classList.remove('active');
}

// Update status PO
function updatePOStatus(poId, status) {
    // Cek permissions user berdasarkan role
    const currentUser = db.getCurrentUser();
    
    // User biasa hanya bisa melakukan Release
    if (currentUser && currentUser.role === 'user' && status !== 'release') {
        showAlert('Hanya admin yang dapat mengubah status PO menjadi Selesai atau Dibatalkan', 'danger');
        return;
    }
    
    const result = db.updatePOStatus(poId, status);
    if (result.success) {
        showAlert(`Status PO berhasil diubah menjadi ${getStatusText(status)}`, 'success');
        updateDatabaseTable();
        closePODetailModal();
    } else {
        showAlert(result.message, 'danger');
    }
}

// =============================================
// INISIALISASI APLIKASI
// =============================================

function initApp() {
    // Inisialisasi database
    db = new PurchaseOrderDB();
    
    // Cek apakah user sudah login
    const currentUser = db.getCurrentUser();
    if (currentUser) {
        showAppPage(currentUser);
    } else {
        showLoginPage();
    }
    
    // Setup PO Number
    setupPONumber();
    
    // Set tanggal hari ini untuk PO date (Indonesia time)
    const today = new Date();
    const timezoneOffset = today.getTimezoneOffset() * 60000;
    const localDate = new Date(today - timezoneOffset);
    const todayString = localDate.toISOString().split('T')[0];
    
    // Hitung tanggal minimum (7 hari dari hari ini)
    const minDate = new Date(localDate);
    minDate.setDate(minDate.getDate() + 7);
    const minDateString = minDate.toISOString().split('T')[0];
    
    // Set tanggal minimum 7 hari dari hari ini
    const poDateInput = document.getElementById('poDate');
    poDateInput.value = minDateString;
    poDateInput.min = minDateString;
    
    // Tambahkan item pertama
    addItem();
    
    // =============================================
    // EVENT LISTENERS
    // =============================================
    
    // Login form submission
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        const result = db.login(username, password);
        if (result.success) {
            showAlert('Login berhasil!', 'success');
            setTimeout(() => {
                showAppPage(result.user);
                // Setup PO number setelah login
                setupPONumber();
            }, 1000);
        } else {
            showAlert(result.message, 'danger');
        }
    });
    
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', function() {
        db.logout();
        showAlert('Anda telah logout', 'info');
        setTimeout(() => {
            showLoginPage();
        }, 1000);
    });
    
    // Navigation
    document.getElementById('navInput').addEventListener('click', function(e) {
        e.preventDefault();
        showInputSection();
        // Pastikan PO number tetap sama saat navigasi
        setupPONumber();
    });
    
    document.getElementById('navDatabase').addEventListener('click', function(e) {
        e.preventDefault();
        showDatabaseSection();
    });
    
    // Step navigation buttons
    document.querySelectorAll('.btn-next').forEach(button => {
        button.addEventListener('click', function() {
            const nextStep = parseInt(this.getAttribute('data-next'));
            const currentStep = nextStep - 1;
            
            let isValid = false;
            if (currentStep === 1) isValid = validateStep1();
            
            if (isValid) {
                goToStep(nextStep);
            }
        });
    });
    
    document.querySelectorAll('.btn-prev').forEach(button => {
        button.addEventListener('click', function() {
            const prevStep = parseInt(this.getAttribute('data-prev'));
            goToStep(prevStep);
        });
    });
    
    // Add item button
    document.getElementById('addItemBtn').addEventListener('click', addItem);
    
    // PO Form submission
    document.getElementById('poForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!validateStep2()) return;
        
        // Kumpulkan data items
        const items = [];
        document.querySelectorAll('.item-card').forEach(itemCard => {
            const name = itemCard.querySelector('.item-name').value;
            const quantity = parseInt(itemCard.querySelector('.item-quantity').value);
            const price = parseInt(itemCard.querySelector('.item-price').value);
            const unit = itemCard.querySelector('.item-unit').value;
            const description = itemCard.querySelector('.item-description').value;
            
            items.push({
                name,
                quantity,
                price,
                unit,
                description: description || ''
            });
        });
        
        const poData = {
            poNumber: currentPONumber,
            poDate: document.getElementById('poDate').value,
            department: document.getElementById('department').value,
            items: items,
            updatedAt: new Date().toISOString()
        };
        
        const result = db.addPurchaseOrder(poData);
        if (result.success) {
            showAlert('Purchase Order berhasil disimpan!', 'success');
            
            // Reset form untuk transaksi baru
            resetPOForm();
            
            // Update database table
            updateDatabaseTable();
        } else {
            showAlert(result.message, 'danger');
        }
    });
    
    // Search functionality
    document.getElementById('searchBtn').addEventListener('click', function() {
        const query = document.getElementById('searchInput').value;
        const results = db.searchPurchaseOrders(query);
        updateDatabaseTable(results);
        
        if (results.length === 0 && query) {
            showAlert('Tidak ditemukan purchase order dengan kata kunci tersebut', 'info');
        }
    });
    
    document.getElementById('searchInput').addEventListener('keyup', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('searchBtn').click();
        }
    });
    
    // Modal functionality
    document.querySelector('.modal-close').addEventListener('click', closePODetailModal);
    document.getElementById('closeDetailModal').addEventListener('click', closePODetailModal);
    
    // Status buttons
    document.querySelectorAll('.status-btn').forEach(button => {
        button.addEventListener('click', function() {
            if (this.classList.contains('disabled')) {
                const currentUser = db.getCurrentUser();
                if (currentUser && currentUser.role === 'user') {
                    showAlert('Hanya admin yang dapat mengubah status PO menjadi Selesai atau Dibatalkan', 'danger');
                } else {
                    showAlert('Tombol ini tidak tersedia', 'danger');
                }
                return;
            }
            
            const poId = parseInt(this.getAttribute('data-id'));
            const status = this.getAttribute('data-status');
            updatePOStatus(poId, status);
        });
    });
    
    // Date validation on input change
    document.getElementById('poDate').addEventListener('change', function() {
        const today = new Date();
        const timezoneOffset = today.getTimezoneOffset() * 60000;
        const localDate = new Date(today - timezoneOffset);
        const minDate = new Date(localDate);
        minDate.setDate(minDate.getDate() + 7);
        const minDateString = minDate.toISOString().split('T')[0];
        
        if (this.value < minDateString) {
            showAlert('Tanggal PO harus minimal 7 hari ke depan dari hari ini', 'warning');
            this.value = minDateString;
        }
    });
    
    // Handle browser back/forward buttons
    window.addEventListener('popstate', function(event) {
        // Pastikan PO number tetap sama meskipun user navigasi dengan browser buttons
        setupPONumber();
    });
}

// =============================================
// FUNGSI MANAJEMEN TAMPILAN HALAMAN
// =============================================

function showLoginPage() {
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('appPage').style.display = 'none';
}

function showAppPage(user) {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('appPage').style.display = 'block';
    document.getElementById('loggedInUser').textContent = user.name;
    
    // Update user role badge
    const roleBadge = document.getElementById('userRoleBadge');
    roleBadge.textContent = user.role === 'admin' ? 'Admin' : 'User';
    roleBadge.style.background = user.role === 'admin' ? '#3498db' : '#95a5a6';
    
    // Tampilkan input section secara default
    showInputSection();
    
    // Update database table untuk menampilkan data yang ada
    updateDatabaseTable();
}

function showInputSection() {
    document.getElementById('inputSection').style.display = 'block';
    document.getElementById('databaseSection').style.display = 'none';
    
    // Update navigasi
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.getElementById('navInput').classList.add('active');
    
    // Pastikan PO number tetap sama saat navigasi
    setupPONumber();
}

function showDatabaseSection() {
    document.getElementById('inputSection').style.display = 'none';
    document.getElementById('databaseSection').style.display = 'block';
    
    // Update navigasi
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.getElementById('navDatabase').classList.add('active');
    
    // Update table dengan data terbaru
    updateDatabaseTable();
}

// Inisialisasi aplikasi ketika DOM sudah dimuat
document.addEventListener('DOMContentLoaded', initApp);