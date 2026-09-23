/**
 * ==========================================================================
 * SNAPRINT GWISATA - SISTEM REKAPITULASI KAS & KEUANGAN HARIAN DINAMIS
 * Core Application Engine (Modular, Dynamic, Real-time Cash Ledger)
 * ==========================================================================
 */

// ================= CONSTANTS & DEFAULT CONFIG =================
const STORAGE_KEY = 'snaprint_gwisata_prod_db_v2';
const LEGACY_STORAGE_KEY = 'snaprint_gwisata_prod_db_v1';

const DEFAULT_PAYMENT_METHODS = [
  { id: 'pm_cash', name: 'TUNAI/CASH', label: 'TUNAI / CASH', isCash: true, color: 'emerald', icon: 'fa-money-bill-wave', note: 'Masuk laci kasir' },
  { id: 'pm_bca', name: 'TRANSFER BCA', label: 'TRANSFER BCA', isCash: false, color: 'blue', icon: 'fa-building-columns', note: 'Rekening BCA' },
  { id: 'pm_qris', name: 'QRIS', label: 'QRIS', isCash: false, color: 'indigo', icon: 'fa-qrcode', note: 'Scan barcode QRIS' },
  { id: 'pm_edc', name: 'EDC', label: 'EDC', isCash: false, color: 'purple', icon: 'fa-credit-card', note: 'Mesin gesek EDC' }
];

const DEFAULT_EXPENSE_CATEGORIES = [
  { id: 'cat_trans', name: 'Transport', icon: 'fa-car' },
  { id: 'cat_equip', name: 'Pembelian Peralatan', icon: 'fa-print' },
  { id: 'cat_food', name: 'Minuman/makanan', icon: 'fa-utensils' },
  { id: 'cat_trash', name: 'Sampah', icon: 'fa-trash' },
  { id: 'cat_don', name: 'Donasi', icon: 'fa-hand-holding-heart' },
  { id: 'cat_other', name: 'Operasional lain', icon: 'fa-gears' }
];

const DEFAULT_EXPENSE_SOURCES = [
  { id: 'src_cash', name: 'TUNAI/CASH', label: 'Kas Tunai Laci', isCash: true, note: 'Mengurangi kas fisik' },
  { id: 'src_bca', name: 'TRANSFER BCA', label: 'Transfer BCA', isCash: false, note: 'Dari rekening bank' }
];

const DEFAULT_SHOP_PROFILE = {
  name: 'SNAPRINT',
  badge: 'GWISATA',
  sub: 'Rekapitulasi Keuangan & Monitor Kas Tunai',
  address: 'Kawasan Wisata Bahari / Outlet SNAPRINT GWISATA',
  phone: '0812-XXXX-XXXX',
  footer: 'Terima Kasih atas Kunjungan Anda - SNAPRINT GWISATA'
};

const DEFAULT_OWNER_PIN = '2209';

const EMPTY_DATA = {
  initialCashBalance: 0,
  ownerPin: DEFAULT_OWNER_PIN,
  shopProfile: DEFAULT_SHOP_PROFILE,
  paymentMethods: DEFAULT_PAYMENT_METHODS,
  expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
  expenseSources: DEFAULT_EXPENSE_SOURCES,
  transactions: []
};

// ================= GLOBAL APPLICATION STATE =================
let appData = JSON.parse(JSON.stringify(EMPTY_DATA));

let periodMode = 'day'; // 'day' | 'range'
let activeDate = getTodayStr();
let rangeStartDate = getTodayStr();
let rangeEndDate = getTodayStr();

let activeFilter = 'all'; // 'all' | 'income' | 'expense' | 'draw'
let activeCategoryFilter = 'all';
let searchQuery = '';
let cashLedgerSearchQuery = '';

// Chart Instances
let incomeChartInstance = null;
let expenseChartInstance = null;
let monthlyTrendChartInstance = null;
let cashBalanceLineChartInstance = null;
let cashInOutBarChartInstance = null;

// ================= HELPER FUNCTIONS =================
function getTodayStr() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentMonthStr() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getCurrentTimeStr() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function formatRupiah(number) {
  if (isNaN(number) || number === null || number === undefined) return 'Rp 0';
  return 'Rp ' + Math.round(number).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function parseRupiah(str) {
  if (!str) return 0;
  const clean = str.toString().replace(/[^0-9]/g, '');
  return parseInt(clean, 10) || 0;
}

function formatIndoDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return `${days[date.getDay()]}, ${d} ${months[date.getMonth()]} ${y}`;
}

function generateId(prefix = 'tx') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ================= LOCAL STORAGE & DATA MIGRATION =================
function loadData() {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    
    // Migration from v1 if v2 not exists
    if (!raw) {
      const v1Raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (v1Raw) {
        raw = v1Raw;
      }
    }

    if (raw) {
      const parsed = JSON.parse(raw);
      appData = {
        initialCashBalance: Number(parsed.initialCashBalance) || 0,
        ownerPin: parsed.ownerPin || DEFAULT_OWNER_PIN,
        shopProfile: parsed.shopProfile || DEFAULT_SHOP_PROFILE,
        paymentMethods: Array.isArray(parsed.paymentMethods) && parsed.paymentMethods.length > 0 ? parsed.paymentMethods : DEFAULT_PAYMENT_METHODS,
        expenseCategories: Array.isArray(parsed.expenseCategories) && parsed.expenseCategories.length > 0 ? parsed.expenseCategories : DEFAULT_EXPENSE_CATEGORIES,
        expenseSources: Array.isArray(parsed.expenseSources) && parsed.expenseSources.length > 0 ? parsed.expenseSources : DEFAULT_EXPENSE_SOURCES,
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : []
      };
    } else {
      appData = JSON.parse(JSON.stringify(EMPTY_DATA));
      saveData();
    }
  } catch (err) {
    console.error('Error loading data:', err);
    appData = JSON.parse(JSON.stringify(EMPTY_DATA));
  }
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
  } catch (err) {
    console.error('Error saving data:', err);
  }
}

// ================= DYNAMIC HELPERS FOR PAYMENT METHODS & CATEGORIES =================
function isCashMethod(methodName) {
  if (!methodName) return false;
  const pm = appData.paymentMethods.find(m => m.name.toLowerCase() === methodName.toLowerCase());
  if (pm) return Boolean(pm.isCash);
  // Fallback heuristic
  const upper = methodName.toUpperCase();
  return upper.includes('TUNAI') || upper.includes('CASH');
}

function isCashSource(sourceName) {
  if (!sourceName) return false;
  const src = appData.expenseSources.find(s => s.name.toLowerCase() === sourceName.toLowerCase());
  if (src) return Boolean(src.isCash);
  // Fallback heuristic
  const upper = sourceName.toUpperCase();
  return upper.includes('TUNAI') || upper.includes('CASH') || upper.includes('LACI');
}

function getMethodBadgeColor(methodName) {
  const pm = appData.paymentMethods.find(m => m.name.toLowerCase() === (methodName || '').toLowerCase());
  if (pm && pm.color) {
    switch (pm.color) {
      case 'emerald': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'blue': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'indigo': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'purple': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'amber': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'rose': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  }
  if (isCashMethod(methodName)) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  return 'bg-blue-50 text-blue-700 border-blue-200';
}

function getMethodIcon(methodName) {
  const pm = appData.paymentMethods.find(m => m.name.toLowerCase() === (methodName || '').toLowerCase());
  if (pm && pm.icon) return pm.icon;
  if (isCashMethod(methodName)) return 'fa-money-bill-wave';
  return 'fa-credit-card';
}

// ================= CONTINUOUS DAY-TO-DAY CASH LEDGER ENGINE =================
/**
 * Computes running cash balance chronologically across all dates in history.
 */
function computeCashFlowLedger() {
  const dateSet = new Set();
  appData.transactions.forEach(t => {
    if (t.date) dateSet.add(t.date);
  });
  
  dateSet.add(activeDate);
  dateSet.add(getTodayStr());

  const sortedDates = Array.from(dateSet).sort();

  let runningBalance = Number(appData.initialCashBalance) || 0;
  const ledger = [];
  const ledgerMap = {};

  sortedDates.forEach((date) => {
    const openingCash = runningBalance;
    const dayTxs = appData.transactions.filter(t => t.date === date);

    let cashIncome = 0;
    let nonCashIncome = 0;
    let cashExpense = 0;
    let nonCashExpense = 0;
    let cashDraw = 0;

    dayTxs.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') {
        if (isCashMethod(t.category)) {
          cashIncome += amt;
        } else {
          nonCashIncome += amt;
        }
      } else if (t.type === 'expense') {
        if (isCashSource(t.source)) {
          cashExpense += amt;
        } else {
          nonCashExpense += amt;
        }
      } else if (t.type === 'draw') {
        cashDraw += amt;
      }
    });

    const netCashChange = cashIncome - cashExpense - cashDraw;
    const closingCash = openingCash + netCashChange;
    runningBalance = closingCash; // Carried over to next day

    const record = {
      date,
      openingCash,
      cashIncome,
      nonCashIncome,
      cashExpense,
      nonCashExpense,
      cashDraw,
      netCashChange,
      closingCash,
      txCount: dayTxs.length
    };

    ledger.push(record);
    ledgerMap[date] = record;
  });

  return { ledger, ledgerMap, currentRunningBalance: runningBalance };
}

// ================= GET TRANSACTIONS FOR CURRENT ACTIVE PERIOD =================
function getFilteredPeriodTransactions() {
  if (periodMode === 'day') {
    return appData.transactions.filter(t => t.date === activeDate);
  } else {
    // Range mode
    return appData.transactions.filter(t => t.date >= rangeStartDate && t.date <= rangeEndDate);
  }
}

// ================= INITIALIZATION & EVENT BINDINGS =================
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  applyShopProfileToUI();
  populateDynamicFormInputs();

  // Date Inputs
  const recapDateInput = document.getElementById('recapDateInput');
  recapDateInput.value = activeDate;

  const rangeStartInput = document.getElementById('rangeStartDateInput');
  const rangeEndInput = document.getElementById('rangeEndDateInput');
  if (rangeStartInput && rangeEndInput) {
    rangeStartInput.value = rangeStartDate;
    rangeEndInput.value = rangeEndDate;
  }

  const monthlyRecapInput = document.getElementById('monthlyRecapInput');
  if (monthlyRecapInput) {
    monthlyRecapInput.value = getCurrentMonthStr();
    monthlyRecapInput.addEventListener('change', renderMonthlyRecap);
  }

  // Date Nav Events
  recapDateInput.addEventListener('change', (e) => {
    if (e.target.value) {
      activeDate = e.target.value;
      updateUI();
    }
  });

  document.getElementById('btnToday').addEventListener('click', () => {
    activeDate = getTodayStr();
    recapDateInput.value = activeDate;
    updateUI();
  });

  document.getElementById('btnPrevDate').addEventListener('click', () => changeDateBy(-1));
  document.getElementById('btnNextDate').addEventListener('click', () => changeDateBy(1));

  const btnApplyRange = document.getElementById('btnApplyRange');
  if (btnApplyRange) {
    btnApplyRange.addEventListener('click', () => {
      rangeStartDate = rangeStartInput.value || getTodayStr();
      rangeEndDate = rangeEndInput.value || getTodayStr();
      updateUI();
    });
  }

  // Table Search input
  const tableSearchInput = document.getElementById('tableSearchInput');
  if (tableSearchInput) {
    tableSearchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase();
      renderTransactionsTable();
    });
  }

  // Cash Ledger Search input
  const cashLedgerSearch = document.getElementById('cashLedgerSearch');
  if (cashLedgerSearch) {
    cashLedgerSearch.addEventListener('input', (e) => {
      cashLedgerSearchQuery = e.target.value.toLowerCase();
      renderCashLedgerTable();
    });
  }

  // Setup Denomination Calculator Events
  setupDenominationCalculator();

  // Currency Inputs Auto-formatting
  bindCurrencyInput('incomeAmount');
  bindCurrencyInput('expenseAmount');
  bindCurrencyInput('drawAmount');
  bindCurrencyInput('initialBalanceAmount');

  // Render App
  updateUI();
});

function changeDateBy(days) {
  const [y, m, d] = activeDate.split('-').map(Number);
  const current = new Date(y, m - 1, d);
  current.setDate(current.getDate() + days);
  
  const nextY = current.getFullYear();
  const nextM = String(current.getMonth() + 1).padStart(2, '0');
  const nextD = String(current.getDate()).padStart(2, '0');
  activeDate = `${nextY}-${nextM}-${nextD}`;
  
  document.getElementById('recapDateInput').value = activeDate;
  updateUI();
}

function setPeriodMode(mode) {
  periodMode = mode;
  const dayBtn = document.getElementById('periodModeBtn-day');
  const rangeBtn = document.getElementById('periodModeBtn-range');
  const dayNav = document.getElementById('dayNavControls');
  const rangeNav = document.getElementById('rangeNavControls');

  if (mode === 'day') {
    dayBtn.className = 'px-3 py-1.5 rounded-lg bg-white font-bold text-slate-900 shadow-sm transition';
    rangeBtn.className = 'px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-900 transition';
    dayNav.classList.remove('hidden');
    rangeNav.classList.add('hidden');
  } else {
    rangeBtn.className = 'px-3 py-1.5 rounded-lg bg-white font-bold text-slate-900 shadow-sm transition';
    dayBtn.className = 'px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-900 transition';
    dayNav.classList.add('hidden');
    rangeNav.classList.remove('hidden');
  }

  updateUI();
}

