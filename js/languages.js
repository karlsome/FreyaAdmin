


// js/languages.js
const translations = {
    en: {
      dashboard: "Dashboard",
      factories: "Factories",
      processes: "Processes",
      notifications: "Notifications",
      analytics: "Analytics",
      userManagement: "User Management",
      approvals: "Approvals",
      searchPlaceholder: "Search...",
      loading: "Loading...",
      factoryOverview: "Factory Overview",
      defectRateAnalytics: "Defect Rate Analytics",
      approvalsTitle: "Approvals",
      userManagementTitle: "User Management",
      factoryListTitle: "Factory List",
      viewDetails: "Click to view factory details",
      total: "Total",
      totalNG: "Total NG",
      partNumber: "Part Number",
      serialNumber: "Serial Number",
      defectRate: "Defect Rate",
      exportCSV: "Export CSV",
      exportPDF: "Export PDF",
      monthlySummary: "Monthly Summary",
      masterDB: "Master DB"
    },
    ja: {
      dashboard: "ダッシュボード",
      factories: "工場一覧",
      processes: "工程",
      notifications: "通知",
      analytics: "分析",
      userManagement: "ユーザー管理",
      approvals: "承認",
      searchPlaceholder: "検索...",
      loading: "読み込み中...",
      factoryOverview: "工場概要",
      defectRateAnalytics: "不良率分析",
      approvalsTitle: "承認一覧",
      userManagementTitle: "ユーザー管理",
      factoryListTitle: "工場リスト",
      viewDetails: "工場の詳細を表示",
      total: "合計",
      totalNG: "不良数",
      partNumber: "品番",
      serialNumber: "背番号",
      defectRate: "不良率",
      exportCSV: "CSVでエクスポート",
      exportPDF: "PDFでエクスポート",
      monthlySummary: "月次サマリー",
      masterDB: "マスターデータベース"
    }
  };



  let currentLang = localStorage.getItem("lang") || "en";
  
  function applyLanguage() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      el.textContent = translations[currentLang][key] || key;
    });
  
    const search = document.getElementById("searchInput");
    if (search) {
      search.placeholder = translations[currentLang].searchPlaceholder;
    }
  }


document.getElementById("languageSelector").value = currentLang;
document.getElementById("languageSelector").addEventListener("change", (e) => {
  currentLang = e.target.value;
  localStorage.setItem("lang", currentLang);
  applyLanguage();
});
applyLanguage();
