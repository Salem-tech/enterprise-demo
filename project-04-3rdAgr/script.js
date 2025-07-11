// UI Functionality
const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Offline Mode - Example Data
const exampleData = [
    { id: 1, type: "Add Permission", userType: "Internal", status: "Approved", date: "2024-11-20" },
    { id: 2, type: "Add Permission", userType: "External", status: "Rejected", date: "2024-11-19" },
    { id: 3, type: "Add Permission", userType: "Internal", status: "Pending", date: "2024-11-21" },
    { id: 4, type: "Add Permission", userType: "External", status: "Approved", date: "2024-11-20" },
];

function updateTableOffline(data) {
    const counts = {
        Internal: { Pending: 0, Approved: 0, Rejected: 0 },
        External: { Pending: 0, Approved: 0, Rejected: 0 },
    };

    data.forEach(item => {
        if (counts[item.userType]) {
            counts[item.userType][item.status]++;
        }
    });

    document.getElementById("internal-pending").innerText = counts.Internal.Pending;
    document.getElementById("internal-approved").innerText = counts.Internal.Approved;
    document.getElementById("internal-rejected").innerText = counts.Internal.Rejected;
    document.getElementById("external-pending").innerText = counts.External.Pending;
    document.getElementById("external-approved").innerText = counts.External.Approved;
    document.getElementById("external-rejected").innerText = counts.External.Rejected;
}

// Online Mode - SharePoint Integration
async function fetchDataFromSharePoint(listName) {
    const siteUrl = "https://<YOUR-SHAREPOINT-SITE-URL>";
    const endpoint = `${siteUrl}/_api/web/lists/getbytitle('${listName}')/items`;

    try {
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                Accept: 'application/json;odata=verbose',
                'Content-Type': 'application/json;odata=verbose',
            },
        });
        const data = await response.json();
        return data.d.results;
    } catch (error) {
        console.error(`Error fetching data from ${listName}:`, error);
        return [];
    }
}

async function populateAgreements() {
    try {
        const agreements = await fetchDataFromSharePoint("Agreements");
        const activeCount = agreements.filter(item => item.Status === "Active").length;
        const expiredCount = agreements.filter(item => item.Status === "Expired").length;
        document.getElementById("active-agreements").innerText = activeCount;
        document.getElementById("expired-agreements").innerText = expiredCount;
    } catch (error) {
        console.error('Error populating agreements:', error);
        document.getElementById("active-agreements").innerText = "12";
        document.getElementById("expired-agreements").innerText = "3";
    }
}

async function populateMetrics() {
    try {
        const [internalRequests, externalRequests] = await Promise.all([
            fetchDataFromSharePoint("Internal Requests"),
            fetchDataFromSharePoint("External Requests"),
        ]);

        const allRequests = [...internalRequests, ...externalRequests];
        const currentYear = new Date().getFullYear();
        const currentWeek = getWeekNumber(new Date());

        const yearlyRequests = allRequests.filter(item => new Date(item.Date).getFullYear() === currentYear);
        document.getElementById("yearly-total").innerText = yearlyRequests.length;
        document.getElementById("yearly-approved").innerText = yearlyRequests.filter(item => item.Status === "Approved").length;
        document.getElementById("yearly-rejected").innerText = yearlyRequests.filter(item => item.Status === "Rejected").length;

        const weeklyRequests = allRequests.filter(item => getWeekNumber(new Date(item.Date)) === currentWeek);
        document.getElementById("weekly-total").innerText = weeklyRequests.length;
        document.getElementById("weekly-approved").innerText = weeklyRequests.filter(item => item.Status === "Approved").length;
        document.getElementById("weekly-rejected").innerText = weeklyRequests.filter(item => item.Status === "Rejected").length;
    } catch (error) {
        console.error('Error populating metrics:', error);
        document.getElementById("yearly-total").innerText = "156";
        document.getElementById("yearly-approved").innerText = "142";
        document.getElementById("yearly-rejected").innerText = "14";
        document.getElementById("weekly-total").innerText = "8";
        document.getElementById("weekly-approved").innerText = "6";
        document.getElementById("weekly-rejected").innerText = "2";
    }
}

async function populateTableOnline() {
    try {
        const [internalRequests, externalRequests] = await Promise.all([
            fetchDataFromSharePoint("Internal Requests"),
            fetchDataFromSharePoint("External Requests"),
        ]);

        const fieldMappings = {
            internal: "RequestStatus",
            external: "StatusField",
        };

        const counts = {
            Internal: { Pending: 0, Approved: 0, Rejected: 0 },
            External: { Pending: 0, Approved: 0, Rejected: 0 },
        };

        internalRequests.forEach(item => {
            const status = item[fieldMappings.internal];
            if (counts.Internal[status] !== undefined) {
                counts.Internal[status]++;
            }
        });

        externalRequests.forEach(item => {
            const status = item[fieldMappings.external];
            if (counts.External[status] !== undefined) {
                counts.External[status]++;
            }
        });

        document.getElementById("internal-pending").innerText = counts.Internal.Pending;
        document.getElementById("internal-approved").innerText = counts.Internal.Approved;
        document.getElementById("internal-rejected").innerText = counts.Internal.Rejected;
        document.getElementById("external-pending").innerText = counts.External.Pending;
        document.getElementById("external-approved").innerText = counts.External.Approved;
        document.getElementById("external-rejected").innerText = counts.External.Rejected;
    } catch (error) {
        console.error('Error populating table online:', error);
        updateTableOffline(exampleData);
    }
}

// Utility Functions
function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

async function checkSharePointAvailability() {
    try {
        const testEndpoint = "https://<YOUR-SHAREPOINT-SITE-URL>/_api/web";
        const response = await fetch(testEndpoint, {
            method: 'GET',
            headers: { 'Accept': 'application/json;odata=verbose' }
        });
        return response.ok;
    } catch (error) {
        console.log('SharePoint not available, using offline mode');
        return false;
    }
}

// Initialize System
(async function initializeSystem() {
    const isOnline = await checkSharePointAvailability();
    
    if (isOnline) {
        console.log('Online mode: Loading data from SharePoint');
        await populateAgreements();
        await populateMetrics();
        await populateTableOnline();
    } else {
        console.log('Offline mode: Using example data');
        updateTableOffline(exampleData);
        document.getElementById("active-agreements").innerText = "12";
        document.getElementById("expired-agreements").innerText = "3";
        document.getElementById("yearly-total").innerText = "156";
        document.getElementById("yearly-approved").innerText = "142";
        document.getElementById("yearly-rejected").innerText = "14";
        document.getElementById("weekly-total").innerText = "8";
        document.getElementById("weekly-approved").innerText = "6";
        document.getElementById("weekly-rejected").innerText = "2";
    }
})();