function bindCurrencyInput(elementId) {
  const input = document.getElementById(elementId);
  if (!input) return;

  input.addEventListener('input', (e) => {
    const rawVal = parseRupiah(e.target.value);
    e.target.value = rawVal === 0 ? '' : rawVal.toLocaleString('id-ID');
  });
}

function addAmountToInput(inputId, increment) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const current = parseRupiah(input.value);
  const next = current + increment;
  input.value = next.toLocaleString('id-ID');
}

// ================= DYNAMIC FORM BUILDERS =================
function populateDynamicFormInputs() {
  // 1. Income Payment Methods
  const incomeMethodsContainer = document.getElementById('incomePaymentMethodsContainer');
  if (incomeMethodsContainer) {
    incomeMethodsContainer.innerHTML = '';
    appData.paymentMethods.forEach((pm, idx) => {
      const isChecked = idx === 0 ? 'checked' : '';
      const colorBorder = pm.color === 'blue' ? 'has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50/50 has-[:checked]:ring-2 has-[:checked]:ring-blue-500' :
        pm.color === 'indigo' ? 'has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50/50 has-[:checked]:ring-2 has-[:checked]:ring-indigo-500' :
        pm.color === 'purple' ? 'has-[:checked]:border-purple-500 has-[:checked]:bg-purple-50/50 has-[:checked]:ring-2 has-[:checked]:ring-purple-500' :
        'has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50/50 has-[:checked]:ring-2 has-[:checked]:ring-emerald-500';

      const label = document.createElement('label');
      label.className = `payment-method-card flex items-center p-3 border rounded-xl cursor-pointer hover:bg-slate-50 transition border-slate-200 ${colorBorder}`;
      label.innerHTML = `
        <input type="radio" name="incomeMethod" value="${escapeHtml(pm.name)}" class="text-emerald-600 focus:ring-emerald-500 mr-2" ${isChecked}>
        <div class="text-xs">
          <span class="font-bold text-slate-800 block">${escapeHtml(pm.name)}</span>
          <span class="text-[10px] text-slate-500">${escapeHtml(pm.note || (pm.isCash ? 'Masuk laci kas' : 'Non-tunai'))}</span>
        </div>
      `;
      incomeMethodsContainer.appendChild(label);
    });
  }

  // 2. Expense Categories Dropdown
  const expenseCatSelect = document.getElementById('expenseCategory');
  if (expenseCatSelect) {
    expenseCatSelect.innerHTML = '';
    appData.expenseCategories.forEach((cat) => {
      const opt = document.createElement('option');
      opt.value = cat.name;
      opt.textContent = `${cat.name}`;
      expenseCatSelect.appendChild(opt);
    });
  }

  // 3. Expense Sources Radio
  const expenseSourcesContainer = document.getElementById('expenseSourcesContainer');
  if (expenseSourcesContainer) {
    expenseSourcesContainer.innerHTML = '';
    appData.expenseSources.forEach((src, idx) => {
      const isChecked = idx === 0 ? 'checked' : '';
      const label = document.createElement('label');
      label.className = 'flex items-center p-2.5 border rounded-xl cursor-pointer text-xs border-slate-200 has-[:checked]:border-rose-500 has-[:checked]:bg-rose-50/50 has-[:checked]:ring-2 has-[:checked]:ring-rose-500';
      label.innerHTML = `
        <input type="radio" name="expenseSource" value="${escapeHtml(src.name)}" class="text-rose-600 focus:ring-rose-500 mr-2" ${isChecked}>
        <div>
          <span class="font-bold text-slate-800 block">${escapeHtml(src.label || src.name)}</span>
          <span class="text-[10px] text-slate-500">${escapeHtml(src.note || '')}</span>
        </div>
      `;
      expenseSourcesContainer.appendChild(label);
    });
  }

  // 4. Filter Category Dropdown in Toolbar
  const filterCategorySelect = document.getElementById('filterCategorySelect');
  if (filterCategorySelect) {
    filterCategorySelect.innerHTML = '<option value="all">Semua Kategori / Metode</option>';
    
    // Group Income Methods
    const optGroupInc = document.createElement('optgroup');
    optGroupInc.label = 'Metode Pemasukan';
    appData.paymentMethods.forEach(pm => {
      const opt = document.createElement('option');
      opt.value = pm.name;
      opt.textContent = `[Masuk] ${pm.name}`;
      optGroupInc.appendChild(opt);
    });
    filterCategorySelect.appendChild(optGroupInc);

    // Group Expense Categories
    const optGroupExp = document.createElement('optgroup');
    optGroupExp.label = 'Kategori Pengeluaran';
    appData.expenseCategories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.name;
      opt.textContent = `[Biaya] ${cat.name}`;
      optGroupExp.appendChild(opt);
    });
    filterCategorySelect.appendChild(optGroupExp);
  }

  // 5. Settings Tab Master Lists
  renderSettingsMasterLists();
}

function handleCategoryFilterChange(val) {
  activeCategoryFilter = val;
  renderTransactionsTable();
}

// ================= SHOP PROFILE HANDLERS =================
function applyShopProfileToUI() {
  const profile = appData.shopProfile || DEFAULT_SHOP_PROFILE;
  
  const navShopName = document.getElementById('navShopName');
  if (navShopName) navShopName.textContent = profile.name;

  const navShopBadge = document.getElementById('navShopBadge');
  if (navShopBadge) navShopBadge.textContent = profile.badge || '';

  const navShopSub = document.getElementById('navShopSub');
  if (navShopSub) navShopSub.textContent = profile.sub || '';

  const footerShopName = document.getElementById('footerShopName');
  if (footerShopName) footerShopName.textContent = `${profile.name} ${profile.badge || ''}`;

  // Form profile values in settings tab
  const setShopName = document.getElementById('settingShopName');
  if (setShopName) setShopName.value = profile.name || '';

  const setShopSub = document.getElementById('settingShopSub');
  if (setShopSub) setShopSub.value = profile.badge ? `${profile.badge} - ${profile.sub || ''}` : profile.sub || '';

  const setShopAddress = document.getElementById('settingShopAddress');
  if (setShopAddress) setShopAddress.value = profile.address || '';

  const setShopPhone = document.getElementById('settingShopPhone');
  if (setShopPhone) setShopPhone.value = profile.phone || '';

  const setShopFooter = document.getElementById('settingShopFooter');
  if (setShopFooter) setShopFooter.value = profile.footer || '';

  const setCurrentInit = document.getElementById('settingCurrentInitialBalance');
  if (setCurrentInit) setCurrentInit.textContent = formatRupiah(appData.initialCashBalance || 0);
}

function handleShopProfileSubmit(e) {
  e.preventDefault();
  appData.shopProfile = {
    name: document.getElementById('settingShopName').value.trim() || 'SNAPRINT',
    badge: 'GWISATA',
    sub: document.getElementById('settingShopSub').value.trim() || 'Rekapitulasi Keuangan & Monitor Kas Tunai',
    address: document.getElementById('settingShopAddress').value.trim() || '',
    phone: document.getElementById('settingShopPhone').value.trim() || '',
    footer: document.getElementById('settingShopFooter').value.trim() || 'Terima Kasih'
  };
  saveData();
  applyShopProfileToUI();
  Swal.fire({
    icon: 'success',
    title: 'Profil Disimpan',
    text: 'Identitas toko & struk berhasil diperbarui.',
    timer: 1500,
    showConfirmButton: false
  });
}

// ================= TAB MANAGEMENT =================
function switchTab(tabKey) {
  const tabs = ['daily', 'cashflow', 'reconciliation', 'breakdown', 'history', 'settings', 'backup'];
  
  tabs.forEach(key => {
    const btn = document.getElementById(`tabBtn-${key}`);
    const content = document.getElementById(`tabContent-${key}`);
    if (!btn || !content) return;

    if (key === tabKey) {
      btn.className = 'tab-btn active px-3.5 py-3 text-xs sm:text-sm font-bold text-emerald-600 border-b-2 border-emerald-600 flex items-center space-x-2 whitespace-nowrap';
      content.classList.remove('hidden');
    } else {
      btn.className = 'tab-btn px-3.5 py-3 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-900 border-b-2 border-transparent flex items-center space-x-2 whitespace-nowrap';
      content.classList.add('hidden');
    }
  });

  if (tabKey === 'cashflow') renderCashFlowView();
  else if (tabKey === 'reconciliation') updateReconciliationView();
  else if (tabKey === 'breakdown') renderCharts();
  else if (tabKey === 'history') renderMonthlyRecap();
  else if (tabKey === 'settings') renderSettingsMasterLists();
}

function setFilterType(type) {
  activeFilter = type;
  ['all', 'income', 'expense', 'draw'].forEach(f => {
    const btn = document.getElementById(`filterBtn-${f}`);
    if (btn) {
      if (f === type) {
        btn.className = 'px-3 py-1.5 rounded-lg bg-white shadow-sm text-slate-800 font-bold';
      } else {
        btn.className = 'px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 font-medium';
      }
    }
  });
  renderTransactionsTable();
}

// ================= MAIN UI RENDERING & STATS COMPUTATION =================
function updateUI() {
  // Period Header text
  const titleElem = document.getElementById('displayPeriodTitle');
  const badgeElem = document.getElementById('displayPeriodBadge');
  const subElem = document.getElementById('displayPeriodSubtitle');

  if (periodMode === 'day') {
    const isToday = (activeDate === getTodayStr());
    titleElem.textContent = `Rekapitulasi ${formatIndoDate(activeDate)}`;
    badgeElem.textContent = isToday ? 'Hari Ini' : 'Arsip Harian';
    badgeElem.className = isToday ? 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300' : 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-700';
    subElem.textContent = `Laporan transaksi kas fisik & non-tunai ${formatIndoDate(activeDate)}`;
  } else {
    titleElem.textContent = `Rekap Rentang Tanggal`;
    badgeElem.textContent = `${rangeStartDate} s/d ${rangeEndDate}`;
    badgeElem.className = 'px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-300';
    subElem.textContent = `Akumulasi transaksi dari ${formatIndoDate(rangeStartDate)} sampai ${formatIndoDate(rangeEndDate)}`;
  }

  // Filter transactions for period
  const periodTransactions = getFilteredPeriodTransactions();
  const dailyTotalBadge = document.getElementById('dailyTotalBadge');
  if (dailyTotalBadge) dailyTotalBadge.textContent = periodTransactions.length;

  // Dynamic Income Metric Map
  let totalIncome = 0;
  const incomeMethodStats = {};
  appData.paymentMethods.forEach(pm => incomeMethodStats[pm.name] = 0);

  // Dynamic Expense Metric Map
  let totalExpense = 0;
  let expenseCash = 0;
  let expenseNonCash = 0;
  const expenseCategoryStats = {};
  appData.expenseCategories.forEach(cat => expenseCategoryStats[cat.name] = 0);

  // Draw Metrics
  let totalDraw = 0;
  let drawCount = 0;

  periodTransactions.forEach(t => {
    const amt = Number(t.amount) || 0;
    if (t.type === 'income') {
      totalIncome += amt;
      const cat = t.category || 'TUNAI/CASH';
      incomeMethodStats[cat] = (incomeMethodStats[cat] || 0) + amt;
    } else if (t.type === 'expense') {
      totalExpense += amt;
      const cat = t.category || 'Operasional lain';
      expenseCategoryStats[cat] = (expenseCategoryStats[cat] || 0) + amt;
      if (isCashSource(t.source)) {
        expenseCash += amt;
      } else {
        expenseNonCash += amt;
      }
    } else if (t.type === 'draw') {
      totalDraw += amt;
      drawCount += 1;
    }
  });

  // Calculate Running Balance
  const { ledgerMap, currentRunningBalance } = computeCashFlowLedger();
  let dayLedger;
  if (periodMode === 'day') {
    dayLedger = ledgerMap[activeDate] || {
      openingCash: Number(appData.initialCashBalance) || 0,
      cashIncome: 0,
      cashExpense: 0,
      cashDraw: 0,
      closingCash: Number(appData.initialCashBalance) || 0
    };
  } else {
    // Range mode
    const startRecord = ledgerMap[rangeStartDate];
    const endRecord = ledgerMap[rangeEndDate];
    const opening = startRecord ? startRecord.openingCash : (Number(appData.initialCashBalance) || 0);
    const closing = endRecord ? endRecord.closingCash : currentRunningBalance;
    dayLedger = {
      openingCash: opening,
      cashIncome: periodTransactions.filter(t => t.type === 'income' && isCashMethod(t.category)).reduce((s, x) => s + Number(x.amount || 0), 0),
      cashExpense: expenseCash,
      cashDraw: totalDraw,
      closingCash: closing
    };
  }

  // Update Summary Cards
  document.getElementById('statTotalIncome').textContent = formatRupiah(totalIncome);
  document.getElementById('statTotalExpense').textContent = formatRupiah(totalExpense);
  document.getElementById('statTotalDraw').textContent = formatRupiah(totalDraw);
  document.getElementById('statDrawCount').textContent = `${drawCount} kali`;

  // Render Dynamic Income Breakdown in Card 1
  const incomeBreakdownContainer = document.getElementById('statIncomeBreakdownContainer');
  if (incomeBreakdownContainer) {
    incomeBreakdownContainer.innerHTML = '';
    const methodsToShow = Object.entries(incomeMethodStats).slice(0, 4);
    methodsToShow.forEach(([name, amt]) => {
      const isCash = isCashMethod(name);
      const icon = getMethodIcon(name);
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between text-slate-600';
      row.innerHTML = `
        <span class="flex items-center truncate mr-2">
          <i class="fa-solid ${icon} ${isCash ? 'text-emerald-500' : 'text-blue-500'} mr-1.5 text-[10px]"></i>
          <span class="truncate">${name}:</span>
        </span>
        <span class="font-bold font-mono-numeric text-slate-800 text-right">${formatRupiah(amt)}</span>
      `;
      incomeBreakdownContainer.appendChild(row);
    });
  }

  // Render Dynamic Expense Breakdown in Card 2
  const expenseBreakdownContainer = document.getElementById('statExpenseBreakdownContainer');
  if (expenseBreakdownContainer) {
    expenseBreakdownContainer.innerHTML = `
      <div class="flex items-center justify-between text-slate-600">
        <span>Kas Tunai Laci:</span>
        <span class="font-bold text-slate-800 font-mono-numeric">${formatRupiah(expenseCash)}</span>
      </div>
      <div class="flex items-center justify-between text-slate-600">
        <span>Non-Tunai / Bank:</span>
        <span class="font-bold text-slate-800 font-mono-numeric">${formatRupiah(expenseNonCash)}</span>
      </div>
    `;
  }

  // Card 4: Saldo Akhir Kas Tunai
  document.getElementById('statClosingCash').textContent = formatRupiah(dayLedger.closingCash);
  document.getElementById('statOpeningCash').textContent = formatRupiah(dayLedger.openingCash);
  document.getElementById('statCalcCashIn').textContent = `+${formatRupiah(dayLedger.cashIncome)}`;
  document.getElementById('statCalcCashOutTotal').textContent = `-${formatRupiah(dayLedger.cashExpense + dayLedger.cashDraw)}`;

  // Update Tables & Views
  renderTransactionsTable();
  renderDetailedBreakdowns(periodTransactions, totalIncome, incomeMethodStats, totalExpense, expenseCategoryStats);
  updateReconciliationView();

  const cfTab = document.getElementById('tabContent-cashflow');
  if (cfTab && !cfTab.classList.contains('hidden')) {
    renderCashFlowView();
  }
}

