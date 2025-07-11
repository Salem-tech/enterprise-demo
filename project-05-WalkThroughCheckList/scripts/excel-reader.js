// Excel Reader - Load questionnaire data from Excel files

/**
 * Loads and reads Excel (.xlsx) files using SheetJS library
 * @param {string} filePath - Path to the Excel file
 * @param {function} onSuccess - Callback function when data is loaded successfully
 * @param {function} onError - Callback function when error occurs
 */
function loadExcelFile(filePath, onSuccess, onError) {
    console.log('Starting Excel file load:', filePath);
    var xhttp = new XMLHttpRequest();
    xhttp.open("GET", filePath, true);
    xhttp.responseType = "arraybuffer";

    xhttp.onload = (e) => {
        console.log('Excel file loaded, status:', xhttp.status, 'response size:', xhttp.response ? xhttp.response.byteLength : 'null');
        try {
            // Convert Excel file to readable format
            var arraybuffer = xhttp.response;
            var data = new Uint8Array(arraybuffer);
            var arr = new Array();
            for (var i = 0; i != data.length; ++i) {
                arr[i] = String.fromCharCode(data[i]);
            }
            var bstr = arr.join("");

            // Parse Excel workbook
            var work_book = XLSX.read(bstr, { type: "binary" });
            var sheet_name = work_book.SheetNames;
            var sheet_data = XLSX.utils.sheet_to_json(work_book.Sheets[sheet_name[0]], {
                header: 1,
            });

            // Call success callback with processed data
            if (onSuccess) {
                onSuccess(sheet_data);
            }
        } catch (error) {
            console.error('Error processing Excel file:', error);
            if (onError) {
                onError(error);
            }
        }
    };

    xhttp.onerror = () => {
        const error = 'Failed to load Excel file: ' + filePath;
        console.error('XHR Error:', error);
        if (onError) {
            onError(error);
        }
    };
    
    xhttp.onreadystatechange = () => {
        console.log('XHR State change - readyState:', xhttp.readyState, 'status:', xhttp.status);
    };

    xhttp.send();
}

/**
 * Processes raw Excel data into structured format for checklist logs
 * @param {Array} sheet_data - Raw Excel data from SheetJS
 * @returns {Array} Processed log entries
 */
function processChecklistData(sheet_data) {
    const result = {
        questions: {},
        logsArray: []
    };
    
    if (!sheet_data || sheet_data.length === 0) {
        console.warn('No Excel data provided or data is empty');
        return result;
    }
    
    // Validate minimum required columns
    if (sheet_data.length > 0 && sheet_data[0].length < 15) {
        console.error('Excel file must have at least 15 columns for proper answer processing');
        return result;
    }
    
    // First row contains headers - extract questions from columns 5-14
    const headers = sheet_data[0];
    console.log('Extracting questions from Excel headers:', headers);
    
    for (let i = 5; i <= 14; i++) {
        if (headers[i] && headers[i].trim() !== '') {
            result.questions[`Question${i - 4}`] = headers[i].trim();
        }
    }
    
    console.log('Extracted questions from Excel:', result.questions);
    
    // Process each data row
    for (var row = 1; row < sheet_data.length; row++) {
        if (sheet_data[row] && sheet_data[row].length > 0) {
            const rowData = sheet_data[row];
            
            // Validate required fields
            if (!rowData[2] || !rowData[3]) {
                console.warn(`Row ${row + 1}: Missing required fields (NetworkID or EmployeeName)`);
                continue;
            }
            
            const log = {
                year: parseInt(rowData[0]) || new Date().getFullYear(),
                quarter: rowData[1] || '',
                networkID: rowData[2] || '',
                employeeName: rowData[3] || '',
                divisionUnit: rowData[4] || '',
                answers: {
                    Answer1: rowData[5] || '',
                    Answer2: rowData[6] || '',
                    Answer3: rowData[7] || '',
                    Answer4: rowData[8] || '',
                    Answer5: rowData[9] || '',
                    Answer6: rowData[10] || '',
                    Answer7: rowData[11] || '',
                    Answer8: rowData[12] || '',
                    Answer9: rowData[13] || '',
                    Answer10: rowData[14] || ''
                }
            };
            result.logsArray.push(log);
        }
    }
    
    console.log(`Successfully processed ${result.logsArray.length} checklist entries and ${Object.keys(result.questions).length} questions from Excel`);
    return result;
}