/**
 * Action Item Summary Report Application
 * Loads Excel data and displays it in filterable tables with charts
 */

// Global data storage
const dataArr = [];
const pureYearsArr = [];

// Division-to-process mapping for filtering
const divProcess = [
  ["Div1", "1.1", "5.1.1", "5.1.2", "10.1"],
  ["Group", "1.2", "2.1", "5.1", "12.3"],
  ["Unit", "3.1", "6.1", "9.1", "9.2"],
  ["Div2", "4.1", "4.2", "5.2", "5.3", "5.4", "11.1", "12.1", "12,2"],
  ["Div3", "5.1.3"],
  ["Div4", "4.4", "4.5", "7.2"],
  ["Div5", "7.1", "8.1"],
  ["Div6", "11.2", "11.3"],
];

// Load Excel data file
var xhttp = new XMLHttpRequest();
xhttp.open("GET", "data/DATA.xlsx", true);
xhttp.responseType = "arraybuffer";

xhttp.onload = (e) => {
  // Convert Excel file to readable format
  var arraybuffer = xhttp.response;
  var data = new Uint8Array(arraybuffer);
  var arr = new Array();
  for (var i = 0; i != data.length; ++i) {
    arr[i] = String.fromCharCode(data[i]);
    var bstr = arr.join("");
  }

  var work_book = XLSX.read(bstr, { type: "binary" });
  var sheet_name = work_book.SheetNames;

  var sheet_data = XLSX.utils.sheet_to_json(work_book.Sheets[sheet_name[0]], {
    header: 1,
  });
  // Process Excel data and build year dropdown
  if (sheet_data.length > 0) {
    let dateCol = 0;
    let yearPlace = 0;
    for (var row = 0; row < sheet_data.length; row++) {
      dataArr.push([]);
      for (var cell = 0; cell < sheet_data[row].length; cell++) {
        if (row == 0) {
          if (sheet_data[row][cell] === "Start Date") {
            dateCol = cell;
          }
          dataArr[row].push(sheet_data[row][cell]);
          continue;
        } else {
          if (cell === dateCol || cell === dateCol + 1) {
            dateCell = sheet_data[row][cell];
            dataArr[row].push(dateCell.toString());
            if (cell === dateCol && cell !== 0) {
              yearPlace = dateCell.split("/")[2];
              if (!pureYearsArr.includes(yearPlace)) {
                pureYearsArr.push(yearPlace);
              }
            }
            continue;
          }
        }
        dataArr[row].push(sheet_data[row][cell]);
      }
    }
    pureYearsArr.sort();
    yearsDdlList = document.getElementById("yearsList");
    pureYearsArr.forEach(
      (el) => (yearsDdlList.innerHTML += `<option value="${el}">${el}</option>`)
    );
  }
};

xhttp.onerror = () => {
  alert(
    '<div class="alert alert-danger">Only .xlsx or .xls file format are allowed</div>'
  );
};
xhttp.send();