// ================= TRANSACTIONS TABLE RENDERING =================
function renderTransactionsTable() {
  const tbody = document.getElementById('transactionsTableBody');
  const emptyState = document.getElementById('emptyState');
  if (!tbody) return;
  tbody.innerHTML = '';

  let list = getFilteredPeriodTransactions();

  // Filter Type
  if (activeFilter !== 'all') {
    list = list.filter(t => t.type === activeFilter);
  }

  // Filter Category
  if (activeCategoryFilter !== 'all') {
    list = list.filter(t => (t.category || '').toLowerCase() === activeCategoryFilter.toLowerCase());
  }

  // Search Filter
  if (searchQuery.trim()) {
    list = list.filter(t => 
      (t.description && t.description.toLowerCase().includes(searchQuery)) ||
      (t.category && t.category.toLowerCase().includes(searchQuery)) ||
      (t.source && t.source.toLowerCase().includes(searchQuery)) ||
      String(t.amount).includes(searchQuery)
    );
  }

  if (list.length === 0) {
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }
  if (emptyState) emptyState.classList.add('hidden');

  // Sort by date & time descending
  list.sort((a, b) => {
    const dtA = `${a.date || ''} ${a.time || ''}`;
    const dtB = `${b.date || ''} ${b.time || ''}`;
    return dtB.localeCompare(dtA);
  });

  list.forEach(item => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 transition border-b border-slate-100';

    let typeBadge = '';
    let categoryBadge = '';
    let amountDisplay = '';

    if (item.type === 'income') {
      typeBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800"><i class="fa-solid fa-arrow-down mr-1"></i>Pemasukan</span>`;
      const catColor = getMethodBadgeColor(item.category);
      const icon = getMethodIcon(item.category);
      categoryBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded border ${catColor} text-xs font-semibold"><i class="fa-solid ${icon} mr-1 text-[10px]"></i>${escapeHtml(item.category)}</span>`;
      amountDisplay = `<span class="font-bold text-emerald-600 font-mono-numeric">+${formatRupiah(item.amount)}</span>`;
    } else if (item.type === 'expense') {
      typeBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-rose-100 text-rose-800"><i class="fa-solid fa-arrow-up mr-1"></i>Pengeluaran</span>`;
      const isSrcCash = isCashSource(item.source);
      const srcTag = isSrcCash ? '<span class="ml-1 text-[10px] text-emerald-600 font-bold">(Kas Laci)</span>' : `<span class="ml-1 text-[10px] text-blue-600">(${escapeHtml(item.source || 'Non-Tunai')})</span>`;
      categoryBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded border bg-rose-50 text-rose-700 border-rose-200 text-xs font-semibold">${escapeHtml(item.category)} ${srcTag}</span>`;
      amountDisplay = `<span class="font-bold text-rose-600 font-mono-numeric">-${formatRupiah(item.amount)}</span>`;
    } else if (item.type === 'draw') {
      typeBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-amber-100 text-amber-800"><i class="fa-solid fa-hand-holding-dollar mr-1"></i>Tarik Owner</span>`;
      categoryBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200 text-xs font-semibold">Kas Tunai Fisik</span>`;
      amountDisplay = `<span class="font-bold text-amber-600 font-mono-numeric">-${formatRupiah(item.amount)}</span>`;
    }

    tr.innerHTML = `
      <td class="px-4 py-3.5 text-xs text-slate-500 font-mono-numeric">
        <div class="font-bold text-slate-700">${item.date || '-'}</div>
        <div class="text-[11px] text-slate-400">${item.time || '-'}</div>
      </td>
      <td class="px-4 py-3.5">${typeBadge}</td>
      <td class="px-4 py-3.5">${categoryBadge}</td>
      <td class="px-4 py-3.5">
        <div class="text-xs font-medium text-slate-800">${escapeHtml(item.description || '-')}</div>
      </td>
      <td class="px-4 py-3.5 text-right">${amountDisplay}</td>
      <td class="px-4 py-3.5 text-center">
        <div class="flex items-center justify-center space-x-1.5">
          <button onclick="editTransaction('${item.id}')" title="Update Transaksi (Hanya Owner - PIN 2209)" class="px-2 py-1 text-xs bg-slate-100 hover:bg-amber-600 hover:text-white text-slate-700 rounded-lg transition font-semibold flex items-center space-x-1 border border-slate-200">
            <i class="fa-solid fa-lock text-[9px] text-amber-500"></i>
            <span>Update</span>
          </button>
          <button onclick="deleteTransaction('${item.id}')" title="Hapus Transaksi (Hanya Owner - PIN 2209)" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition">
            <i class="fa-solid fa-trash-can text-xs"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ================= CASH FLOW VIEW (MONITOR KAS TUNAI) =================
function renderCashFlowView() {
  const { ledger, currentRunningBalance } = computeCashFlowLedger();

  let totalCashInAll = 0;
  let totalCashExpenseAll = 0;
  let totalCashDrawAll = 0;

  ledger.forEach(item => {
    totalCashInAll += item.cashIncome;
    totalCashExpenseAll += item.cashExpense;
    totalCashDrawAll += item.cashDraw;
  });

  document.getElementById('cfInitialBalance').textContent = formatRupiah(appData.initialCashBalance || 0);
  document.getElementById('cfTotalCashIn').textContent = formatRupiah(totalCashInAll);
  document.getElementById('cfTotalCashExpense').textContent = formatRupiah(totalCashExpenseAll);
  document.getElementById('cfTotalCashDraw').textContent = formatRupiah(totalCashDrawAll);
  document.getElementById('cfCurrentRunningBalance').textContent = formatRupiah(currentRunningBalance);

  renderCashLedgerTable();
  renderCashFlowCharts(ledger);
}

function renderCashLedgerTable() {
  const tbody = document.getElementById('cashLedgerTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const { ledger } = computeCashFlowLedger();
  let list = [...ledger].reverse();

  if (cashLedgerSearchQuery.trim()) {
    list = list.filter(r => r.date.toLowerCase().includes(cashLedgerSearchQuery));
  }

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="px-4 py-8 text-center text-slate-400">Tidak ada data arus kas ditemukan.</td></tr>`;
    return;
  }

  list.forEach(row => {
    const tr = document.createElement('tr');
    const isRowActive = (row.date === activeDate);
    const activeClass = isRowActive ? 'bg-emerald-50/80 font-semibold' : 'hover:bg-slate-50';
    const changeClass = row.netCashChange > 0 ? 'text-emerald-600 font-bold' : (row.netCashChange < 0 ? 'text-rose-600 font-bold' : 'text-slate-500');
    const changeSign = row.netCashChange > 0 ? '+' : '';

    tr.className = `${activeClass} transition border-b border-slate-100`;
    tr.innerHTML = `
      <td class="px-4 py-3.5 font-bold text-slate-900">
        <div class="flex items-center space-x-1.5">
          <i class="fa-regular fa-calendar-check text-emerald-600"></i>
          <span>${formatIndoDate(row.date)}</span>
          ${row.date === getTodayStr() ? '<span class="px-1.5 py-0.2 bg-emerald-600 text-white rounded text-[10px]">Hari Ini</span>' : ''}
        </div>
      </td>
      <td class="px-4 py-3.5 text-right text-slate-600">${formatRupiah(row.openingCash)}</td>
      <td class="px-4 py-3.5 text-right font-bold text-emerald-600">+${formatRupiah(row.cashIncome)}</td>
      <td class="px-4 py-3.5 text-right font-semibold text-rose-600">-${formatRupiah(row.cashExpense)}</td>
      <td class="px-4 py-3.5 text-right font-semibold text-amber-600">-${formatRupiah(row.cashDraw)}</td>
      <td class="px-4 py-3.5 text-right ${changeClass}">${changeSign}${formatRupiah(row.netCashChange)}</td>
      <td class="px-4 py-3.5 text-right font-black text-slate-900 bg-slate-100/70 text-sm">
        ${formatRupiah(row.closingCash)}
      </td>
      <td class="px-4 py-3.5 text-center">
        <button onclick="goToDateRecap('${row.date}')" title="Buka Detail Transaksi" class="px-2.5 py-1 text-xs bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 rounded-lg transition font-sans font-semibold">
          Detail
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function goToDateRecap(date) {
  periodMode = 'day';
  activeDate = date;
  document.getElementById('recapDateInput').value = activeDate;
  setPeriodMode('day');
  switchTab('daily');
}

function renderCashFlowCharts(ledger) {
  // 1. Line Chart: Saldo Kas Harian
  const lineCtx = document.getElementById('cashBalanceDailyLineChart');
  if (lineCtx) {
    if (cashBalanceLineChartInstance) cashBalanceLineChartInstance.destroy();

    const dates = ledger.map(r => r.date.split('-').slice(1).join('/'));
    const closingBalances = ledger.map(r => r.closingCash);

    cashBalanceLineChartInstance = new Chart(lineCtx, {
      type: 'line',
      data: {
        labels: dates,
        datasets: [{
          label: 'Saldo Akhir Kas Tunai (Laci)',
          data: closingBalances,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.12)',
          borderWidth: 3,
          fill: true,
          tension: 0.3,
          pointBackgroundColor: '#047857',
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: false,
            ticks: {
              callback: value => 'Rp ' + (value >= 1000000 ? (value/1000000).toFixed(1) + 'jt' : (value/1000) + 'rb')
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: context => 'Saldo Kas: ' + formatRupiah(context.raw)
            }
          }
        }
      }
    });
  }

  // 2. Bar Chart: Tunai Masuk vs Keluar
  const barCtx = document.getElementById('cashInOutDailyBarChart');
  if (barCtx) {
    if (cashInOutBarChartInstance) cashInOutBarChartInstance.destroy();

    const dates = ledger.map(r => r.date.split('-').slice(1).join('/'));
    const inData = ledger.map(r => r.cashIncome);
    const outData = ledger.map(r => r.cashExpense + r.cashDraw);

    cashInOutBarChartInstance = new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: dates,
        datasets: [
          {
            label: 'Kas Masuk',
            data: inData,
            backgroundColor: '#10b981',
            borderRadius: 4
          },
          {
            label: 'Kas Keluar (Biaya+Tarik)',
            data: outData,
            backgroundColor: '#f43f5e',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: value => 'Rp ' + (value >= 1000000 ? (value/1000000).toFixed(1) + 'jt' : (value/1000) + 'rb')
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: context => context.dataset.label + ': ' + formatRupiah(context.raw)
            }
          }
        }
      }
    });
  }
}

// ================= CASH DENOMINATION CALCULATOR (RECONCILIATION) =================
function setupDenominationCalculator() {
  const inputs = document.querySelectorAll('.denom-input');
  inputs.forEach(input => {
    input.addEventListener('input', updateReconciliationView);
  });

  const coinsInput = document.getElementById('denomCoinsCustom');
  if (coinsInput) {
    coinsInput.addEventListener('input', updateReconciliationView);
  }
}

function updateReconciliationView() {
  let physicalTotal = 0;
  const inputs = document.querySelectorAll('.denom-input');

  inputs.forEach(input => {
    const denom = Number(input.getAttribute('data-denom')) || 0;
    const count = Number(input.value) || 0;
    const subtotal = denom * count;
    physicalTotal += subtotal;

    const subtotalElem = input.parentElement.querySelector('.denom-subtotal');
    if (subtotalElem) {
      subtotalElem.textContent = formatRupiah(subtotal);
    }
  });

  const coinsInput = document.getElementById('denomCoinsCustom');
  if (coinsInput) {
    const coinsAmt = Number(coinsInput.value) || 0;
    physicalTotal += coinsAmt;
  }

  // Get active closing balance
  const { ledgerMap, currentRunningBalance } = computeCashFlowLedger();
  const activeRecord = ledgerMap[activeDate];
  const systemClosing = activeRecord ? activeRecord.closingCash : currentRunningBalance;

  const diff = physicalTotal - systemClosing;

  const reconPhysicalElem = document.getElementById('reconPhysicalCashTotal');
  const reconSystemElem = document.getElementById('reconSystemClosingCash');
  const reconDiffElem = document.getElementById('reconDifferenceValue');
  const reconBadgeBox = document.getElementById('reconStatusBadgeBox');
  const reconStatusText = document.getElementById('reconStatusText');

  if (reconPhysicalElem) reconPhysicalElem.textContent = formatRupiah(physicalTotal);
  if (reconSystemElem) reconSystemElem.textContent = formatRupiah(systemClosing);

  if (reconDiffElem && reconBadgeBox && reconStatusText) {
    if (diff === 0) {
      reconDiffElem.textContent = 'Rp 0 (Pas)';
      reconDiffElem.className = 'font-mono-numeric font-black text-sm text-emerald-400';
      reconBadgeBox.className = 'mt-4 p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-center';
      reconStatusText.textContent = '✅ Saldo Kas Laci Cocok & Sempurna (Tidak Ada Selisih)';
      reconStatusText.className = 'font-bold text-xs text-emerald-300';
    } else if (diff < 0) {
      reconDiffElem.textContent = `-${formatRupiah(Math.abs(diff))} (Kurang)`;
      reconDiffElem.className = 'font-mono-numeric font-black text-sm text-rose-400';
      reconBadgeBox.className = 'mt-4 p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-center';
      reconStatusText.textContent = `⚠️ Kas Fisik Kurang ${formatRupiah(Math.abs(diff))} dari Sistem!`;
      reconStatusText.className = 'font-bold text-xs text-rose-300';
    } else {
      reconDiffElem.textContent = `+${formatRupiah(diff)} (Lebih)`;
      reconDiffElem.className = 'font-mono-numeric font-black text-sm text-blue-400';
      reconBadgeBox.className = 'mt-4 p-3.5 rounded-xl bg-blue-500/20 border border-blue-500/40 text-center';
      reconStatusText.textContent = `ℹ️ Kas Fisik Lebih ${formatRupiah(diff)} dari Sistem.`;
      reconStatusText.className = 'font-bold text-xs text-blue-300';
    }
  }
}

function resetDenominationCounter() {
  document.querySelectorAll('.denom-input').forEach(input => input.value = '');
  const coinsInput = document.getElementById('denomCoinsCustom');
  if (coinsInput) coinsInput.value = '';
  updateReconciliationView();
}

// ================= STATS & DYNAMIC CHARTS =================
function renderDetailedBreakdowns(periodTransactions, totalIncome, incomeStats, totalExpense, expenseStats) {
  // Income Summary Box
  const detailedIncomeSummary = document.getElementById('detailedIncomeSummary');
  if (detailedIncomeSummary) {
    const calcPct = (amt) => totalIncome > 0 ? ((amt / totalIncome) * 100).toFixed(1) : '0';
    const rows = Object.entries(incomeStats).map(([method, amt]) => {
      const isCash = isCashMethod(method);
      const icon = getMethodIcon(method);
      return `
        <div class="flex justify-between items-center py-1.5 border-b border-emerald-100/70">
          <span class="text-slate-700 font-medium flex items-center">
            <i class="fa-solid ${icon} ${isCash ? 'text-emerald-600' : 'text-blue-600'} mr-2 text-xs"></i>
            ${escapeHtml(method)}
          </span>
          <div class="text-right">
            <span class="font-bold text-slate-800 font-mono-numeric">${formatRupiah(amt)}</span>
            <span class="text-xs text-slate-400 ml-1">(${calcPct(amt)}%)</span>
          </div>
        </div>
      `;
    }).join('');

    detailedIncomeSummary.innerHTML = `
      ${rows}
      <div class="flex justify-between items-center pt-2 font-black text-emerald-900">
        <span>TOTAL OMSET:</span>
        <span class="text-base font-mono-numeric">${formatRupiah(totalIncome)}</span>
      </div>
    `;
  }

  // Expense Summary Box
  const detailedExpenseSummary = document.getElementById('detailedExpenseSummary');
  if (detailedExpenseSummary) {
    const calcPct = (amt) => totalExpense > 0 ? ((amt / totalExpense) * 100).toFixed(1) : '0';
    const rows = Object.entries(expenseStats).map(([cat, amt]) => {
      return `
        <div class="flex justify-between items-center py-1.5 border-b border-rose-100/70">
          <span class="text-slate-700 font-medium">&bull; ${escapeHtml(cat)}</span>
          <div class="text-right">
            <span class="font-bold text-slate-800 font-mono-numeric">${formatRupiah(amt)}</span>
            <span class="text-xs text-slate-400 ml-1">(${calcPct(amt)}%)</span>
          </div>
        </div>
      `;
    }).join('');

    detailedExpenseSummary.innerHTML = `
      ${rows}
      <div class="flex justify-between items-center pt-2 font-black text-rose-900">
        <span>TOTAL PENGELUARAN:</span>
        <span class="text-base font-mono-numeric">${formatRupiah(totalExpense)}</span>
      </div>
    `;
  }
}

function renderCharts() {
  const periodTransactions = getFilteredPeriodTransactions();

  // 1. Dynamic Income Methods Doughnut
  const incomeMethodStats = {};
  appData.paymentMethods.forEach(pm => incomeMethodStats[pm.name] = 0);
  periodTransactions.filter(t => t.type === 'income').forEach(t => {
    const cat = t.category || 'TUNAI/CASH';
    incomeMethodStats[cat] = (incomeMethodStats[cat] || 0) + (Number(t.amount) || 0);
  });

  const incomeCtx = document.getElementById('incomeMethodChart');
  if (incomeCtx) {
    if (incomeChartInstance) incomeChartInstance.destroy();
    
    const labels = Object.keys(incomeMethodStats);
    const data = Object.values(incomeMethodStats);
    const colors = ['#10b981', '#3b82f6', '#6366f1', '#a855f7', '#f59e0b', '#06b6d4', '#ec4899'];

    incomeChartInstance = new Chart(incomeCtx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors.slice(0, labels.length),
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: context => `${context.label}: ${formatRupiah(context.raw)}`
            }
          }
        },
        cutout: '65%'
      }
    });
  }

  // 2. Dynamic Expense Category Doughnut
  const expenseCatStats = {};
  appData.expenseCategories.forEach(c => expenseCatStats[c.name] = 0);
  periodTransactions.filter(t => t.type === 'expense').forEach(t => {
    const cat = t.category || 'Operasional lain';
    expenseCatStats[cat] = (expenseCatStats[cat] || 0) + (Number(t.amount) || 0);
  });

  const expenseCtx = document.getElementById('expenseCategoryChart');
  if (expenseCtx) {
    if (expenseChartInstance) expenseChartInstance.destroy();

    const labels = Object.keys(expenseCatStats);
    const data = Object.values(expenseCatStats);
    const colors = ['#f43f5e', '#fb923c', '#facc15', '#4ade80', '#06b6d4', '#8b5cf6', '#a855f7', '#64748b'];

    expenseChartInstance = new Chart(expenseCtx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors.slice(0, labels.length),
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: context => `${context.label}: ${formatRupiah(context.raw)}`
            }
          }
        },
        cutout: '65%'
      }
    });
  }
}

// ================= MONTHLY RECAP & TREND CHART =================
function renderMonthlyRecap() {
  const monthInput = document.getElementById('monthlyRecapInput');
  const selectedMonth = monthInput ? monthInput.value : getCurrentMonthStr();
  
  // Format Month Title for Badge (e.g. September 2026)
  const [mYear, mMonth] = selectedMonth.split('-');
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const formattedMonthName = `${monthNames[Number(mMonth) - 1]} ${mYear}`;
  
  const grandTitleBadge = document.getElementById('monthlyGrandTitleBadge');
  if (grandTitleBadge) grandTitleBadge.textContent = formattedMonthName;

  const monthTransactions = appData.transactions.filter(t => (t.date || '').startsWith(selectedMonth));
  const dateMap = {};

  // Grand Totals accumulators
  let grandTotalIncome = 0;
  let grandCashIncome = 0;
  let grandBcaIncome = 0;
  let grandQrisIncome = 0;
  let grandEdcIncome = 0;
  let grandOtherIncome = 0;

  let grandTotalExpense = 0;
  let grandCashExpense = 0;
  let grandNonCashExpense = 0;

  let grandTotalDraw = 0;

  monthTransactions.forEach(t => {
    if (!dateMap[t.date]) {
      dateMap[t.date] = {
        date: t.date,
        cashIncome: 0,
        bcaIncome: 0,
        qrisIncome: 0,
        edcIncome: 0,
        otherIncome: 0,
        totalIncome: 0,
        totalExpense: 0,
        cashExpense: 0,
        nonCashExpense: 0,
        totalDraw: 0
      };
    }

    const row = dateMap[t.date];
    const amt = Number(t.amount) || 0;

    if (t.type === 'income') {
      row.totalIncome += amt;
      grandTotalIncome += amt;

      const catUpper = (t.category || '').toUpperCase();
      if (isCashMethod(t.category)) {
        row.cashIncome += amt;
        grandCashIncome += amt;
      } else if (catUpper.includes('BCA') || catUpper.includes('TRANSFER')) {
        row.bcaIncome += amt;
        grandBcaIncome += amt;
      } else if (catUpper.includes('QRIS')) {
        row.qrisIncome += amt;
        grandQrisIncome += amt;
      } else if (catUpper.includes('EDC')) {
        row.edcIncome += amt;
        grandEdcIncome += amt;
      } else {
        row.otherIncome += amt;
        grandOtherIncome += amt;
      }
    } else if (t.type === 'expense') {
      row.totalExpense += amt;
      grandTotalExpense += amt;

      if (isCashSource(t.source)) {
        row.cashExpense += amt;
        grandCashExpense += amt;
      } else {
        row.nonCashExpense += amt;
        grandNonCashExpense += amt;
      }
    } else if (t.type === 'draw') {
      row.totalDraw += amt;
      grandTotalDraw += amt;
    }
  });

  const grandCashInHand = grandCashIncome - grandCashExpense - grandTotalDraw;

  // Populate Grand Total Cards
  const calcPct = (val) => grandTotalIncome > 0 ? `${((val / grandTotalIncome) * 100).toFixed(1)}%` : '0%';

  const mGrandTotalIncome = document.getElementById('mGrandTotalIncome');
  const mGrandIncomeCash = document.getElementById('mGrandIncomeCash');
  const mGrandIncomeBCA = document.getElementById('mGrandIncomeBCA');
  const mGrandIncomeQRIS = document.getElementById('mGrandIncomeQRIS');
  const mGrandIncomeEDC = document.getElementById('mGrandIncomeEDC');

  if (mGrandTotalIncome) mGrandTotalIncome.textContent = formatRupiah(grandTotalIncome);
  if (mGrandIncomeCash) mGrandIncomeCash.textContent = formatRupiah(grandCashIncome);
  if (mGrandIncomeBCA) mGrandIncomeBCA.textContent = formatRupiah(grandBcaIncome);
  if (mGrandIncomeQRIS) mGrandIncomeQRIS.textContent = formatRupiah(grandQrisIncome);
  if (mGrandIncomeEDC) mGrandIncomeEDC.textContent = formatRupiah(grandEdcIncome);

  const mPctIncomeCash = document.getElementById('mPctIncomeCash');
  const mPctIncomeBCA = document.getElementById('mPctIncomeBCA');
  const mPctIncomeQRIS = document.getElementById('mPctIncomeQRIS');
  const mPctIncomeEDC = document.getElementById('mPctIncomeEDC');

  if (mPctIncomeCash) mPctIncomeCash.textContent = calcPct(grandCashIncome);
  if (mPctIncomeBCA) mPctIncomeBCA.textContent = calcPct(grandBcaIncome);
  if (mPctIncomeQRIS) mPctIncomeQRIS.textContent = calcPct(grandQrisIncome);
  if (mPctIncomeEDC) mPctIncomeEDC.textContent = calcPct(grandEdcIncome);

  const mGrandTotalExpense = document.getElementById('mGrandTotalExpense');
  const mGrandTotalDraw = document.getElementById('mGrandTotalDraw');
  const mGrandCashInHand = document.getElementById('mGrandCashInHand');

  if (mGrandTotalExpense) mGrandTotalExpense.textContent = formatRupiah(grandTotalExpense);
  if (mGrandTotalDraw) mGrandTotalDraw.textContent = formatRupiah(grandTotalDraw);
  if (mGrandCashInHand) {
    mGrandCashInHand.textContent = formatRupiah(grandCashInHand);
    mGrandCashInHand.className = grandCashInHand >= 0 ? 'font-black font-mono-numeric text-emerald-400 text-sm' : 'font-black font-mono-numeric text-rose-400 text-sm';
  }

  // Populate Monthly Table Rows
  const tbody = document.getElementById('monthlyTableBody');
  if (tbody) {
    tbody.innerHTML = '';
    const sortedDates = Object.keys(dateMap).sort().reverse();

    if (sortedDates.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="px-4 py-8 text-center text-slate-400 font-sans">Tidak ada data transaksi di bulan ${formattedMonthName}.</td></tr>`;
    } else {
      sortedDates.forEach(d => {
        const row = dateMap[d];
        const cashInHand = row.cashIncome - row.cashExpense - row.totalDraw;
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 cursor-pointer transition';
        tr.onclick = () => goToDateRecap(row.date);

        tr.innerHTML = `
          <td class="px-4 py-3.5 font-bold text-slate-900 flex items-center">
            <i class="fa-regular fa-calendar-check text-emerald-600 mr-2"></i>${row.date}
          </td>
          <td class="px-4 py-3.5 text-right text-slate-600 font-medium">${formatRupiah(row.cashIncome)}</td>
          <td class="px-4 py-3.5 text-right text-slate-600 font-medium">${formatRupiah(row.bcaIncome)}</td>
          <td class="px-4 py-3.5 text-right text-slate-600 font-medium">${formatRupiah(row.qrisIncome)}</td>
          <td class="px-4 py-3.5 text-right text-slate-600 font-medium">${formatRupiah(row.edcIncome)}</td>
          <td class="px-4 py-3.5 text-right font-black text-emerald-600">${formatRupiah(row.totalIncome)}</td>
          <td class="px-4 py-3.5 text-right text-rose-600 font-bold">${formatRupiah(row.totalExpense)}</td>
          <td class="px-4 py-3.5 text-right text-amber-600 font-bold">${formatRupiah(row.totalDraw)}</td>
          <td class="px-4 py-3.5 text-right font-black ${cashInHand >= 0 ? 'text-slate-900' : 'text-rose-600'}">${formatRupiah(cashInHand)}</td>
        `;
        tbody.appendChild(tr);
      });
    }
  }

  // Populate GRAND TOTAL TABLE FOOTER
  const tfoot = document.getElementById('monthlyTableFoot');
  if (tfoot) {
    tfoot.innerHTML = `
      <tr class="bg-slate-900 text-white font-black text-xs">
        <td class="px-4 py-4 text-emerald-400 uppercase tracking-wider font-sans">
          <div class="flex items-center">
            <i class="fa-solid fa-calculator text-emerald-400 mr-2"></i>
            GRAND TOTAL (${formattedMonthName.toUpperCase()})
          </div>
        </td>
        <td class="px-4 py-4 text-right text-emerald-300 font-bold">${formatRupiah(grandCashIncome)}</td>
        <td class="px-4 py-4 text-right text-blue-300 font-bold">${formatRupiah(grandBcaIncome)}</td>
        <td class="px-4 py-4 text-right text-indigo-300 font-bold">${formatRupiah(grandQrisIncome)}</td>
        <td class="px-4 py-4 text-right text-purple-300 font-bold">${formatRupiah(grandEdcIncome)}</td>
        <td class="px-4 py-4 text-right text-emerald-400 font-black text-sm">${formatRupiah(grandTotalIncome)}</td>
        <td class="px-4 py-4 text-right text-rose-400 font-bold">${formatRupiah(grandTotalExpense)}</td>
        <td class="px-4 py-4 text-right text-amber-400 font-bold">${formatRupiah(grandTotalDraw)}</td>
        <td class="px-4 py-4 text-right text-sm ${grandCashInHand >= 0 ? 'text-white' : 'text-rose-400'}">${formatRupiah(grandCashInHand)}</td>
      </tr>
    `;
  }

  // Monthly Trend Chart
  const trendCtx = document.getElementById('monthlyTrendChart');
  if (trendCtx) {
    if (monthlyTrendChartInstance) monthlyTrendChartInstance.destroy();

    const chronologicalDates = Object.keys(dateMap).sort();
    const labels = chronologicalDates.map(d => d.split('-')[2]);
    const incomeSeries = chronologicalDates.map(d => dateMap[d].totalIncome);
    const expenseSeries = chronologicalDates.map(d => dateMap[d].totalExpense);
    const drawSeries = chronologicalDates.map(d => dateMap[d].totalDraw);

    monthlyTrendChartInstance = new Chart(trendCtx, {
      type: 'bar',
      data: {
        labels: labels.length ? labels : ['01'],
        datasets: [
          {
            label: 'Pemasukan (Omset)',
            data: incomeSeries.length ? incomeSeries : [0],
            backgroundColor: '#10b981',
            borderRadius: 4
          },
          {
            label: 'Pengeluaran',
            data: expenseSeries.length ? expenseSeries : [0],
            backgroundColor: '#f43f5e',
            borderRadius: 4
          },
          {
            label: 'Tarik Owner',
            data: drawSeries.length ? drawSeries : [0],
            backgroundColor: '#f59e0b',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: value => 'Rp ' + (value >= 1000000 ? (value/1000000).toFixed(1) + 'jt' : (value/1000) + 'rb')
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: context => `${context.dataset.label}: ${formatRupiah(context.raw)}`
            }
          }
        }
      }
    });
  }
}

