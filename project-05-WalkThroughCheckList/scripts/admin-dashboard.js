// Admin Dashboard - Create questionnaires and view response data

let checklistArray = []; // Stores checklist data
let logsArray = [];     // Stores logs data

$(document).ready(function () {
    // Try SharePoint first, fallback to Excel if offline
    trySharePointOrExcel();
    generateQuestions();

    $('#year').on('change', function () {
        populateQuarters($(this).val(), '#quarter');
    });

    $('#logYear').on('change', function () {
        populateQuarters($(this).val(), '#logQuarter');
    });

    $('#defineChecklistForm').on('submit', saveChecklist);
    $('#viewLogsForm').on('submit', fetchLogs);
});

// Check SharePoint connection, fallback to Excel
function trySharePointOrExcel() {
    // Try SharePoint first
    $.ajax({
        url: "/_api/web",
        type: "GET",
        headers: { "Accept": "application/json;odata=verbose" },
        timeout: 3000,
        success: function() {
            console.log('SharePoint available - using online mode');
            initializeDropdowns();
        },
        error: function() {
            console.log('SharePoint unavailable - using offline Excel mode');
            loadExcelData();
        }
    });
}

// Load data from Excel when offline
function loadExcelData() {
    console.log('loadExcelData() called - attempting to load Excel file');
    loadExcelFile('DATA.xlsx', 
        function(sheet_data) {
            // Success callback - process the Excel data
            console.log('Excel success callback called with data:', sheet_data);
            const result = processChecklistData(sheet_data);
            logsArray = result.logsArray;
            console.log('Excel data loaded successfully:', logsArray.length, 'records');
            console.log('Questions from Excel:', result.questions);
            
            // Create checklist data with questions from Excel
            createSampleChecklists(result.questions);
            populateOfflineDropdowns();
        },
        function(error) {
            // Error callback
            console.error('Excel error callback called:', error);
            console.log('Falling back to sample data due to Excel loading failure');
            
            // Fallback to sample data when Excel file can't be loaded
            createSampleChecklists(null);
            populateOfflineDropdowns();
            
            alert('Unable to load DATA.xlsx file. Using sample data instead.\n\nTo use Excel data, please serve this page from a web server (e.g., python -m http.server 8000)');
        }
    );
}

// Create questionnaire data from Excel or fallback samples  
function createSampleChecklists(questionsFromExcel = null) {
    console.log('createSampleChecklists called with questions:', questionsFromExcel);
    
    const questions = questionsFromExcel && Object.keys(questionsFromExcel).length > 0 ? questionsFromExcel : {
        Question1: "Have you completed all required security training modules?",
        Question2: "Are all system access controls properly configured?",
        Question3: "Have you reviewed and updated data backup procedures?",
        Question4: "Are vulnerability assessments up to date?",
        Question5: "Have you implemented required access controls?",
        Question6: "Is the incident response plan current?",
        Question7: "Have compliance audits been completed?",
        Question8: "Are security protocols documented and updated?",
        Question9: "Have emergency procedures been reviewed?",
        Question10: "Are all security measures properly documented?"
    };
    
    console.log('Using questions:', questions);

    // Get unique years and quarters from logs
    const periods = [...new Set(logsArray.map(log => `${log.year}-${log.quarter}`))];
    
    periods.forEach(period => {
        const [year, quarter] = period.split('-');
        let yearObj = checklistArray.find(obj => obj.year === parseInt(year));
        if (!yearObj) {
            yearObj = { year: parseInt(year), quarters: [] };
            checklistArray.push(yearObj);
        }
        
        if (!yearObj.quarters.find(q => q.quarter === quarter)) {
            yearObj.quarters.push({
                quarter: quarter,
                questions: questions
            });
        }
    });
}

// Populate dropdowns for offline mode
function populateOfflineDropdowns() {
    checklistArray.forEach(yearObj => {
        if (!$('#logYear option[value="' + yearObj.year + '"]').length) {
            $('#logYear, #year').append(`<option value="${yearObj.year}">${yearObj.year}</option>`);
        }
    });
}

