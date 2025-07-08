/**
 * @OnlyCurrentDoc
 *
 * Main configuration object for the Timesheet PDF Generation API.
 * All constants, IDs, and cell references should be managed from here.
 */
const CONFIG = {
  // --- SPREADSHEET & FOLDER IDs ---
  // ID of the Google Sheet to be used as a template for new timesheets.
  TEMPLATE_SHEET_ID: 'YOUR_TEMPLATE_SHEET_ID_HERE', 
  
  // ID of the Google Drive folder where generated PDF timesheets will be stored.
  PDF_FOLDER_ID: 'YOUR_PDF_DESTINATION_FOLDER_ID_HERE',
  
  // ID of the Spreadsheet used for logging.
  LOG_SHEET_ID: 'YOUR_LOG_SPREADSHEET_ID_HERE', 
  
  // --- SHEET & CELL CONFIGURATION ---
  // The name of the sheet within the template that contains the timesheet data.
  DATA_SHEET_NAME: 'Timesheet',
  
  // The name of the sheet to be exported as a PDF. Usually the same as DATA_SHEET_NAME.
  PDF_SHEET_NAME: 'Timesheet',

  // --- METADATA CELL MAPPING ---
  // Cell references for where to place the primary timesheet information.
  CLIENT_NAME_CELL: 'C4',
  CLIENT_PO_CELL: 'C5',
  JOB_NO_CELL: 'C6',
  LOCATION_CELL: 'C7',
  POC_CELL: 'H4',
  SHIFT_DATE_CELL: 'H5',
  TIMESHEET_ID_CELL: 'H6',
  NOTES_CELL: 'B25',
  
  // --- EMPLOYEE DATA CONFIGURATION ---
  // The row number where the employee time entries begin.
  DATA_START_ROW: 11,
  
  // The starting column for employee data (e.g., 'B' for column 2).
  DATA_START_COL: 2, // Column B
  
  // --- SIGNATURE CONFIGURATION ---
  // The cell where the client's signature image will be inserted.
  SIGNATURE_CELL: 'G27',
};

/**
 * Logs a detailed message to a specified Google Sheet for debugging.
 * @param {object} logData An object containing all relevant data for the log entry.
 */
function logToSheet(logData) {
  try {
    const logSheet = SpreadsheetApp.openById(CONFIG.LOG_SHEET_ID).getSheetByName('Logs');
    if (!logSheet) {
        // As a fallback, create the sheet if it doesn't exist.
        const ss = SpreadsheetApp.openById(CONFIG.LOG_SHEET_ID);
        ss.insertSheet('Logs', 0).getRange(1, 1, 1, 6).setValues([['Timestamp', 'Trigger', 'Status', 'Message', 'Payload', 'PDF URL']]);
    }
    const sheetToLog = SpreadsheetApp.openById(CONFIG.LOG_SHEET_ID).getSheetByName('Logs');
    sheetToLog.appendRow([
      logData.timestamp,
      logData.trigger,
      logData.status,
      logData.message,
      typeof logData.payload === 'object' ? JSON.stringify(logData.payload) : logData.payload,
      logData.pdfUrl
    ]);
  } catch (e) {
    Logger.log(`Failed to write to log sheet. Error: ${e.message}. Log data: ${JSON.stringify(logData)}`);
  }
}

/**
 * Creates a JSON response object for the web app.
 * @param {Object} data The data to include in the JSON response.
 * @param {number} statusCode The HTTP status code for the response.
 * @returns {GoogleAppsScript.Content.TextOutput} The content service object.
 */
