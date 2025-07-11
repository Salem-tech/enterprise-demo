// Employee Form - Handle questionnaire completion and submission

function fetchEmployeeLog() {
    // Try SharePoint first, fallback to Excel if offline
    try {
        const employeeLogUrl = "/_api/web/lists/getbytitle('logs')/items?$orderby=Created desc&$top=1";
        const digest = document.getElementById("__REQUESTDIGEST").value;

        $.ajax({
            url: employeeLogUrl,
            method: "GET",
            headers: {
                Accept: "application/json;odata=verbose",
                "X-RequestDigest": digest
            },
            success: function(logResponse) {
                const latestLog = logResponse.d.results[0];
                if (!latestLog) {
                    displayMessage("No logs found for this employee. Please contact the administrator.", "warning");
                    return;
                }

                const employeeInfo = {
                    logYear: latestLog.Year,
                    logQuarter: latestLog.Quarter,
                    employeeID: latestLog.NetworkID,
                    employeeName: latestLog.EmployeeName,
                    divisionUnit: latestLog.DivisionUnit
                };

                fetchChecklist(employeeInfo, digest);
            },
            error: function(error) {
                console.error("SharePoint not available, switching to offline mode:", error);
                loadOfflineMode();
            }
        });
    } catch (error) {
        console.error("Error with SharePoint, switching to offline mode:", error);
        loadOfflineMode();
    }
}

function fetchChecklist(employeeInfo, digest) {
    const checklistUrl = "/_api/web/lists/getbytitle('Checklists')/items?$select=Year,Quarter,Question1,Question2,Question3,Question4,Question5,Question6,Question7,Question8,Question9,Question10&$orderby=Year desc, Quarter desc&$top=1";

    $.ajax({
        url: checklistUrl,
        method: "GET",
        headers: {
            Accept: "application/json;odata=verbose",
            "X-RequestDigest": digest
        },
        success: function(checklistResponse) {
            const latestChecklist = checklistResponse.d.results[0];
            if (!latestChecklist) {
                displayMessage("No checklists found. Please contact the administrator.", "warning");
                return;
            }

            const checklistYear = latestChecklist.Year;
            const checklistQuarter = latestChecklist.Quarter;

            if (employeeInfo.logYear === checklistYear && employeeInfo.logQuarter === checklistQuarter) {
                displayMessage("You have already completed the checklist for the latest period.", "success");
            } else {
                const questions = [
                    latestChecklist.Question1, latestChecklist.Question2, latestChecklist.Question3,
                    latestChecklist.Question4, latestChecklist.Question5, latestChecklist.Question6,
                    latestChecklist.Question7, latestChecklist.Question8, latestChecklist.Question9,
                    latestChecklist.Question10
                ].filter(Boolean);

                loadChecklistForm(questions, employeeInfo, digest);
            }
        },
        error: function(error) {
            console.error("Error fetching checklist, switching to offline mode:", error);
            loadOfflineMode();
        }
    });
}

// Load questions from Excel when offline
function loadOfflineMode() {
    console.log('Loading offline mode - reading questions from Excel');
    displayMessage("SharePoint is unavailable. Loading questions from Excel file...", "info");
    
    loadExcelFile('DATA.xlsx', 
        function(sheet_data) {
            const result = processChecklistData(sheet_data);
            console.log('Excel questions loaded:', result.questions);
            
            if (Object.keys(result.questions).length > 0) {
                const questionsArray = Object.values(result.questions);
                const dummyEmployeeInfo = {
                    employeeID: 'OFFLINE_USER',
                    employeeName: 'Offline User',
                    divisionUnit: 'Demo Unit',
                    logYear: new Date().getFullYear(),
                    logQuarter: 'Q' + Math.ceil((new Date().getMonth() + 1) / 3)
                };
                
                displayMessage("Questions loaded from Excel. Please complete the form.", "success");
                loadChecklistForm(questionsArray, dummyEmployeeInfo, null);
            } else {
                displayMessage("No questions found in Excel file.", "warning");
            }
        },
        function(error) {
            console.error('Excel loading error:', error);
            displayMessage("Unable to load questions from Excel. Please serve this page from a web server.", "danger");
        }
    );
}

function loadChecklistForm(questions, employeeInfo, digest) {
    try {
        const container = document.getElementById("questionsList");
        if (!container) {
            throw new Error("Questions container not found");
        }
        
        container.innerHTML = "";
        questions.forEach((question, index) => {
            const div = document.createElement("div");
            div.className = "form-group";
            div.innerHTML = `
                <label for="answer${index + 1}"><strong>Q${index + 1}:</strong> ${question}</label>
                <select id="answer${index + 1}" class="form-control" required>
                    <option value="">Select an answer</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                </select>`;
            container.appendChild(div);
        });

        document.getElementById("checklistFormContainer").style.display = "block";
        saveChecklistAnswers(employeeInfo, digest);
    } catch (error) {
        console.error("Error loading checklist form:", error);
        displayMessage("Failed to load the checklist form.", "danger");
    }
}

function saveChecklistAnswers(employeeInfo, digest) {
    $('#checklistForm').on('submit', function(e) {
        e.preventDefault();

        try {
            const answers = [];
            let allAnswered = true;
            
            $('#questionsList select').each(function() {
                const answer = $(this).val();
                if (!answer) {
                    allAnswered = false;
                    return false;
                }
                answers.push(answer);
            });

            if (!allAnswered) {
                displayMessage("All questions must be answered.", "danger");
                return;
            }

            if (answers.length === 0) {
                displayMessage("No answers found to submit.", "danger");
                return;
            }

            // Check if we're in offline mode
            if (!digest) {
                // Offline mode - just show the answers
                console.log('Offline mode - answers:', answers);
                let answerSummary = '<h5>Your Answers:</h5><ul>';
                answers.forEach((answer, index) => {
                    answerSummary += `<li><strong>Question ${index + 1}:</strong> ${answer}</li>`;
                });
                answerSummary += '</ul><p class="text-info">Note: Answers not saved - offline mode</p>';
                
                displayMessage(answerSummary, "info");
                $('#checklistFormContainer').hide();
                return;
            }

            // Online mode - save to SharePoint
            const payload = {
                '__metadata': { 'type': 'SP.Data.LogsListItem' },
                'NetworkID': employeeInfo.employeeID,
                'EmployeeName': employeeInfo.employeeName,
                'DivisionUnit': employeeInfo.divisionUnit,
                'Year': employeeInfo.logYear,
                'Quarter': employeeInfo.logQuarter,
                'Status': 'Completed',
                ...Object.fromEntries(answers.map((answer, index) => [`Answer${index + 1}`, answer]))
            };

            $.ajax({
                url: "/_api/web/lists/getbytitle('logs')/items",
                method: "POST",
                contentType: "application/json;odata=verbose",
                headers: {
                    Accept: "application/json;odata=verbose",
                    "X-RequestDigest": digest
                },
                data: JSON.stringify(payload),
                success: function() {
                    displayMessage("Your answers have been submitted successfully.", "success");
                    $('#checklistFormContainer').hide();
                },
                error: function(error) {
                    console.error("Error saving answers:", error);
                    displayMessage("An error occurred while saving your answers.", "danger");
                }
            });
        } catch (error) {
            console.error("Error in form submission:", error);
            displayMessage("An unexpected error occurred while submitting your answers.", "danger");
        }
    });
}

function displayMessage(message, type) {
    const container = document.getElementById("messageContainer");
    container.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>
        </div>`;
}

document.addEventListener("DOMContentLoaded", fetchEmployeeLog);