function initializeDropdowns() {
    $.ajax({
        url: "/_api/web/lists/getbytitle('Checklists')/items?$select=Year,Quarter,Question1,Question2,Question3,Question4,Question5,Question6,Question7,Question8,Question9,Question10",
        type: "GET",
        headers: { "Accept": "application/json;odata=verbose" },
        success: function (response) {
            response.d.results.forEach(item => {
                const year = item.Year;
                const quarter = item.Quarter;

                let yearObj = checklistArray.find(obj => obj.year === year);
                if (!yearObj) {
                    yearObj = { year, quarters: [] };
                    checklistArray.push(yearObj);
                }
                yearObj.quarters.push({
                    quarter,
                    questions: {
                        Question1: item.Question1,
                        Question2: item.Question2,
                        Question3: item.Question3,
                        Question4: item.Question4,
                        Question5: item.Question5,
                        Question6: item.Question6,
                        Question7: item.Question7,
                        Question8: item.Question8,
                        Question9: item.Question9,
                        Question10: item.Question10,
                    }
                });

                if (!$('#logYear option[value="' + year + '"]').length) {
                    $('#logYear, #year').append(`<option value="${year}">${year}</option>`);
                }
            });
        },
        error: function () {
            alert('Error retrieving checklist data.');
        }
    });

    $.ajax({
        url: "/_api/web/lists/getbytitle('Logs')/items?$select=Year,Quarter,NetworkID,EmployeeName,DivisionUnit,Answer1,Answer2,Answer3,Answer4,Answer5,Answer6,Answer7,Answer8,Answer9,Answer10",
        type: "GET",
        headers: { "Accept": "application/json;odata=verbose" },
        success: function (response) {
            logsArray = response.d.results.map(log => ({
                year: log.Year,
                quarter: log.Quarter,
                employeeName: log.EmployeeName,
                networkID: log.NetworkID,
                divisionUnit: log.DivisionUnit,
                answers: {
                    Answer1: log.Answer1,
                    Answer2: log.Answer2,
                    Answer3: log.Answer3,
                    Answer4: log.Answer4,
                    Answer5: log.Answer5,
                    Answer6: log.Answer6,
                    Answer7: log.Answer7,
                    Answer8: log.Answer8,
                    Answer9: log.Answer9,
                    Answer10: log.Answer10,
                }
            }));
        },
        error: function () {
            alert('Error retrieving logs data.');
        }
    });
}

function populateQuarters(year, quarterSelector) {
    const yearObj = checklistArray.find(obj => obj.year == year);
    if (yearObj) {
        $(quarterSelector).empty().append('<option value="">Select Quarter</option>');
        yearObj.quarters.forEach(q => {
            $(quarterSelector).append(`<option value="${q.quarter}">${q.quarter}</option>`);
        });
    } else {
        $(quarterSelector).empty().append('<option value="">No Quarters Available</option>');
    }
}

function generateQuestions() {
    const questionsList = $('#questionsList');
    questionsList.empty();
    for (let i = 1; i <= 10; i++) {
        questionsList.append(`
            <div class="form-group">
                <label for="question${i}">Question ${i}</label>
                <input type="text" id="question${i}" class="form-control" required>
            </div>
        `);
    }
}

function saveChecklist(e) {
    e.preventDefault();
    const year = $('#year').val();
    const quarter = $('#quarter').val();
    const data = {
        Year: year,
        Quarter: quarter
    };

    $('#questionsList input').each(function (index) {
        const question = $(this).val().trim();
        if (!question) {
            alert('All questions must be filled.');
            return false;
        }
        data[`Question${index + 1}`] = question;
    });

    $.ajax({
        url: "/_api/web/lists/getbytitle('Checklists')/items",
        type: "POST",
        headers: {
            "Accept": "application/json;odata=verbose",
            "X-RequestDigest": $("#__REQUESTDIGEST").val()
        },
        contentType: "application/json;odata=verbose",
        data: JSON.stringify(data),
        success: function () {
            alert('Checklist saved successfully.');
            $('#defineChecklistForm')[0].reset();
            generateQuestions();
        },
        error: function () {
            alert('Error saving checklist.');
        }
    });
}

function fetchLogs(e) {
    e.preventDefault();
    const year = $('#logYear').val();
    const quarter = $('#logQuarter').val();

    if (!year || !quarter) {
        alert('Please select both year and quarter.');
        return;
    }

    const logsForPeriod = logsArray.filter(log => log.year == year && log.quarter == quarter);
    const yearObj = checklistArray.find(obj => obj.year == year);
    const quarterObj = yearObj?.quarters.find(q => q.quarter == quarter);

    if (!logsForPeriod.length || !quarterObj) {
        alert('No logs found for the selected period.');
        return;
    }

    renderLogsTable(quarterObj.questions, logsForPeriod);
}

function renderLogsTable(questions, logs) {
    const table = $('#logsTable');
    const tbody = table.find('tbody');
    const thead = table.find('thead');
    tbody.empty();
    thead.empty();

    let headers = '<tr>';
    headers += '<th>Employee Name</th>';
    headers += '<th>Network ID</th>';
    headers += '<th>Division/Unit</th>';
    Object.keys(questions).forEach(key => {
        headers += `<th>${questions[key]}</th>`;
    });
    headers += '</tr>';
    thead.append(headers);

    logs.forEach(log => {
        let row = '<tr>';
        row += `<td>${log.employeeName}</td>`;
        row += `<td>${log.networkID}</td>`;
        row += `<td>${log.divisionUnit}</td>`;
        Object.keys(questions).forEach((key, index) => {
            const answerKey = `Answer${index + 1}`;
            row += `<td>${log.answers[answerKey] || '-'}</td>`;
        });
        row += '</tr>';
        tbody.append(row);
    });

    table.DataTable();
}