// Main function to display filtered data tables and charts
function showTable(selectedTab) {
  var selectedYear = document.getElementById("yearsList").value;
  if (selectedYear == 0) {
    alert("select a year");
  } else {
    let stDateCol = -1;
    let procCol = -1;

    var table_output = `<table id="${selectedTab}-table" class="table table-responsive-sm .table-hover .table-condensed table-sm" cellspacing="0" width="100%">`;
    var table_row = "";
    for (let row = 0; row < dataArr.length; row++) {
      if (row == 0) table_row = "<thead><tr>";
      else if (row == 1) table_row = "<tbody>";
      else table_row = "<tr>";

      for (let cell = 0; cell < dataArr[row].length; cell++) {
        if (row == 0) {
          table_row += "<th>" + dataArr[row][cell] + "</th>";
          if (dataArr[row][cell] == "Start Date") {
            stDateCol = cell;
          }

          if (dataArr[row][cell] == "Process") {
            procCol = cell;
          }
          if (cell + 1 !== dataArr[row].length) continue;
          else {
            table_row += "</tr></thead>";
            break;
          }
        }
        if (cell === stDateCol && selectedYear != 1) {
          if (dataArr[row][cell].split("/")[2] !== selectedYear) {
            table_row = "";
            break;
          }
        }
        if (cell === procCol && selectedTab.split("-")[1] !== "Department") {
          let checked = checkDiv(
            selectedTab.split("-")[1],
            dataArr[row][cell].split(" ")[0]
          );
          if (!checked) {
            table_row = "";
            break;
          }
        }
        table_row += "<td>" + dataArr[row][cell] + "</td>";
      }
      table_output += table_row;
    }
    table_output += "</tbody></table>";
  }
  $(document).ready(function () {
    $(`#${selectedTab}-table`).DataTable();
    $(".dataTables_length").addClass("bs-select");
  });
  document.getElementById(selectedTab).innerHTML = table_output;

  // Initialize chart data structure
  let chartData = [
    ["Process", "In Progress", "Overdue", "Closed", "Total"],
    ["Department", 0, 0, 0, 0],
  ];
  if (selectedTab.split("-")[1] == "Department") chartData[0][0] = "Division";
  else chartData.pop();

  // Process table data to build chart statistics
  let table = document.getElementById(`${selectedTab}-table`),
    rows = table.rows,
    rowcount = rows.length,
    procCell,
    divRoom = 1;
  for (let r = 0; r < rowcount; r++) {
    let cells = rows[r].cells,
      cellcount = cells.length;
    for (c = 0; c < cellcount; c++) {
      let cell = cells[c];
      if (cell.innerHTML == "Process") {
        procCell = c;
        continue;
      }
      if (c == procCell) {
        console.log(cell.innerHTML + " Process ...");
        var proccDiv = checkDivName(
          cell.innerHTML.split(" ")[0],
          selectedTab.split("-")[1]
        );
        for (let i = 0; i < chartData.length; i++) {
          if (chartData[i].includes(proccDiv)) {
            divRoom = i;
            break;
          }
          if (i == chartData.length - 1) {
            console.log(proccDiv + " adding to chartData ...");
            chartData.push([proccDiv, 0, 0, 0, 0]);
            divRoom += 1;
          }
        }
      }

      switch (cell.innerHTML) {
        case "In Progress":
          chartData[divRoom][1] += 1;
          chartData[divRoom][4] += 1;
          if (selectedTab.split("-")[1] == "Department") {
            chartData[1][1] += 1;
            chartData[1][4] += 1;
          }
          break;
        case "Overdue":
          chartData[divRoom][2] += 1;
          chartData[divRoom][4] += 1;
          if (selectedTab.split("-")[1] == "Department") {
            chartData[1][2] += 1;
            chartData[1][4] += 1;
          }
          break;
        case "Closed":
          chartData[divRoom][3] += 1;
          chartData[divRoom][4] += 1;
          if (selectedTab.split("-")[1] == "Department") {
            chartData[1][3] += 1;
            chartData[1][4] += 1;
          }
          break;
      }
    }
  }

  // Create and display chart
  let chartDiv = document.createElement("div");
  chartDiv.innerHTML = `<br><div id="${selectedTab}-chart" class ="chartSection"></div><br>`;
  document.getElementById(`${selectedTab}-table`).before(chartDiv);

  // Sort chart data for Department view
  if (selectedTab.split("-")[1] === "Department") {
    const header  = chartData[0];
    const summary = chartData[1];
    const dataRows = chartData.slice(2);
  
    dataRows.sort((a, b) => {
      const nameA = String(a[0] || "");
      const nameB = String(b[0] || "");
      return nameA.localeCompare(nameB);
    });
  
    chartData = [ header, summary, ...dataRows ];
  }
  
  // Load Google Charts and render
  google.charts.load("current", { packages: ["bar"] });
  google.charts.setOnLoadCallback(function () {
    console.log(`${selectedTab}-chart data\n\n ${chartData}`)
    drawChart(chartData, `${selectedTab}-chart`);
  });
}

// Check if process belongs to specific division
function checkDiv(divTab, procData) {
  for (let i = 0; i < divProcess.length; i++) {
    if (divProcess[i][0] == divTab && divProcess[i].includes(procData)) {
      return true;
    }
    if (i == divProcess.length - 1) {
      return false;
    }
  }
}

// Get division name for a process
function checkDivName(procData, divName) {
  for (let i = 0; i < divProcess.length; i++) {
    if (divProcess[i].includes(procData)) {
      if (divName !== "Department") return procData;
      return divProcess[i][0];
    }
  }
}

// Render Google Charts bar chart
function drawChart(stuff, chartDiv) {
  var data = google.visualization.arrayToDataTable(stuff);

  var options = {
    chart: {
      hAxis: { title: "Division" },
      seriesType: "bars",
      series: { 4: { type: "line" } },
      color: ["#ffc107", "#ffc107", "#ffc107", "#ffc107"],
    },
  };
  var chart = new google.charts.Bar(document.getElementById(chartDiv));
  chart.draw(data, google.charts.Bar.convertOptions(options));
}
