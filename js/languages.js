// js/languages.js
const translations = {
    en: {
      // Navigation
      dashboard: "Dashboard",
      factories: "Factories",
      processes: "Processes",
      notifications: "Notifications",
      analytics: "Analytics",
      userManagement: "User Management",
      approvals: "Approvals",
      masterDB: "Master DB",
      customerManagement: "Customer Management",
      equipment: "Equipment",
      
      // Common
      searchPlaceholder: "Search...",
      loading: "Loading...",
      logout: "Logout",
      role: "Role",
      submit: "Submit",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      save: "Save",
      refresh: "Refresh",
      export: "Export",
      import: "Import",
      upload: "Upload",
      download: "Download",
      view: "View",
      add: "Add",
      create: "Create",
      update: "Update",
      filter: "Filter",
      search: "Search",
      all: "All",
      total: "Total",
      
      // Login Page
      loginTitle: "Login",
      username: "Username",
      password: "Password",
      enterUsername: "Enter username",
      enterPassword: "Enter password",
      invalidCredentials: "Invalid credentials",
      loginFailed: "Login failed",
      networkError: "Network error",
      
      // Dashboard
      factoryOverview: "Factory Overview",
      viewDetails: "Click to view factory details",
      
      // Analytics
      defectRateAnalytics: "Defect Rate Analytics",
      monthlySummary: "Monthly Summary",
      
      // Factories
      factoryListTitle: "Factory List",
      
      // User Management
      userManagementTitle: "User Management",
      searchUsers: "Search users...",
      createNewUser: "Create New User",
      firstName: "First Name",
      lastName: "Last Name",
      email: "Email",
      selectRole: "Select Role",
      factorySelection: "Factory Selection",
      loadingUsers: "Loading users...",
      accessDenied: "Access Denied",
      
      // Approvals
      approvalsTitle: "Data Approval System",
      kensa: "Inspection (Kensa)",
      press: "Press",
      slit: "Slit",
      pending: "Pending",
      hanchoApproved: "Hancho Approved",
      fullyApproved: "Fully Approved",
      rejected: "Rejected",
      pendingApproval: "Pending Hancho Approval",
      waitingKacho: "Waiting for Kacho Approval",
      correctionNeeded: "Correction Needed",
      kachoRequest: "Kacho Correction Request",
      todayTotal: "Today's Total",
      submittedToday: "Submitted Today",
      needsCorrection: "Needs Correction & Resubmission",
      hanchoAction: "Hancho Action Required",
      kachoApprovalComplete: "Kacho Approval Complete",
      
      // Master DB
      masterProductManagement: "Master Product Management",
      csvFile: "CSV File",
      uploadPreview: "Upload & Preview",
      factory: "Factory",
      rl: "R/L",
      color: "Color",
      processEquipment: "Processing Equipment",
      searchPlaceholderMaster: "Search by part number, model, serial number, product name...",
      totalCount: "Total Count",
      withImages: "With Images",
      noImages: "No Images",
      recentlyAdded: "Recently Added",
      partNumber: "Part Number",
      serialNumber: "Serial Number",
      model: "Model",
      productName: "Product Name",
      defectRate: "Defect Rate",
      exportCSV: "Export CSV",
      exportPDF: "Export PDF",
      
      // Equipment
      equipmentTitle: "Equipment Management",
      
      // Customer Management
      customerManagementTitle: "Customer Management",
      
      // Processes
      processesTitle: "Processes",
      
      // Notifications
      notificationsTitle: "Notifications",
      
      // Master User Admin Panel
      masterUserAdminPanel: "Master User Admin Panel",
      searchByUsernameCompanyEmail: "Search by username, company, or email...",
      createMasterUser: "Create Master User",
      companyName: "Company Name",
      databaseName: "Database Name",
      devicesOptional: "Devices (optional)",
      addDevice: "+ Add Device",
      validUntil: "Valid Until",
      database: "Database",
      devices: "Devices",
      actions: "Actions",
      resetPassword: "Reset Password",
    },
    ja: {
      // Navigation
      dashboard: "ダッシュボード",
      factories: "工場一覧",
      processes: "工程",
      notifications: "通知",
      analytics: "分析",
      userManagement: "ユーザー管理",
      approvals: "承認",
      masterDB: "マスター製品",
      customerManagement: "顧客管理",
      equipment: "設備",
      
      // Common
      searchPlaceholder: "検索...",
      loading: "読み込み中...",
      logout: "ログアウト",
      role: "役職",
      submit: "送信",
      cancel: "キャンセル",
      delete: "削除",
      edit: "編集",
      save: "保存",
      refresh: "更新",
      export: "エクスポート",
      import: "インポート",
      upload: "アップロード",
      download: "ダウンロード",
      view: "表示",
      add: "追加",
      create: "作成",
      update: "更新",
      filter: "フィルター",
      search: "検索",
      all: "すべて",
      total: "合計",
      
      // Login Page
      loginTitle: "ログイン",
      username: "ユーザー名",
      password: "パスワード",
      enterUsername: "ユーザー名を入力",
      enterPassword: "パスワードを入力",
      invalidCredentials: "認証情報が無効です",
      loginFailed: "ログインに失敗しました",
      networkError: "ネットワークエラー",
      
      // Dashboard
      factoryOverview: "工場概要",
      viewDetails: "工場の詳細を表示",
      
      // Analytics
      defectRateAnalytics: "不良率分析",
      monthlySummary: "月次サマリー",
      
      // Factories
      factoryListTitle: "工場リスト",
      
      // User Management
      userManagementTitle: "ユーザー管理",
      searchUsers: "ユーザーを検索...",
      createNewUser: "新しいユーザーを作成",
      firstName: "名",
      lastName: "姓",
      email: "メールアドレス",
      selectRole: "役職を選択",
      factorySelection: "工場選択",
      loadingUsers: "ユーザーを読み込み中...",
      accessDenied: "アクセス拒否",
      
      // Approvals
      approvalsTitle: "データ承認システム",
      kensa: "検査 (Kensa)",
      press: "プレス (Press)",
      slit: "スリット (Slit)",
      pending: "保留中",
      hanchoApproved: "班長承認済み",
      fullyApproved: "完全承認済み",
      rejected: "却下",
      pendingApproval: "班長承認待ち",
      waitingKacho: "課長承認待ち",
      correctionNeeded: "修正要求",
      kachoRequest: "課長修正要求",
      todayTotal: "今日の総数",
      submittedToday: "本日提出分",
      needsCorrection: "要修正・再提出",
      hanchoAction: "班長対応必要",
      kachoApprovalComplete: "課長承認完了",
      
      // Master DB
      masterProductManagement: "Master 製品管理",
      csvFile: "CSVファイル",
      uploadPreview: "アップロード & プレビュー",
      factory: "工場",
      rl: "R/L",
      color: "色",
      processEquipment: "加工設備",
      searchPlaceholderMaster: "品番、モデル、背番号、品名で検索...",
      totalCount: "総件数",
      withImages: "画像あり",
      noImages: "画像なし",
      recentlyAdded: "最近追加",
      partNumber: "品番",
      serialNumber: "背番号",
      model: "モデル",
      productName: "品名",
      defectRate: "不良率",
      exportCSV: "CSVでエクスポート",
      exportPDF: "PDFでエクスポート",
      
      // Equipment
      equipmentTitle: "設備管理",
      
      // Customer Management
      customerManagementTitle: "顧客管理",
      
      // Processes
      processesTitle: "工程",
      
      // Notifications
      notificationsTitle: "通知",
      
      // Master User Admin Panel
      masterUserAdminPanel: "マスターユーザー管理パネル",
      searchByUsernameCompanyEmail: "ユーザー名、会社名、またはメールアドレスで検索...",
      createMasterUser: "マスターユーザーを作成",
      companyName: "会社名",
      databaseName: "データベース名",
      devicesOptional: "デバイス (オプション)",
      addDevice: "+ デバイスを追加",
      validUntil: "有効期限",
      database: "データベース",
      devices: "デバイス",
      actions: "アクション",
      resetPassword: "パスワードリセット",
    }
  };

  let currentLang = localStorage.getItem("lang") || "en";
  
  function t(key) {
    return translations[currentLang][key] || key;
  }
  
  function applyLanguage() {
    // Apply translations to elements with data-i18n attributes
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      if (translations[currentLang][key]) {
        el.textContent = translations[currentLang][key];
      }
    });
  
    // Apply translations to placeholders
    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
      const key = el.getAttribute("data-i18n-placeholder");
      if (translations[currentLang][key]) {
        el.placeholder = translations[currentLang][key];
      }
    });
    
    // Apply translations to titles
    document.querySelectorAll("[data-i18n-title]").forEach(el => {
      const key = el.getAttribute("data-i18n-title");
      if (translations[currentLang][key]) {
        el.title = translations[currentLang][key];
      }
    });
  
    // Update search input placeholder
    const search = document.getElementById("searchInput");
    if (search) {
      search.placeholder = translations[currentLang].searchPlaceholder;
    }
    
    // Update page title based on current page
    const currentPage = getCurrentPage();
    if (currentPage && translations[currentLang][currentPage + "Title"]) {
      document.title = translations[currentLang][currentPage + "Title"] + " - Freya Admin";
    }
  }
  
  function getCurrentPage() {
    // Try to determine current page from various indicators
    const activeNav = document.querySelector(".nav-btn.bg-gray-100");
    if (activeNav) {
      return activeNav.getAttribute("data-page");
    }
    return "dashboard"; // default
  }
  
  // Make translation function globally available
  window.t = t;
  window.applyLanguage = applyLanguage;

