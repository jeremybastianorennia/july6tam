let zoomInfoData = [];
let filteredData = [];
let currentSortColumn = null;
let currentSortDirection = 'asc';

let revenueFilter, minEmployeesInput, maxEmployeesInput, segmentationFilter, assignedToFilter,
    searchInput, resultsBody, resultsCount, clearFiltersBtn, exportDataBtn, loadingIndicator,
    companyDropdown, accountDetailsContent;

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
    // Dashboard elements
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

    // Account details elements
    companyDropdown = document.getElementById('companyDropdown');
    accountDetailsContent = document.getElementById('accountDetailsContent');

    populateSegmentationFilter();
    populateAssignedToFilter();
    populateCompanyDropdown();
    attachEventListeners();

    filteredData = [...zoomInfoData];
    renderTable();
}

// Dashboard functionality
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
    // Tab event listeners
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            
            // Hide all tab contents
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });

            // Remove active class from all tab buttons
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.remove('active');
            });

            // Show selected tab content
            document.getElementById(tabName + '-tab').classList.add('active');

            // Add active class to clicked tab button
            this.classList.add('active');
        });
    });

    // Dashboard event listeners
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

    // Account details event listeners
    companyDropdown.addEventListener('change', handleCompanySelection);
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

function populateCompanyDropdown() {
    const uniqueCompanies = [
        ...new Set(
            zoomInfoData
                .map(item => item['Company Name'] || '')
                .filter(name => name)
        )
    ].sort();
    
    companyDropdown.innerHTML = '<option value="">-- Select a company --</option>';
    uniqueCompanies.forEach(company => {
        const option = document.createElement('option');
        option.value = company;
        option.textContent = company;
        companyDropdown.appendChild(option);
    });
}

function handleCompanySelection() {
    const selectedCompany = companyDropdown.value;
    if (!selectedCompany) {
        accountDetailsContent.innerHTML = `
            <div class="no-company-selected">
                <h3>No Company Selected</h3>
                <p>Please select a company from the dropdown above to view detailed account information.</p>
            </div>
        `;
        return;
    }

    const companyData = zoomInfoData.find(item => item['Company Name'] === selectedCompany);
    if (!companyData) {
        accountDetailsContent.innerHTML = `
            <div class="no-company-selected">
                <h3>Company Not Found</h3>
                <p>The selected company could not be found in the database.</p>
            </div>
        `;
        return;
    }

    renderAccountDetails(companyData);
}

function renderAccountDetails(data) {
    const activityScore = parseInt(data['Activity']) || 0;
    const generationScore = parseInt(data['Generation']) || 0;
    
    accountDetailsContent.innerHTML = `
        <div class="account-info-grid">
            <div class="info-card">
                <h4>Company Information</h4>
                <div class="info-item">
                    <span class="info-label">Company Name:</span>
                    <span class="info-value"><strong>${escapeHtml(data['Company Name'])}</strong></span>
                </div>
                <div class="info-item">
                    <span class="info-label">Salesforce ID:</span>
                    <span class="info-value">${escapeHtml(data['SalesforceID'] || 'N/A')}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Location:</span>
                    <span class="info-value">${escapeHtml(data['Location'] || 'N/A')}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Head Office:</span>
                    <span class="info-value">${escapeHtml(data['Head Office'] || 'N/A')}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Country:</span>
                    <span class="info-value">${escapeHtml(data['Country'] || 'N/A')}</span>
                </div>
            </div>

            <div class="info-card">
                <h4>Performance Scores</h4>
                <div class="info-item">
                    <span class="info-label">Activity Score:</span>
                    <span class="info-value">
                        <span class="score-badge ${getScoreClass(activityScore)}">${activityScore}/10</span>
                    </span>
                </div>
                <div class="info-item">
                    <span class="info-label">Generation Score:</span>
                    <span class="info-value">
                        <span class="score-badge ${getScoreClass(generationScore)}">${generationScore}/10</span>
                    </span>
                </div>
                <div class="info-item">
                    <span class="info-label">Prospect Score:</span>
                    <span class="info-value">
                        <span style="${getScoreStyle(data['Prospect Score'])}">${data['Prospect Score'] || 'N/A'}</span>
                    </span>
                </div>
                <div class="info-item">
                    <span class="info-label">Account Type:</span>
                    <span class="info-value">
                        <span class="status status--info">${escapeHtml(data['Account Type'] || 'N/A')}</span>
                    </span>
                </div>
                <div class="info-item">
                    <span class="info-label">Segmentation:</span>
                    <span class="info-value">
                        <span class="status status--success">${escapeHtml(data['Segmentation'] || 'N/A')}</span>
                    </span>
                </div>
            </div>

            <div class="info-card notes-section">
                <h4>Account Notes</h4>
                <div class="notes-content">
                    ${escapeHtml(data['Account Notes'] || 'No account notes available.')}
                </div>
            </div>

            <div class="info-card notes-section">
                <h4>Drop Notes</h4>
                <div class="notes-content">
                    ${escapeHtml(data['Drop Notes'] || 'No drop notes available.')}
                </div>
            </div>
        </div>
    `;
}

function getScoreClass(score) {
    if (score >= 8) return 'score-high';
    if (score >= 5) return 'score-medium';
    return 'score-low';
}
