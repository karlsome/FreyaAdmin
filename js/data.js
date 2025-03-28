const mockData = {
    factories: [
        { id: 1, name: "SCNA", location: "Indianapolis, USA", status: "normal", performance: 95 },
        { id: 2, name: "第一工場", location: "関市", status: "warning", performance: 82 },
        { id: 3, name: "第二工場", location: "Shanghai, China", status: "normal", performance: 91 },
        { id: 4, name: "肥田瀬", location: "Indianapolis, USA", status: "normal", performance: 95 },
        { id: 5, name: "天徳", location: "関市", status: "warning", performance: 82 },
        { id: 6, name: "倉知", location: "Shanghai, China", status: "normal", performance: 91 },
        { id: 7, name: "小瀬", location: "Shanghai, China", status: "normal", performance: 91 },
    ],
    approvals: [
        { id: 1, type: "Daily Inspection", factory: "North America Factory", date: "2025-03-07", inspector: "Michael Chen", status: "pending" },
        { id: 2, type: "Weekly Summary", factory: "Asia Factory", date: "2025-03-01", inspector: "David Zhang", status: "completed" }
    ],
    notifications: [
        { id: 1, type: "critical", message: "Press machine failure at Europe Factory", time: "10 minutes ago" },
        { id: 2, type: "warning", message: "SRS process efficiency below threshold", time: "25 minutes ago" }
    ]
};