function createJsonResponse(data, statusCode) {
  // Google Apps Script doesn't allow setting HTTP status codes directly in this context.
  // The client must rely on the 'status' field in the JSON payload for handling.
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Decodes a Base64 string (potentially with a data URI prefix) into a Blob.
 * @param {string} base64String The base64 encoded string.
 * @returns {GoogleAppsScript.Base.Blob} The decoded blob.
 */
function base64ToBlob(base64String) {
  const parts = base64String.split(',');
  const contentType = parts[0].split(':')[1].split(';')[0];
  const raw = Utilities.base64Decode(parts[1]);
  return Utilities.newBlob(raw, contentType, 'signature.png');
}

/**
 * The main API endpoint for handling POST requests to generate PDFs.
 * @param {GoogleAppsScript.Events.DoPost} e The event parameter containing the POST data.
 * @returns {GoogleAppsScript.Content.TextOutput} A JSON response indicating success or failure.
 */
function doPost(e) {
  const logData = {
    timestamp: new Date(),
    trigger: 'doPost',
    status: 'Initiated',
    message: 'Request received.',
    payload: e ? (e.postData ? e.postData.contents : 'No postData') : 'No event object',
    pdfUrl: '',
  };

  let tempSheetFile; // Keep a reference for cleanup in catch block

  try {
    // 1. Authenticate & Validate
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('Invalid request: No POST data received.');
    }
    
    const payload = JSON.parse(e.postData.contents);
    logData.payload = payload; // Update log with parsed payload

    const scriptProperties = PropertiesService.getScriptProperties();
    const SECRET_API_KEY = scriptProperties.getProperty('API_KEY');

    if (!SECRET_API_KEY) {
        throw new Error('Configuration error: API_KEY is not set in Script Properties.');
    }

    if (!payload.apiKey || payload.apiKey !== SECRET_API_KEY) {
      logData.status = 'Error';
      logData.message = 'Authentication failed: Invalid API Key.';
      logToSheet(logData);
      return createJsonResponse({ status: 'error', message: 'Unauthorized' }, 401);
    }
    
    logData.message = `Authenticated successfully for timesheet: ${payload.timesheetId}`;
    logToSheet(logData);

    // 2. Create Temporary Sheet
    const templateFile = DriveApp.getFileById(CONFIG.TEMPLATE_SHEET_ID);
    const newSheetName = `Timesheet - ${payload.jobNo} - ${payload.timesheetId}`;
    tempSheetFile = templateFile.makeCopy(newSheetName);
    const spreadsheet = SpreadsheetApp.openById(tempSheetFile.getId());
    const sheet = spreadsheet.getSheetByName(CONFIG.DATA_SHEET_NAME);

    if (!sheet) {
        throw new Error(`Sheet with name "${CONFIG.DATA_SHEET_NAME}" not found in the template.`);
    }

    logData.message = `Temporary sheet created: ${newSheetName} (ID: ${tempSheetFile.getId()})`;
    logToSheet(logData);

    // 3. Populate Data
    sheet.getRange(CONFIG.CLIENT_NAME_CELL).setValue(payload.clientName);
    sheet.getRange(CONFIG.CLIENT_PO_CELL).setValue(payload.clientPO);
    sheet.getRange(CONFIG.JOB_NO_CELL).setValue(payload.jobNo);
    sheet.getRange(CONFIG.LOCATION_CELL).setValue(payload.location);
    sheet.getRange(CONFIG.POC_CELL).setValue(payload.poc);
    sheet.getRange(CONFIG.TIMESHEET_ID_CELL).setValue(payload.timesheetId);
    sheet.getRange(CONFIG.NOTES_CELL).setValue(payload.notes);
    
    const shiftDate = new Date(payload.shiftDateTime);
    sheet.getRange(CONFIG.SHIFT_DATE_CELL).setValue(shiftDate).setNumberFormat('yyyy-mm-dd');

    // Populate employee time entries
    if (payload.employeeTimes && payload.employeeTimes.length > 0) {
        const employeeData = payload.employeeTimes.map(employee => [
            employee.name,
            employee.jt,
            employee.in1, employee.out1,
            employee.in2, employee.out2,
            employee.in3, employee.out3
        ]);
        sheet.getRange(CONFIG.DATA_START_ROW, CONFIG.DATA_START_COL, employeeData.length, employeeData[0].length).setValues(employeeData);
    }

    logData.message = 'Timesheet data populated successfully.';
    logToSheet(logData);

    // 4. Insert Signature
    if (payload.clientSignatureBase64) {
      const signatureBlob = base64ToBlob(payload.clientSignatureBase64);
      sheet.insertImage(signatureBlob, CONFIG.SIGNATURE_CELL);
      logData.message = 'Client signature inserted.';
      logToSheet(logData);
    } else {
      logData.message = 'No client signature provided in payload.';
      logToSheet(logData);
    }

    // 5. Generate and Store PDF
    SpreadsheetApp.flush(); // Ensure all updates are written before PDF export
    const pdfFolder = DriveApp.getFolderById(CONFIG.PDF_FOLDER_ID);
    
    // Use Drive API for more reliable PDF export options if needed, but blob conversion is robust
    const pdfBlob = tempSheetFile.getBlob().getAs('application/pdf');
    pdfBlob.setName(newSheetName + '.pdf');
    
    const pdfFile = pdfFolder.createFile(pdfBlob);
    pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    const pdfUrl = pdfFile.getUrl();
    logData.pdfUrl = pdfUrl;
    logData.message = `PDF generated and stored successfully: ${pdfUrl}`;
    logToSheet(logData);

    // 6. Cleanup
    tempSheetFile.setTrashed(true);
    logData.message = `Temporary sheet file "${newSheetName}" has been moved to trash.`;
    logToSheet(logData);

    // 7. Construct and Return Success Response
    logData.status = 'Success';
    logData.message = 'Process completed successfully.';
    logToSheet(logData);
    
    return createJsonResponse({ status: 'success', pdfUrl: pdfUrl }, 200);

  } catch (error) {
    Logger.log(error.toString());
    logData.status = 'Error';
    logData.message = `An error occurred: ${error.message}\nStack: ${error.stack}`;
    logToSheet(logData);
    
    // Cleanup the temporary file if it was created before the error occurred
    if (tempSheetFile) {
        try {
            tempSheetFile.setTrashed(true);
            logData.message = `Error occurred. Cleaned up temporary file.`;
            logToSheet(logData);
        } catch (cleanupError) {
            logData.message = `Error during main process. Also failed to cleanup temporary file: ${cleanupError.message}`;
            logToSheet(logData);
        }
    }

    const statusCode = error.message.includes('Unauthorized') ? 401 : 500;
    return createJsonResponse({ status: 'error', message: error.message }, statusCode);
  }
}