// ================= MONTHLY RECAP EXPORT & PRINT =================
function exportMonthlyToExcel() {
  const monthInput = document.getElementById('monthlyRecapInput');
  const selectedMonth = monthInput ? monthInput.value : getCurrentMonthStr();
  const [mYear, mMonth] = selectedMonth.split('-');
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const formattedMonthName = `${monthNames[Number(mMonth) - 1]} ${mYear}`;

  const monthTransactions = appData.transactions.filter(t => (t.date || '').startsWith(selectedMonth));
  if (monthTransactions.length === 0) {
    Swal.fire('Data Kosong', `Tidak ada transaksi di bulan ${formattedMonthName} untuk diekspor.`, 'info');
    return;
  }

  const dateMap = {};
  let grandTotalIncome = 0;
  let grandCashIncome = 0;
  let grandBcaIncome = 0;
  let grandQrisIncome = 0;
  let grandEdcIncome = 0;
  let grandTotalExpense = 0;
  let grandTotalDraw = 0;

  monthTransactions.forEach(t => {
    if (!dateMap[t.date]) {
      dateMap[t.date] = {
        date: t.date,
        cashIncome: 0,
        bcaIncome: 0,
        qrisIncome: 0,
        edcIncome: 0,
        totalIncome: 0,
        totalExpense: 0,
        cashExpense: 0,
        totalDraw: 0
      };
    }

    const row = dateMap[t.date];
    const amt = Number(t.amount) || 0;

    if (t.type === 'income') {
      row.totalIncome += amt;
      grandTotalIncome += amt;

      const catUpper = (t.category || '').toUpperCase();
      if (isCashMethod(t.category)) {
        row.cashIncome += amt;
        grandCashIncome += amt;
      } else if (catUpper.includes('BCA') || catUpper.includes('TRANSFER')) {
        row.bcaIncome += amt;
        grandBcaIncome += amt;
      } else if (catUpper.includes('QRIS')) {
        row.qrisIncome += amt;
        grandQrisIncome += amt;
      } else if (catUpper.includes('EDC')) {
        row.edcIncome += amt;
        grandEdcIncome += amt;
      }
    } else if (t.type === 'expense') {
      row.totalExpense += amt;
      grandTotalExpense += amt;
      if (isCashSource(t.source)) {
        row.cashExpense += amt;
      }
    } else if (t.type === 'draw') {
      row.totalDraw += amt;
      grandTotalDraw += amt;
    }
  });

  const sortedDates = Object.keys(dateMap).sort();
  const rows = sortedDates.map(d => {
    const r = dateMap[d];
    return {
      'Tanggal': r.date,
      'Pemasukan Tunai (Rp)': r.cashIncome,
      'Transfer BCA (Rp)': r.bcaIncome,
      'QRIS (Rp)': r.qrisIncome,
      'EDC (Rp)': r.edcIncome,
      'TOTAL OMSET (Rp)': r.totalIncome,
      'Total Biaya (Rp)': r.totalExpense,
      'Tarik Owner (Rp)': r.totalDraw,
      'Sisa Kas Fisik (Rp)': (r.cashIncome - r.cashExpense - r.totalDraw)
    };
  });

  // Append Grand Total Row at bottom
  rows.push({
    'Tanggal': `GRAND TOTAL (${formattedMonthName.toUpperCase()})`,
    'Pemasukan Tunai (Rp)': grandCashIncome,
    'Transfer BCA (Rp)': grandBcaIncome,
    'QRIS (Rp)': grandQrisIncome,
    'EDC (Rp)': grandEdcIncome,
    'TOTAL OMSET (Rp)': grandTotalIncome,
    'Total Biaya (Rp)': grandTotalExpense,
    'Tarik Owner (Rp)': grandTotalDraw,
    'Sisa Kas Fisik (Rp)': (grandCashIncome - grandTotalExpense - grandTotalDraw)
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, `Rekap_${selectedMonth}`);

  const fileName = `Rekap_Bulanan_SNAPRINT_${selectedMonth}.xlsx`;
  XLSX.writeFile(wb, fileName);

  Swal.fire({
    icon: 'success',
    title: 'Excel Bulanan Diunduh',
    text: `File ${fileName} telah disimpan dengan baris Grand Total lengkap.`,
    timer: 2000,
    showConfirmButton: false
  });
}

function printMonthlyRecapReport() {
  const monthInput = document.getElementById('monthlyRecapInput');
  const selectedMonth = monthInput ? monthInput.value : getCurrentMonthStr();
  const [mYear, mMonth] = selectedMonth.split('-');
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const formattedMonthName = `${monthNames[Number(mMonth) - 1]} ${mYear}`;

  const profile = appData.shopProfile || DEFAULT_SHOP_PROFILE;
  const monthTransactions = appData.transactions.filter(t => (t.date || '').startsWith(selectedMonth));

  const dateMap = {};
  let grandTotalIncome = 0;
  let grandCashIncome = 0;
  let grandBcaIncome = 0;
  let grandQrisIncome = 0;
  let grandEdcIncome = 0;
  let grandTotalExpense = 0;
  let grandTotalDraw = 0;

  monthTransactions.forEach(t => {
    if (!dateMap[t.date]) {
      dateMap[t.date] = {
        date: t.date,
        cashIncome: 0,
        bcaIncome: 0,
        qrisIncome: 0,
        edcIncome: 0,
        totalIncome: 0,
        totalExpense: 0,
        cashExpense: 0,
        totalDraw: 0
      };
    }

    const row = dateMap[t.date];
    const amt = Number(t.amount) || 0;

    if (t.type === 'income') {
      row.totalIncome += amt;
      grandTotalIncome += amt;

      const catUpper = (t.category || '').toUpperCase();
      if (isCashMethod(t.category)) {
        row.cashIncome += amt;
        grandCashIncome += amt;
      } else if (catUpper.includes('BCA') || catUpper.includes('TRANSFER')) {
        row.bcaIncome += amt;
        grandBcaIncome += amt;
      } else if (catUpper.includes('QRIS')) {
        row.qrisIncome += amt;
        grandQrisIncome += amt;
      } else if (catUpper.includes('EDC')) {
        row.edcIncome += amt;
        grandEdcIncome += amt;
      }
    } else if (t.type === 'expense') {
      row.totalExpense += amt;
      grandTotalExpense += amt;
      if (isCashSource(t.source)) {
        row.cashExpense += amt;
      }
    } else if (t.type === 'draw') {
      row.totalDraw += amt;
      grandTotalDraw += amt;
    }
  });

  // Populate A4 Print Header
  document.getElementById('printA4ShopName').textContent = `${profile.name} ${profile.badge || ''}`;
  document.getElementById('printA4ShopAddress').textContent = profile.address || profile.sub || '';
  document.getElementById('printA4ReportTitle').textContent = `LAPORAN REKAPITULASI BULANAN & GRAND TOTAL PEMASUKAN`;
  document.getElementById('printA4DateHeader').textContent = `Bulan: ${formattedMonthName.toUpperCase()}`;

  document.getElementById('printA4OpeningCash').textContent = '-';
  document.getElementById('printA4TotalIncome').textContent = formatRupiah(grandTotalIncome);
  document.getElementById('printA4TotalExpense').textContent = formatRupiah(grandTotalExpense);
  document.getElementById('printA4TotalDraw').textContent = formatRupiah(grandTotalDraw);
  document.getElementById('printA4ClosingCash').textContent = formatRupiah(grandCashIncome - grandTotalExpense - grandTotalDraw);

  // Income details breakdown in print
  const incomeDetailsElem = document.getElementById('printA4IncomeDetails');
  if (incomeDetailsElem) {
    incomeDetailsElem.innerHTML = `
      <div class="flex justify-between"><span>&bull; Pemasukan Tunai / Cash:</span><span class="font-bold">${formatRupiah(grandCashIncome)}</span></div>
      <div class="flex justify-between"><span>&bull; Transfer BCA:</span><span class="font-bold">${formatRupiah(grandBcaIncome)}</span></div>
      <div class="flex justify-between"><span>&bull; QRIS:</span><span class="font-bold">${formatRupiah(grandQrisIncome)}</span></div>
      <div class="flex justify-between"><span>&bull; EDC:</span><span class="font-bold">${formatRupiah(grandEdcIncome)}</span></div>
    `;
  }

  // Monthly Table in Print
  const tbody = document.getElementById('printA4TableBody');
  if (tbody) {
    tbody.innerHTML = '';
    const sortedDates = Object.keys(dateMap).sort();

    sortedDates.forEach(d => {
      const r = dateMap[d];
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="border border-black px-2 py-1 font-bold">${r.date}</td>
        <td class="border border-black px-2 py-1 text-right">Tunai: ${formatRupiah(r.cashIncome)}</td>
        <td class="border border-black px-2 py-1 text-right">BCA: ${formatRupiah(r.bcaIncome)} | QRIS: ${formatRupiah(r.qrisIncome)} | EDC: ${formatRupiah(r.edcIncome)}</td>
        <td class="border border-black px-2 py-1 text-right text-rose-800">Biaya: ${formatRupiah(r.totalExpense)} | Tarik: ${formatRupiah(r.totalDraw)}</td>
        <td class="border border-black px-2 py-1 text-right font-black text-emerald-800">Omset: ${formatRupiah(r.totalIncome)}</td>
      `;
      tbody.appendChild(tr);
    });

    // Add Grand Total Row in Print
    const trGrand = document.createElement('tr');
    trGrand.className = 'bg-slate-200 font-black border-t-2 border-black';
    trGrand.innerHTML = `
      <td class="border border-black px-2 py-1.5 font-bold">GRAND TOTAL</td>
      <td class="border border-black px-2 py-1.5 text-right">Tunai: ${formatRupiah(grandCashIncome)}</td>
      <td class="border border-black px-2 py-1.5 text-right">BCA: ${formatRupiah(grandBcaIncome)} | QRIS: ${formatRupiah(grandQrisIncome)} | EDC: ${formatRupiah(grandEdcIncome)}</td>
      <td class="border border-black px-2 py-1.5 text-right text-rose-900">Biaya: ${formatRupiah(grandTotalExpense)} | Tarik: ${formatRupiah(grandTotalDraw)}</td>
      <td class="border border-black px-2 py-1.5 text-right font-black text-emerald-900 text-xs">OMSET: ${formatRupiah(grandTotalIncome)}</td>
    `;
    tbody.appendChild(trGrand);
  }

  window.print();
}

// ================= OWNER PIN VERIFICATION SECURITY =================
function verifyOwnerPin(onSuccessCallback) {
  const currentPin = appData.ownerPin || DEFAULT_OWNER_PIN;

  Swal.fire({
    title: '🔒 Keamanan: Masukkan PIN Owner',
    html: `
      <div class="text-center text-xs text-slate-600 mb-3">
        Fitur <strong>Penarikan Kas Owner</strong> diproteksi keamanan.<br>Silakan masukkan 4 digit PIN Owner.
      </div>
      <div class="relative w-48 mx-auto">
        <input type="password" id="swalOwnerPinInput" maxlength="6" class="w-full text-center text-2xl font-black tracking-widest px-4 py-2 border-2 border-amber-400 rounded-xl focus:outline-none focus:ring-4 focus:ring-amber-300 font-mono" placeholder="••••" autocomplete="off">
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Buka Akses',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#d97706',
    cancelButtonColor: '#64748b',
    didOpen: () => {
      const pinInput = document.getElementById('swalOwnerPinInput');
      if (pinInput) {
        pinInput.focus();
        pinInput.addEventListener('keyup', (e) => {
          if (e.key === 'Enter') {
            Swal.clickConfirm();
          }
        });
      }
    },
    preConfirm: () => {
      const inputVal = document.getElementById('swalOwnerPinInput').value.trim();
      if (!inputVal) {
        Swal.showValidationMessage('Silakan masukkan 4 angka PIN Owner');
        return false;
      }
      if (inputVal !== currentPin) {
        Swal.showValidationMessage('❌ PIN Salah! Akses penarikan ditolak.');
        return false;
      }
      return true;
    }
  }).then((res) => {
    if (res.isConfirmed && typeof onSuccessCallback === 'function') {
      onSuccessCallback();
    }
  });
}

// ================= MODAL & FORM HANDLERS =================
function openModal(type) {
  if (type === 'income') {
    document.getElementById('formIncome').reset();
    document.getElementById('incomeEditId').value = '';
    document.getElementById('modalIncomeTitle').textContent = 'Catat Pemasukan Baru';
    document.getElementById('incomeDate').value = activeDate;
    document.getElementById('incomeTime').value = getCurrentTimeStr();
    document.getElementById('modalIncome').classList.remove('hidden');
    setTimeout(() => document.getElementById('incomeAmount').focus(), 100);
  } else if (type === 'expense') {
    document.getElementById('formExpense').reset();
    document.getElementById('expenseEditId').value = '';
    document.getElementById('modalExpenseTitle').textContent = 'Catat Pengeluaran Baru';
    document.getElementById('expenseDate').value = activeDate;
    document.getElementById('expenseTime').value = getCurrentTimeStr();
    document.getElementById('modalExpense').classList.remove('hidden');
    setTimeout(() => document.getElementById('expenseAmount').focus(), 100);
  } else if (type === 'draw') {
    // PROTECTED BY 4-DIGIT PIN
    verifyOwnerPin(() => {
      document.getElementById('formDraw').reset();
      document.getElementById('drawEditId').value = '';
      document.getElementById('modalDrawTitle').textContent = 'Penarikan Kas Tunai Oleh Owner';
      document.getElementById('drawDate').value = activeDate;
      document.getElementById('drawTime').value = getCurrentTimeStr();
      document.getElementById('modalDraw').classList.remove('hidden');
      setTimeout(() => document.getElementById('drawAmount').focus(), 100);
    });
  } else if (type === 'initialBalance') {
    openInitialBalanceModal();
  }
}

function closeModal(type) {
  const modal = document.getElementById(`modal${type.charAt(0).toUpperCase() + type.slice(1)}`);
  if (modal) modal.classList.add('hidden');
}

// Form Submit: Pemasukan
function handleIncomeSubmit(e) {
  e.preventDefault();
  const editId = document.getElementById('incomeEditId').value;
  const methodRadio = document.querySelector('input[name="incomeMethod"]:checked');
  const method = methodRadio ? methodRadio.value : (appData.paymentMethods[0] ? appData.paymentMethods[0].name : 'TUNAI/CASH');
  const amount = parseRupiah(document.getElementById('incomeAmount').value);
  const description = document.getElementById('incomeDescription').value.trim();
  const date = document.getElementById('incomeDate').value;
  const time = document.getElementById('incomeTime').value || getCurrentTimeStr();

  if (amount <= 0) {
    Swal.fire('Nominal Kurang', 'Masukkan nominal pemasukan yang valid.', 'warning');
    return;
  }

  if (editId) {
    const idx = appData.transactions.findIndex(t => t.id === editId);
    if (idx !== -1) {
      appData.transactions[idx] = {
        ...appData.transactions[idx],
        category: method,
        source: method,
        amount,
        description,
        date,
        time
      };
    }
  } else {
    appData.transactions.push({
      id: generateId('inc'),
      type: 'income',
      category: method,
      source: method,
      amount,
      description,
      date,
      time,
      createdAt: new Date().toISOString()
    });
  }

  saveData();
  closeModal('income');
  activeDate = date;
  document.getElementById('recapDateInput').value = activeDate;
  updateUI();

  Swal.fire({
    icon: 'success',
    title: 'Pemasukan Tersimpan',
    text: `Pemasukan ${method} sebesar ${formatRupiah(amount)} berhasil dicatat.`,
    timer: 1600,
    showConfirmButton: false
  });
}

// Form Submit: Pengeluaran
function handleExpenseSubmit(e) {
  e.preventDefault();
  const editId = document.getElementById('expenseEditId').value;
  const category = document.getElementById('expenseCategory').value;
  const sourceRadio = document.querySelector('input[name="expenseSource"]:checked');
  const source = sourceRadio ? sourceRadio.value : 'TUNAI/CASH';
  const amount = parseRupiah(document.getElementById('expenseAmount').value);
  const description = document.getElementById('expenseDescription').value.trim();
  const date = document.getElementById('expenseDate').value;
  const time = document.getElementById('expenseTime').value || getCurrentTimeStr();

  if (amount <= 0) {
    Swal.fire('Nominal Kurang', 'Masukkan nominal pengeluaran yang valid.', 'warning');
    return;
  }

  if (editId) {
    const idx = appData.transactions.findIndex(t => t.id === editId);
    if (idx !== -1) {
      appData.transactions[idx] = {
        ...appData.transactions[idx],
        category,
        source,
        amount,
        description,
        date,
        time
      };
    }
  } else {
    appData.transactions.push({
      id: generateId('exp'),
      type: 'expense',
      category,
      source,
      amount,
      description,
      date,
      time,
      createdAt: new Date().toISOString()
    });
  }

  saveData();
  closeModal('expense');
  activeDate = date;
  document.getElementById('recapDateInput').value = activeDate;
  updateUI();

  Swal.fire({
    icon: 'success',
    title: 'Pengeluaran Tersimpan',
    text: `Pengeluaran ${category} sebesar ${formatRupiah(amount)} berhasil dicatat.`,
    timer: 1600,
    showConfirmButton: false
  });
}

// Form Submit: Penarikan Owner
function handleDrawSubmit(e) {
  e.preventDefault();
  const editId = document.getElementById('drawEditId').value;
  const amount = parseRupiah(document.getElementById('drawAmount').value);
  const description = document.getElementById('drawDescription').value.trim() || 'Penarikan Kas Fisik Owner';
  const date = document.getElementById('drawDate').value;
  const time = document.getElementById('drawTime').value || getCurrentTimeStr();

  if (amount <= 0) {
    Swal.fire('Nominal Kurang', 'Masukkan nominal penarikan yang valid.', 'warning');
    return;
  }

  if (editId) {
    const idx = appData.transactions.findIndex(t => t.id === editId);
    if (idx !== -1) {
      appData.transactions[idx] = {
        ...appData.transactions[idx],
        amount,
        description,
        date,
        time
      };
    }
  } else {
    appData.transactions.push({
      id: generateId('drw'),
      type: 'draw',
      category: 'Penarikan Kas Tunai Owner',
      source: 'TUNAI/CASH',
      amount,
      description,
      date,
      time,
      createdAt: new Date().toISOString()
    });
  }

  saveData();
  closeModal('draw');
  activeDate = date;
  document.getElementById('recapDateInput').value = activeDate;
  updateUI();

  Swal.fire({
    icon: 'success',
    title: 'Penarikan Owner Dicatat',
    text: `Penarikan tunai sebesar ${formatRupiah(amount)} berhasil disimpan.`,
    timer: 1600,
    showConfirmButton: false
  });
}

// Edit / Update Transaction (Protected with Owner PIN 2209)
function editTransaction(id) {
  const item = appData.transactions.find(t => t.id === id);
  if (!item) return;

  verifyOwnerPin(() => {
    if (item.type === 'income') {
      document.getElementById('formIncome').reset();
      document.getElementById('modalIncomeTitle').textContent = 'Update Pemasukan (Owner)';
      document.getElementById('incomeEditId').value = item.id;
      document.getElementById('incomeAmount').value = item.amount.toLocaleString('id-ID');
      document.getElementById('incomeDescription').value = item.description || '';
      document.getElementById('incomeDate').value = item.date;
      document.getElementById('incomeTime').value = item.time || '';

      const radio = document.querySelector(`input[name="incomeMethod"][value="${item.category}"]`);
      if (radio) radio.checked = true;
      document.getElementById('modalIncome').classList.remove('hidden');
      setTimeout(() => document.getElementById('incomeAmount').focus(), 100);
    } else if (item.type === 'expense') {
      document.getElementById('formExpense').reset();
      document.getElementById('modalExpenseTitle').textContent = 'Update Pengeluaran (Owner)';
      document.getElementById('expenseEditId').value = item.id;
      document.getElementById('expenseCategory').value = item.category || 'Operasional lain';
      document.getElementById('expenseAmount').value = item.amount.toLocaleString('id-ID');
      document.getElementById('expenseDescription').value = item.description || '';
      document.getElementById('expenseDate').value = item.date;
      document.getElementById('expenseTime').value = item.time || '';

      const radio = document.querySelector(`input[name="expenseSource"][value="${item.source || 'TUNAI/CASH'}"]`);
      if (radio) radio.checked = true;
      document.getElementById('modalExpense').classList.remove('hidden');
      setTimeout(() => document.getElementById('expenseAmount').focus(), 100);
    } else if (item.type === 'draw') {
      document.getElementById('formDraw').reset();
      document.getElementById('modalDrawTitle').textContent = 'Update Penarikan Kas Owner';
      document.getElementById('drawEditId').value = item.id;
      document.getElementById('drawAmount').value = item.amount.toLocaleString('id-ID');
      document.getElementById('drawDescription').value = item.description || '';
      document.getElementById('drawDate').value = item.date;
      document.getElementById('drawTime').value = item.time || '';
      document.getElementById('modalDraw').classList.remove('hidden');
      setTimeout(() => document.getElementById('drawAmount').focus(), 100);
    }
  });
}

// Delete Transaction (Protected with Owner PIN 2209)
function deleteTransaction(id) {
  const item = appData.transactions.find(t => t.id === id);
  if (!item) return;

  verifyOwnerPin(() => {
    Swal.fire({
      title: 'Hapus Transaksi?',
      text: `Apakah Anda yakin ingin menghapus data ${item.type} sebesar ${formatRupiah(item.amount)}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        appData.transactions = appData.transactions.filter(t => t.id !== id);
        saveData();
        updateUI();
        Swal.fire({
          icon: 'success',
          title: 'Terhapus',
          text: 'Transaksi telah dihapus.',
          timer: 1400,
          showConfirmButton: false
        });
      }
    });
  });
}

// ================= MODAL AWAL KAS TOKO (PROTECTED) =================
function openInitialBalanceModal() {
  verifyOwnerPin(() => {
    document.getElementById('initialBalanceAmount').value = (appData.initialCashBalance || 0).toLocaleString('id-ID');
    document.getElementById('modalInitialBalance').classList.remove('hidden');
    setTimeout(() => document.getElementById('initialBalanceAmount').focus(), 100);
  });
}

function handleInitialBalanceSubmit(e) {
  e.preventDefault();
  const amt = parseRupiah(document.getElementById('initialBalanceAmount').value);
  appData.initialCashBalance = amt;
  saveData();
  closeModal('initialBalance');
  applyShopProfileToUI();
  updateUI();

  Swal.fire({
    icon: 'success',
    title: 'Modal Awal Disimpan',
    text: `Modal kas diatur menjadi ${formatRupiah(amt)}.`,
    timer: 1600,
    showConfirmButton: false
  });
}

// ================= DYNAMIC MASTER DATA SETTINGS (CRUD) =================
function renderSettingsMasterLists() {
  // Payment Methods List
  const pmList = document.getElementById('settingPaymentMethodsList');
  if (pmList) {
    pmList.innerHTML = '';
    appData.paymentMethods.forEach((pm, index) => {
      const div = document.createElement('div');
      div.className = 'p-3 flex items-center justify-between text-xs hover:bg-slate-50 transition';
      div.innerHTML = `
        <div class="flex items-center space-x-2">
          <span class="p-1.5 rounded-lg bg-${pm.color || 'emerald'}-50 text-${pm.color || 'emerald'}-600">
            <i class="fa-solid ${pm.icon || 'fa-money-bill-wave'} text-xs"></i>
          </span>
          <div>
            <span class="font-bold text-slate-800 block">${escapeHtml(pm.name)}</span>
            <span class="text-[10px] text-slate-400">${pm.isCash ? '💵 Kas Tunai (Masuk Laci)' : '💳 Non-Tunai / Rekening'}</span>
          </div>
        </div>
        <div class="flex items-center space-x-1">
          <button onclick="editPaymentMethod(${index})" class="p-1.5 text-slate-400 hover:text-blue-600 transition"><i class="fa-solid fa-pen"></i></button>
          <button onclick="deletePaymentMethod(${index})" class="p-1.5 text-slate-400 hover:text-rose-600 transition"><i class="fa-solid fa-trash"></i></button>
        </div>
      `;
      pmList.appendChild(div);
    });
  }

  // Expense Categories List
  const catList = document.getElementById('settingExpenseCategoriesList');
  if (catList) {
    catList.innerHTML = '';
    appData.expenseCategories.forEach((cat, index) => {
      const div = document.createElement('div');
      div.className = 'p-3 flex items-center justify-between text-xs hover:bg-slate-50 transition';
      div.innerHTML = `
        <div class="flex items-center space-x-2">
          <span class="p-1.5 rounded-lg bg-rose-50 text-rose-600">
            <i class="fa-solid ${cat.icon || 'fa-tag'} text-xs"></i>
          </span>
          <span class="font-bold text-slate-800">${escapeHtml(cat.name)}</span>
        </div>
        <div class="flex items-center space-x-1">
          <button onclick="editExpenseCategory(${index})" class="p-1.5 text-slate-400 hover:text-blue-600 transition"><i class="fa-solid fa-pen"></i></button>
          <button onclick="deleteExpenseCategory(${index})" class="p-1.5 text-slate-400 hover:text-rose-600 transition"><i class="fa-solid fa-trash"></i></button>
        </div>
      `;
      catList.appendChild(div);
    });
  }
}

function openAddPaymentMethodModal() {
  Swal.fire({
    title: 'Tambah Metode Pembayaran',
    html: `
      <div class="text-left text-xs space-y-3">
        <div>
          <label class="block font-bold mb-1">Nama Metode (contoh: GoPay, Bank Mandiri)</label>
          <input id="swalPmName" class="w-full px-3 py-2 border rounded-lg" placeholder="Nama Metode">
        </div>
        <div>
          <label class="block font-bold mb-1">Tipe Arus Kas</label>
          <select id="swalPmIsCash" class="w-full px-3 py-2 border rounded-lg">
            <option value="false">💳 Non-Tunai / Bank / E-Wallet</option>
            <option value="true">💵 Kas Tunai Fisik (Masuk Laci Kasir)</option>
          </select>
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Simpan',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#10b981',
    preConfirm: () => {
      const name = document.getElementById('swalPmName').value.trim();
      const isCash = document.getElementById('swalPmIsCash').value === 'true';
      if (!name) {
        Swal.showValidationMessage('Nama metode wajib diisi');
        return false;
      }
      return { name, isCash };
    }
  }).then((res) => {
    if (res.isConfirmed && res.value) {
      appData.paymentMethods.push({
        id: generateId('pm'),
        name: res.value.name,
        label: res.value.name,
        isCash: res.value.isCash,
        color: res.value.isCash ? 'emerald' : 'blue',
        icon: res.value.isCash ? 'fa-money-bill-wave' : 'fa-credit-card',
        note: res.value.isCash ? 'Masuk laci kas' : 'Non-tunai'
      });
      saveData();
      populateDynamicFormInputs();
      updateUI();
    }
  });
}

function editPaymentMethod(index) {
  const pm = appData.paymentMethods[index];
  if (!pm) return;

  Swal.fire({
    title: 'Edit Metode Pembayaran',
    html: `
      <div class="text-left text-xs space-y-3">
        <div>
          <label class="block font-bold mb-1">Nama Metode</label>
          <input id="swalPmName" class="w-full px-3 py-2 border rounded-lg" value="${escapeHtml(pm.name)}">
        </div>
        <div>
          <label class="block font-bold mb-1">Tipe Arus Kas</label>
          <select id="swalPmIsCash" class="w-full px-3 py-2 border rounded-lg">
            <option value="false" ${!pm.isCash ? 'selected' : ''}>💳 Non-Tunai / Bank / E-Wallet</option>
            <option value="true" ${pm.isCash ? 'selected' : ''}>💵 Kas Tunai Fisik (Masuk Laci Kasir)</option>
          </select>
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Update',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#10b981',
    preConfirm: () => {
      const name = document.getElementById('swalPmName').value.trim();
      const isCash = document.getElementById('swalPmIsCash').value === 'true';
      if (!name) {
        Swal.showValidationMessage('Nama metode wajib diisi');
        return false;
      }
      return { name, isCash };
    }
  }).then((res) => {
    if (res.isConfirmed && res.value) {
      appData.paymentMethods[index].name = res.value.name;
      appData.paymentMethods[index].label = res.value.name;
      appData.paymentMethods[index].isCash = res.value.isCash;
      saveData();
      populateDynamicFormInputs();
      updateUI();
    }
  });
}

function deletePaymentMethod(index) {
  if (appData.paymentMethods.length <= 1) {
    Swal.fire('Perhatian', 'Minimal harus ada 1 metode pembayaran.', 'warning');
    return;
  }
  appData.paymentMethods.splice(index, 1);
  saveData();
  populateDynamicFormInputs();
  updateUI();
}

function openAddExpenseCategoryModal() {
  Swal.fire({
    title: 'Tambah Kategori Pengeluaran',
    html: `
      <div class="text-left text-xs">
        <label class="block font-bold mb-1">Nama Kategori Biaya (contoh: Gaji Pegawai, Listrik & Air)</label>
        <input id="swalCatName" class="w-full px-3 py-2 border rounded-lg" placeholder="Nama Kategori">
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Simpan',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#f43f5e',
    preConfirm: () => {
      const name = document.getElementById('swalCatName').value.trim();
      if (!name) {
        Swal.showValidationMessage('Nama kategori wajib diisi');
        return false;
      }
      return name;
    }
  }).then((res) => {
    if (res.isConfirmed && res.value) {
      appData.expenseCategories.push({
        id: generateId('cat'),
        name: res.value,
        icon: 'fa-tag'
      });
      saveData();
      populateDynamicFormInputs();
      updateUI();
    }
  });
}

function editExpenseCategory(index) {
  const cat = appData.expenseCategories[index];
  if (!cat) return;

  Swal.fire({
    title: 'Edit Kategori Pengeluaran',
    html: `
      <div class="text-left text-xs">
        <label class="block font-bold mb-1">Nama Kategori Biaya</label>
        <input id="swalCatName" class="w-full px-3 py-2 border rounded-lg" value="${escapeHtml(cat.name)}">
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Update',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#f43f5e',
    preConfirm: () => {
      const name = document.getElementById('swalCatName').value.trim();
      if (!name) {
        Swal.showValidationMessage('Nama kategori wajib diisi');
        return false;
      }
      return name;
    }
  }).then((res) => {
    if (res.isConfirmed && res.value) {
      appData.expenseCategories[index].name = res.value;
      saveData();
      populateDynamicFormInputs();
      updateUI();
    }
  });
}

function deleteExpenseCategory(index) {
  if (appData.expenseCategories.length <= 1) {
    Swal.fire('Perhatian', 'Minimal harus ada 1 kategori pengeluaran.', 'warning');
    return;
  }
  appData.expenseCategories.splice(index, 1);
  saveData();
  populateDynamicFormInputs();
  updateUI();
}

// ================= PRINT ENGINE (A4 & THERMAL POS) =================
function openPrintModal() {
  document.getElementById('modalPrintSelect').classList.remove('hidden');
}

function printFormalA4Report() {
  closeModal('printSelect');
  const profile = appData.shopProfile || DEFAULT_SHOP_PROFILE;
  const periodTransactions = getFilteredPeriodTransactions();
  const { ledgerMap, currentRunningBalance } = computeCashFlowLedger();

  let openingCash = 0;
  let closingCash = 0;

  if (periodMode === 'day') {
    const record = ledgerMap[activeDate];
    openingCash = record ? record.openingCash : (Number(appData.initialCashBalance) || 0);
    closingCash = record ? record.closingCash : currentRunningBalance;
  } else {
    const startRecord = ledgerMap[rangeStartDate];
    const endRecord = ledgerMap[rangeEndDate];
    openingCash = startRecord ? startRecord.openingCash : (Number(appData.initialCashBalance) || 0);
    closingCash = endRecord ? endRecord.closingCash : currentRunningBalance;
  }

  let totalIncome = 0;
  let totalExpense = 0;
  let totalDraw = 0;

  const incomeBreakdown = {};
  const expenseBreakdown = {};

  periodTransactions.forEach(t => {
    const amt = Number(t.amount) || 0;
    if (t.type === 'income') {
      totalIncome += amt;
      incomeBreakdown[t.category] = (incomeBreakdown[t.category] || 0) + amt;
    } else if (t.type === 'expense') {
      totalExpense += amt;
      expenseBreakdown[t.category] = (expenseBreakdown[t.category] || 0) + amt;
    } else if (t.type === 'draw') {
      totalDraw += amt;
    }
  });

  // Populate A4 Print
  document.getElementById('printA4ShopName').textContent = `${profile.name} ${profile.badge || ''}`;
  document.getElementById('printA4ShopAddress').textContent = profile.address || profile.sub || '';
  document.getElementById('printA4DateHeader').textContent = periodMode === 'day' ? `Tanggal: ${formatIndoDate(activeDate)}` : `Periode: ${formatIndoDate(rangeStartDate)} s/d ${formatIndoDate(rangeEndDate)}`;
  
  document.getElementById('printA4OpeningCash').textContent = formatRupiah(openingCash);
  document.getElementById('printA4TotalIncome').textContent = formatRupiah(totalIncome);
  document.getElementById('printA4TotalExpense').textContent = formatRupiah(totalExpense);
  document.getElementById('printA4TotalDraw').textContent = formatRupiah(totalDraw);
  document.getElementById('printA4ClosingCash').textContent = formatRupiah(closingCash);

  // Income details
  const incomeDetailsElem = document.getElementById('printA4IncomeDetails');
  if (incomeDetailsElem) {
    incomeDetailsElem.innerHTML = Object.entries(incomeBreakdown).map(([name, amt]) => `
      <div class="flex justify-between">
        <span>&bull; ${escapeHtml(name)}:</span>
        <span class="font-semibold">${formatRupiah(amt)}</span>
      </div>
    `).join('');
  }

  // Expense details
  const expenseDetailsElem = document.getElementById('printA4ExpenseDetails');
  if (expenseDetailsElem) {
    expenseDetailsElem.innerHTML = Object.entries(expenseBreakdown).map(([name, amt]) => `
      <div class="flex justify-between">
        <span>&bull; ${escapeHtml(name)}:</span>
        <span class="font-semibold">${formatRupiah(amt)}</span>
      </div>
    `).join('');
  }

  // Transactions table
  const tbody = document.getElementById('printA4TableBody');
  if (tbody) {
    tbody.innerHTML = '';
    const sorted = [...periodTransactions].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    if (sorted.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="border border-black p-2 text-center">Tidak ada transaksi pada periode ini.</td></tr>`;
    } else {
      sorted.forEach(t => {
        const tr = document.createElement('tr');
        const typeLabel = t.type === 'income' ? 'Pemasukan' : (t.type === 'expense' ? 'Pengeluaran' : 'Tarik Owner');
        const sign = t.type === 'income' ? '+' : '-';
        tr.innerHTML = `
          <td class="border border-black px-2 py-1">${t.date} ${t.time || ''}</td>
          <td class="border border-black px-2 py-1 font-bold">${typeLabel}</td>
          <td class="border border-black px-2 py-1">${escapeHtml(t.category)} ${t.source && t.type === 'expense' ? `(${escapeHtml(t.source)})` : ''}</td>
          <td class="border border-black px-2 py-1">${escapeHtml(t.description || '-')}</td>
          <td class="border border-black px-2 py-1 text-right font-bold">${sign}${formatRupiah(t.amount)}</td>
        `;
        tbody.appendChild(tr);
      });
    }
  }

  window.print();
}

function printThermalReceipt() {
  closeModal('printSelect');
  const profile = appData.shopProfile || DEFAULT_SHOP_PROFILE;
  const periodTransactions = getFilteredPeriodTransactions();
  const { ledgerMap, currentRunningBalance } = computeCashFlowLedger();

  let openingCash = 0;
  let closingCash = 0;

  if (periodMode === 'day') {
    const record = ledgerMap[activeDate];
    openingCash = record ? record.openingCash : (Number(appData.initialCashBalance) || 0);
    closingCash = record ? record.closingCash : currentRunningBalance;
  } else {
    const startRecord = ledgerMap[rangeStartDate];
    const endRecord = ledgerMap[rangeEndDate];
    openingCash = startRecord ? startRecord.openingCash : (Number(appData.initialCashBalance) || 0);
    closingCash = endRecord ? endRecord.closingCash : currentRunningBalance;
  }

  let totalIncome = 0;
  let totalExpense = 0;
  let totalDraw = 0;

  periodTransactions.forEach(t => {
    const amt = Number(t.amount) || 0;
    if (t.type === 'income') totalIncome += amt;
    else if (t.type === 'expense') totalExpense += amt;
    else if (t.type === 'draw') totalDraw += amt;
  });

  document.getElementById('printThermalShopName').textContent = `${profile.name} ${profile.badge || ''}`;
  document.getElementById('printThermalShopSub').textContent = profile.sub || 'Rekapitulasi Kas Harian';
  document.getElementById('printThermalShopAddress').textContent = profile.address || '';
  document.getElementById('printThermalDate').textContent = periodMode === 'day' ? `Tgl: ${activeDate}` : `Per: ${rangeStartDate} s/d ${rangeEndDate}`;

  document.getElementById('printThermalOpening').textContent = formatRupiah(openingCash);
  document.getElementById('printThermalIncome').textContent = formatRupiah(totalIncome);
  document.getElementById('printThermalExpense').textContent = formatRupiah(totalExpense);
  document.getElementById('printThermalDraw').textContent = formatRupiah(totalDraw);
  document.getElementById('printThermalClosing').textContent = formatRupiah(closingCash);
  document.getElementById('printThermalFooter').textContent = profile.footer || 'Terima Kasih - SNAPRINT';

  window.print();
}

function printCashFlowReport() {
  const { ledger, currentRunningBalance } = computeCashFlowLedger();
  const profile = appData.shopProfile || DEFAULT_SHOP_PROFILE;

  document.getElementById('printA4ShopName').textContent = `${profile.name} ${profile.badge || ''}`;
  document.getElementById('printA4ShopAddress').textContent = 'BUKU KAS TUNAI & MUTASI SALDO HARIAN (CASH LEDGER)';
  document.getElementById('printA4DateHeader').textContent = `Dicetak Pada: ${formatIndoDate(getTodayStr())}`;
  
  let totalCashIn = 0;
  let totalCashExp = 0;
  let totalDraw = 0;
  ledger.forEach(r => {
    totalCashIn += r.cashIncome;
    totalCashExp += r.cashExpense;
    totalDraw += r.cashDraw;
  });

  document.getElementById('printA4OpeningCash').textContent = formatRupiah(appData.initialCashBalance || 0);
  document.getElementById('printA4TotalIncome').textContent = formatRupiah(totalCashIn);
  document.getElementById('printA4TotalExpense').textContent = formatRupiah(totalCashExp);
  document.getElementById('printA4TotalDraw').textContent = formatRupiah(totalDraw);
  document.getElementById('printA4ClosingCash').textContent = formatRupiah(currentRunningBalance);

  const tbody = document.getElementById('printA4TableBody');
  if (tbody) {
    tbody.innerHTML = '';
    ledger.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="border border-black px-2 py-1">${r.date}</td>
        <td class="border border-black px-2 py-1">Saldo Awal: ${formatRupiah(r.openingCash)}</td>
        <td class="border border-black px-2 py-1 text-emerald-800 font-bold">+${formatRupiah(r.cashIncome)}</td>
        <td class="border border-black px-2 py-1 text-rose-800">Biaya: -${formatRupiah(r.cashExpense)} | Tarik: -${formatRupiah(r.cashDraw)}</td>
        <td class="border border-black px-2 py-1 text-right font-black">SALDO: ${formatRupiah(r.closingCash)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  window.print();
}

// ================= EXCEL EXPORTS (SHEETJS) =================
function exportToExcel() {
  const periodTransactions = getFilteredPeriodTransactions();
  if (periodTransactions.length === 0) {
    Swal.fire('Data Kosong', 'Tidak ada transaksi pada periode ini untuk diekspor.', 'info');
    return;
  }

  const wb = XLSX.utils.book_new();
  const dataRows = periodTransactions.map(t => ({
    'Tanggal': t.date,
    'Jam': t.time || '-',
    'Tipe': t.type === 'income' ? 'Pemasukan' : (t.type === 'expense' ? 'Pengeluaran' : 'Penarikan Owner'),
    'Kategori / Metode': t.category,
    'Sumber Dana': t.source || '-',
    'Keterangan': t.description || '-',
    'Nominal (Rp)': t.amount
  }));

  const ws = XLSX.utils.json_to_sheet(dataRows);
  const sheetName = periodMode === 'day' ? `Rekap_${activeDate}` : 'Rekap_Periode';
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const fileName = periodMode === 'day' ? `Rekap_SNAPRINT_${activeDate}.xlsx` : `Rekap_SNAPRINT_${rangeStartDate}_sd_${rangeEndDate}.xlsx`;
  XLSX.writeFile(wb, fileName);

  Swal.fire({
    icon: 'success',
    title: 'Excel Berhasil Diunduh',
    text: `File ${fileName} telah disimpan.`,
    timer: 1800,
    showConfirmButton: false
  });
}

function exportCashFlowExcel() {
  const { ledger } = computeCashFlowLedger();
  const wb = XLSX.utils.book_new();

  const rows = ledger.map(r => ({
    'Tanggal': r.date,
    'Saldo Awal Kas Tunai (Rp)': r.openingCash,
    'Kas Masuk Tunai (+)': r.cashIncome,
    'Biaya Operasional Tunai (-)': r.cashExpense,
    'Penarikan Owner Tunai (-)': r.cashDraw,
    'Perubahan Bersih (Net Change)': r.netCashChange,
    'SALDO AKHIR KAS TUNAI FISIK (=)': r.closingCash
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Buku Kas Tunai Harian');
  XLSX.writeFile(wb, `Buku_Kas_Tunai_SNAPRINT_${getTodayStr()}.xlsx`);

  Swal.fire({
    icon: 'success',
    title: 'Excel Kas Tunai Diunduh',
    text: 'File Buku Kas Tunai telah disimpan.',
    timer: 1800,
    showConfirmButton: false
  });
}

function exportAllToExcel() {
  if (appData.transactions.length === 0) {
    Swal.fire('Data Kosong', 'Belum ada data transaksi untuk diekspor.', 'info');
    return;
  }

  const { ledger } = computeCashFlowLedger();
  const wb = XLSX.utils.book_new();

  // Sheet 1: Buku Kas Tunai
  const cashRows = ledger.map(r => ({
    'Tanggal': r.date,
    'Saldo Awal': r.openingCash,
    'Tunai Masuk (+)': r.cashIncome,
    'Biaya Tunai (-)': r.cashExpense,
    'Tarik Owner (-)': r.cashDraw,
    'Net Mutasi': r.netCashChange,
    'SALDO AKHIR KAS TUNAI': r.closingCash
  }));
  const wsCash = XLSX.utils.json_to_sheet(cashRows);
  XLSX.utils.book_append_sheet(wb, wsCash, 'Buku Kas Tunai');

  // Sheet 2: Semua Transaksi
  const allRows = appData.transactions.map(t => ({
    'ID': t.id,
    'Tanggal': t.date,
    'Jam': t.time || '-',
    'Tipe': t.type === 'income' ? 'Pemasukan' : (t.type === 'expense' ? 'Pengeluaran' : 'Penarikan Owner'),
    'Kategori / Metode': t.category,
    'Sumber Dana': t.source || '-',
    'Keterangan': t.description || '-',
    'Nominal (Rp)': t.amount
  }));
  const wsAll = XLSX.utils.json_to_sheet(allRows);
  XLSX.utils.book_append_sheet(wb, wsAll, 'Semua Transaksi');

  // Sheet 3: Pemasukan Only
  const incomeRows = appData.transactions.filter(t => t.type === 'income').map(t => ({
    'Tanggal': t.date,
    'Jam': t.time || '-',
    'Metode Pembayaran': t.category,
    'Keterangan': t.description || '-',
    'Nominal (Rp)': t.amount
  }));
  const wsIncome = XLSX.utils.json_to_sheet(incomeRows);
  XLSX.utils.book_append_sheet(wb, wsIncome, 'Data Pemasukan');

  // Sheet 4: Pengeluaran Only
  const expenseRows = appData.transactions.filter(t => t.type === 'expense').map(t => ({
    'Tanggal': t.date,
    'Jam': t.time || '-',
    'Kategori Biaya': t.category,
    'Sumber Dana': t.source,
    'Keterangan': t.description || '-',
    'Nominal (Rp)': t.amount
  }));
  const wsExpense = XLSX.utils.json_to_sheet(expenseRows);
  XLSX.utils.book_append_sheet(wb, wsExpense, 'Data Pengeluaran');

  // Sheet 5: Penarikan Owner Only
  const drawRows = appData.transactions.filter(t => t.type === 'draw').map(t => ({
    'Tanggal': t.date,
    'Jam': t.time || '-',
    'Keterangan': t.description || '-',
    'Nominal (Rp)': t.amount
  }));
  const wsDraw = XLSX.utils.json_to_sheet(drawRows);
  XLSX.utils.book_append_sheet(wb, wsDraw, 'Penarikan Owner');

  XLSX.writeFile(wb, `Database_Lengkap_SNAPRINT_GWISATA_${getTodayStr()}.xlsx`);

  Swal.fire({
    icon: 'success',
    title: 'Export Lengkap Berhasil',
    text: 'File database multi-sheet telah diunduh.',
    timer: 1800,
    showConfirmButton: false
  });
}

// ================= BACKUP & RESTORE (JSON) =================
function backupDataJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `BACKUP_SNAPRINT_GWISATA_${getTodayStr()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();

  Swal.fire({
    icon: 'success',
    title: 'Backup Berhasil',
    text: 'File JSON cadangan telah diunduh ke komputer Anda.',
    timer: 1800,
    showConfirmButton: false
  });
}

function restoreDataJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed && (Array.isArray(parsed.transactions) || parsed.transactions)) {
        appData = {
          initialCashBalance: Number(parsed.initialCashBalance) || 0,
          shopProfile: parsed.shopProfile || DEFAULT_SHOP_PROFILE,
          paymentMethods: Array.isArray(parsed.paymentMethods) && parsed.paymentMethods.length > 0 ? parsed.paymentMethods : DEFAULT_PAYMENT_METHODS,
          expenseCategories: Array.isArray(parsed.expenseCategories) && parsed.expenseCategories.length > 0 ? parsed.expenseCategories : DEFAULT_EXPENSE_CATEGORIES,
          expenseSources: Array.isArray(parsed.expenseSources) && parsed.expenseSources.length > 0 ? parsed.expenseSources : DEFAULT_EXPENSE_SOURCES,
          transactions: Array.isArray(parsed.transactions) ? parsed.transactions : []
        };
        saveData();
        applyShopProfileToUI();
        populateDynamicFormInputs();
        updateUI();
        Swal.fire({
          icon: 'success',
          title: 'Restore Berhasil',
          text: `Berhasil memulihkan ${appData.transactions.length} data transaksi & pengaturan.`
        });
      } else {
        throw new Error('Format file tidak sesuai.');
      }
    } catch (err) {
      Swal.fire('Gagal Restore', 'Format file backup JSON tidak valid atau rusak.', 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function resetAllDataConfirm() {
  Swal.fire({
    title: 'Reset Seluruh Data?',
    text: 'Semua riwayat transaksi akan dikosongkan. Tindakan ini tidak bisa dibatalkan!',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Ya, Kosongkan',
    cancelButtonText: 'Batal'
  }).then((result) => {
    if (result.isConfirmed) {
      appData = JSON.parse(JSON.stringify(EMPTY_DATA));
      saveData();
      applyShopProfileToUI();
      populateDynamicFormInputs();
      updateUI();
      Swal.fire({
        icon: 'success',
        title: 'Data Dikosongkan',
        text: 'Aplikasi telah bersih dan siap untuk pencatatan riil.',
        timer: 1600,
        showConfirmButton: false
      });
    }
  });
}
