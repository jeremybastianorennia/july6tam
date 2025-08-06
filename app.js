let zoomInfoData = [];
let filteredData = [];
let currentSortColumn = null;
let currentSortDirection = 'asc';

let revenueFilter, minEmployeesInput, maxEmployeesInput, segmentationFilter, assignedToFilter,
    searchInput, resultsBody, resultsCount, clearFiltersBtn, exportDataBtn, loadingIndicator;

document.addEventListener('DOMContentLoaded', function () {
    Papa.parse('data.csv', {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            zoomInfoData = results.data;
            initializeDashboard();
        },
        error: function(err) {
            alert('Failed to load data: ' + err);
        }
    });
});

function initializeDashboard() {
    revenueFilter = document.getElementById('revenueFilter');
    minEmployeesInput = document.getElementById('minEmployees');
    maxEmployeesInput = document.getElementById('maxEmployees');
    segmentationFilter = document.getElementById('segmentationFilter');
    assignedToFilter = document.getElementById('assignedToFilter');
    searchInput = document.getElementById('searchInput');
    resultsBody = document.getElementById('resultsBody');
    resultsCount = document.getElementById('resultsCount');
    clearFiltersBtn = document.getElementById('clearFilters');
    exportDataBtn = document.getElementById('exportData');
    loadingIndicator = document.getElementById('loadingIndicator');

    populateSegmentationFilter();
    populateAssignedToFilter();
    attachEventListeners();

    filteredData = [...zoomInfoData];
    renderTable();
}

function handleFilterChange() {
    showLoading();
    setTimeout(() => {
        applyAllFilters();
        hideLoading();
    }, 50);
}

function applyAllFilters() {
    let data = [...zoomInfoData];
    const selectedRevenues = getSelectedOptions(revenueFilter);
    if (selectedRevenues.length > 0) {
        data = data.filter(item => selectedRevenues.includes(item['Revenue Estimate']));
    }

    const minEmployees = parseInt(minEmployeesInput.value) || 0;
    const maxEmployees = parseInt(maxEmployeesInput.value) || Number.MAX_SAFE_INTEGER;
    data = data.filter(item => {
        const empCount = parseInt(item['Employees']) || 0;
        return empCount >= minEmployees && empCount <= maxEmployees;
    });

    const selectedSegments = getSelectedOptions(segmentationFilter);
    if (selectedSegments.length > 0) {
        data = data.filter(item => selectedSegments.includes(item['Segmentation']));
    }

    const selectedAssignedTos = getSelectedOptions(assignedToFilter);
    if (selectedAssignedTos.length > 0) {
        data = data.filter(item => selectedAssignedTos.includes(item['Assigned To']));
    }

    const searchTerm = searchInput.value.trim().toLowerCase();
    if (searchTerm) {
        data = data.filter(item => {
            return Object.values(item).some(value =>
                String(value).toLowerCase().includes(searchTerm)
            );
        });
    }

    filteredData = data;

    if (currentSortColumn) applySorting();

    renderTable();
}
function getSelectedOptions(selectElement) {
    return Array.from(selectElement.selectedOptions).map(option => option.value);
}

function clearAllFilters() {
    revenueFilter.selectedIndex = -1;
    segmentationFilter.selectedIndex = -1;
    assignedToFilter.selectedIndex = -1;
    minEmployeesInput.value = '';
    maxEmployeesInput.value = '';
    searchInput.value = '';
    currentSortColumn = null;
    currentSortDirection = 'asc';
    updateSortIndicators();
    filteredData = [...zoomInfoData];
    renderTable();
}
function sortTable(column) {
    if (currentSortColumn === column) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumn = column;
        currentSortDirection = 'asc';
    }
    applySorting();
    renderTable();
    updateSortIndicators();
}
function applySorting() {
    filteredData.sort((a, b) => {
        let aVal, bVal;
        if (currentSortColumn === 'Employees') {
            aVal = parseInt(a['Employees']);
            bVal = parseInt(b['Employees']);
        } else if (currentSortColumn === 'Prospect Score') {
            aVal = parseFloat(a['Prospect Score']);
            bVal = parseFloat(b['Prospect Score']);
        } else {
            aVal = (a[currentSortColumn] || '').toLowerCase();
            bVal = (b[currentSortColumn] || '').toLowerCase();
        }
        if (aVal < bVal) return currentSortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return currentSortDirection === 'asc' ? 1 : -1;
        return 0;
    });
}
function updateSortIndicators() {
    document.querySelectorAll('.sort-indicator').forEach(indicator => {
        indicator.className = 'sort-indicator';
    });
    if (currentSortColumn) {
        const indicator = document.querySelector(`[data-sort="${currentSortColumn}"] .sort-indicator`);
        if (indicator) indicator.classList.add(currentSortDirection);
    }
}