const languageSelector = document.getElementById("languageSelector");
if (languageSelector) {
  languageSelector.value = currentLang;
  languageSelector.addEventListener("change", (e) => {
    currentLang = e.target.value;
    localStorage.setItem("lang", currentLang);
    applyLanguageEnhanced();
    
    // Trigger a custom event to notify other parts of the app
    window.dispatchEvent(new CustomEvent('languageChanged', { 
      detail: { language: currentLang } 
    }));
    
    // If there's a current page loaded, refresh its content
    const currentPage = getCurrentPage();
    if (currentPage && typeof loadPage === 'function') {
      loadPage(currentPage);
    }
  });
}

// Apply language on initial load
applyLanguageEnhanced();

// Listen for page changes to reapply translations
window.addEventListener('pageLoaded', () => {
  applyLanguageEnhanced();
});

// Enhanced function to handle dynamic content translation
function translateDynamicContent(container) {
  if (!container) container = document;
  
  // Apply translations to new elements with data-i18n attributes
  container.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (translations[currentLang][key]) {
      el.textContent = translations[currentLang][key];
    }
  });

  // Apply translations to new placeholders
  container.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (translations[currentLang][key]) {
      el.placeholder = translations[currentLang][key];
    }
  });
  
  // Apply translations to new titles
  container.querySelectorAll("[data-i18n-title]").forEach(el => {
    const key = el.getAttribute("data-i18n-title");
    if (translations[currentLang][key]) {
      el.title = translations[currentLang][key];
    }
  });
}

// Enhanced apply language function
function applyLanguageEnhanced() {
  applyLanguage();
  translateDynamicContent();
  
  // Also handle common button texts that might not have data-i18n
  const buttons = document.querySelectorAll('button');
  buttons.forEach(button => {
    const text = button.textContent.trim();
    if (text === 'Edit' || text === '編集') {
      if (!button.hasAttribute('data-i18n')) {
        button.textContent = t('edit');
      }
    }
    if (text === 'Delete' || text === '削除') {
      if (!button.hasAttribute('data-i18n')) {
        button.textContent = t('delete');
      }
    }
    if (text === 'Reset Password' || text === 'パスワードリセット') {
      if (!button.hasAttribute('data-i18n')) {
        button.textContent = t('resetPassword');
      }
    }
  });
}

// Make the enhanced function globally available
window.translateDynamicContent = translateDynamicContent;
window.applyLanguageEnhanced = applyLanguageEnhanced;