function renderTable() {
    if (!resultsBody) return;
    resultsBody.innerHTML = '';
    if (filteredData.length === 0) {
        resultsBody.innerHTML = `<tr>
            <td colspan="13" class="no-results">
                <h3>No accounts found</h3>
                <p>Try adjusting your filters to see more results.</p>
            </td>
        </tr>`;
        updateResultsCount(0);
        return;
    }
    filteredData.forEach(item => {
        const row = document.createElement('tr');
        const website = (item['Website'] || '').startsWith('http') ? item['Website'] : `https://${item['Website']}`;
        const linkedinURL = item['LinkedIn URL'] || '#';
        row.innerHTML = `
            <td><strong>${escapeHtml(item['Company Name'])}</strong></td>
            <td>${escapeHtml(item['Assigned To'] || 'Unassigned')}</td>
            <td><span class="status status--info">${escapeHtml(item['Account Type'] || 'N/A')}</span></td>
            <td><span style="${getScoreStyle(item['Prospect Score'])}">${item['Prospect Score'] || 'N/A'}</span></td>
            <td>${escapeHtml(item['Account Notes'] || '')}</td>
            <td>${escapeHtml(item['Drop Notes'] || '')}</td>
            <td><a href="${website}" target="_blank">${escapeHtml(item['Website'])}</a></td>
            <td>${linkedinURL !== '#' ? `<a href="${linkedinURL}" target="_blank">LinkedIn</a>` : 'N/A'}</td>
            <td><span class="${getRevenueClass(item['Revenue Estimate'])}">${escapeHtml(item['Revenue Estimate'])}</span></td>
            <td>${parseInt(item['Employees']).toLocaleString()}</td>
            <td>${escapeHtml(item['Head Office'])}</td>
            <td>${escapeHtml(item['Country'])}</td>
            <td><span class="status status--success">${escapeHtml(item['Segmentation'] || 'N/A')}</span></td>
        `;
        resultsBody.appendChild(row);
    });
    updateResultsCount(filteredData.length);
    highlightSearchTerms();
}

function getScoreStyle(score) {
    let num = parseFloat(score);
    if (isNaN(num)) num = 0;
    let normalized = Math.max(0, Math.min(100, num)) / 100;
    let hue = 0 + 120 * normalized;
    let saturation = 38;
    let lightness = 91;
    let textColor = '#1a1a1a';
    return `background-color: hsl(${hue},${saturation}%,${lightness}%); color: ${textColor}; font-weight: bold; font-size: 1.05em; padding:6px 10px; border-radius: 6px; min-width: 38px; display: inline-block; text-align: center; letter-spacing: 0.5px;`;
}

function getRevenueClass(revenue) {
    if (!revenue) return '';
    if (revenue.includes('bil.') || revenue.includes('$500 mil. - $1 bil.') || revenue.includes('$250 mil. - $500 mil.') || revenue.includes('$100 mil. - $250 mil.')) {
        return 'revenue-high';
    } else if (revenue.includes('$50 mil.') || revenue.includes('$25 mil.')) {
        return 'revenue-medium';
    }
    return 'revenue-low';
}

function exportToCSV() {
    if (filteredData.length === 0) {
        alert('No data to export. Please adjust your filters.');
        return;
    }
    const headers = [
        'Company Name', 'Assigned To', 'Account Type', 'Prospect Score', 'Account Notes',
        'Drop Notes', 'Website', 'LinkedIn URL', 'Revenue Estimate', 'Employees',
        'Head Office', 'Country', 'Segmentation'
    ];
    const csvRows = [
        headers.join(','),
        ...filteredData.map(item => headers.map(header => {
            const field = getCSVValue(item, header);
            return `"${String(field || '').replace(/"/g, '""')}"`;
        }).join(','))
    ];
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `zoominfo_accounts_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function getCSVValue(item, key) {
    return item[key] || '';
}
function updateResultsCount(count) {
    if (resultsCount) {
        const total = zoomInfoData.length;
        resultsCount.textContent = `${count.toLocaleString()} of ${total.toLocaleString()} accounts found`;
    }
}
function highlightSearchTerms() {
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
    if (!searchTerm) return;
    const regex = new RegExp(escapeRegex(searchTerm), 'gi');
    resultsBody.querySelectorAll('td').forEach(cell => {
        if (cell.querySelector('a')) return;
        const text = cell.textContent;
        if (regex.test(text)) {
            cell.innerHTML = text.replace(regex, match =>
                `<span class="search-highlight">${match}</span>`
            );
        }
    });
}
function escapeHtml(text) {
    const map = {
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}
function escapeRegex(string) {
    return String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function showLoading() {
    if (loadingIndicator) loadingIndicator.classList.remove('hidden');
}
function hideLoading() {
    if (loadingIndicator) loadingIndicator.classList.add('hidden');
}
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => { clearTimeout(timeout); func(...args); };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
function attachEventListeners() {
    revenueFilter.addEventListener('change', handleFilterChange);
    segmentationFilter.addEventListener('change', handleFilterChange);
    assignedToFilter.addEventListener('change', handleFilterChange);
    minEmployeesInput.addEventListener('input', debounce(handleFilterChange, 300));
    maxEmployeesInput.addEventListener('input', debounce(handleFilterChange, 300));
    searchInput.addEventListener('input', debounce(handleFilterChange, 300));
    clearFiltersBtn.addEventListener('click', clearAllFilters);
    exportDataBtn.addEventListener('click', exportToCSV);
    document.querySelectorAll('[data-sort]').forEach(header => {
        header.addEventListener('click', () => sortTable(header.dataset.sort));
    });
}

function populateSegmentationFilter() {
    const uniqueSegments = [
        ...new Set(
            zoomInfoData
                .map(item => item['Segmentation'] || '')
                .filter(seg => seg)
        )
    ].sort();
    segmentationFilter.innerHTML = '';
    uniqueSegments.forEach(seg => {
        const option = document.createElement('option');
        option.value = seg;
        option.textContent = seg;
        segmentationFilter.appendChild(option);
    });
}
function populateAssignedToFilter() {
    const uniqueAssigned = [
        ...new Set(
            zoomInfoData
                .map(item => item['Assigned To'] || '')
                .filter(name => name)
        )
    ].sort();
    assignedToFilter.innerHTML = '';
    uniqueAssigned.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        assignedToFilter.appendChild(option);
    });
}
