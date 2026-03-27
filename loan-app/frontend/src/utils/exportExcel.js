import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

/**
 * Utility to export loan data to Excel
 * @param {Array} data - The array of loan objects to export
 * @param {String} typeOrFileName - Either 'DAILY', 'WEEKLY', or a custom filename
 */
export const exportLoansToExcel = async (data, typeOrFileName) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Loans");

  let title = "LOAN REPORT";
  let fileName = typeOrFileName || "Loans_Report.xlsx";
  let headers = [];
  let columns = [];

  // Determine type and format
  if (typeOrFileName === "DAILY" || typeOrFileName === "WEEKLY") {
    title = typeOrFileName;
    fileName = `${typeOrFileName}_Loans_Report_${new Date().toLocaleDateString("en-IN").replace(/\//g, "-")}.xlsx`;
    headers = [
      "Loan No",
      "Customer Name",
      "Mobile Numbers",
      "Guarantor",
      "Guar. Mobile",
      "Amount",
      "Processing Fee",
      "Start Date",
      "End Date",
      "Total EMIs",
      "EMI Amount",
      "Paid EMIs",
      "Remaining EMIs",
      "Total Collected",
      "Overdue",
      "Remaining Principal",
      "Next EMI Date",
      "Status",
      "Remarks",
    ];

    data.forEach((loan) => {
      const stats = loan.repaymentStats || {};
      columns.push([
        loan.loanNumber || "",
        loan.customerName || "",
        Array.isArray(loan.mobileNumbers)
          ? loan.mobileNumbers.join(", ")
          : loan.mobileNumbers || "",
        loan.guarantorName || "",
        Array.isArray(loan.guarantorMobileNumbers)
          ? loan.guarantorMobileNumbers.join(", ")
          : loan.guarantorMobileNumbers || "",
        loan.disbursementAmount || 0,
        loan.processingFee || 0,
        loan.startDate ? new Date(loan.startDate).toLocaleDateString("en-IN") : "-",
        loan.emiEndDate
          ? new Date(loan.emiEndDate).toLocaleDateString("en-IN")
          : "-",
        loan.totalEmis || 0,
        loan.emiAmount || 0,
        loan.paidEmis || 0,
        loan.remainingEmis || 0,
        stats.totalCollected || loan.totalCollected || 0,
        stats.overdueAmount || 0,
        loan.remainingPrincipalAmount || 0,
        stats.nextEmiDate
          ? new Date(stats.nextEmiDate).toLocaleDateString("en-IN")
          : loan.nextEmiDate
            ? new Date(loan.nextEmiDate).toLocaleDateString("en-IN")
            : "-",
        loan.status || "",
        loan.remarks || "",
      ]);
    });
  } else if (fileName.toLowerCase().includes("customer")) {
    title = "CUSTOMER REGISTRY";
    headers = [
      "LOAN NO",
      "CUSTOMER NAME",
      "CONTACTS",
      "GUARANTOR",
      "GUAR. MOBILE",
      "MONTHLY EMI",
      "STATUS",
    ];

    data.forEach((c) => {
      columns.push([
        c.loanNumber || "",
        c.customerName || "",
        Array.isArray(c.mobileNumbers)
          ? c.mobileNumbers.join(", ")
          : c.mobileNumbers || "",
        c.guarantorName || "",
        Array.isArray(c.guarantorMobileNumbers)
          ? c.guarantorMobileNumbers.join(", ")
          : c.guarantorMobileNumbers || "",
        c.monthlyEMI || 0,
        c.status || "",
      ]);
    });
  } else {
    // Default / Monthly Loans
    title = "MONTHLY LOANS REPORT";
    headers = [
      "SI No", // A
      "Loan No.", // B
      "Loan Status", // C
      "Name", // D
      "Address", // E
      "Own/Rent", // F
      "Mobile no.", // G
      "Amount", // H
      "Interest Rate", // I
      "Processing fee", // J
      "Tenure Type", // K
      "Tenure", // L
      "Start date", // M
      "End date", // N
      "EMI Amount", // O
      "Overdue", // P
      "Remaining Tenure", // Q
      "Remaining Principle Amount", // R
      "Next EMI DueDate", // S
      "Vehicle Number", // T
      "Chassis No", // U
      "Engine No", // V
      "Type of Vehicle", // W
      "Model Year", // X
      "YW Board", // Y
      "PAN Number", // Z
      "Aadhar Number", // AA
      "Guarantor Name", // AB
      "Dealer name", // AC
      "Dealer number", // AD
      "HP Entry", // AE
      "FC Date", // AF
      "Insurance date", // AG
      "Paid EMI counter", // AH
      "DOCUMENTS COLLECTED", // AI
      "RTO WORK PENDING", // AJ
      "RTO WORK COMPLETED", // AK
      "Value", // AL
      "Remarks", // AM
    ];

    data.forEach((loan, index) => {
      const customer = loan.customerDetails || {};
      const terms = loan.loanTerms || {};
      const status = loan.status || {};
      const repayment = loan.repaymentStats || {};
      const vInfo = loan.vehicleInformation || {};

      const rowNumber = index + 3; // Data starts at row 3 (Row 1: Title, Row 2: Headers)

      columns.push([
        index + 1, // A: SI No
        terms.loanNumber || "-", // B: Loan No.
        status.status || "Active", // C: Loan Status
        customer.customerName || "-", // D: Name
        customer.address || "-", // E: Address
        customer.ownRent || "-", // F: Own/Rent
        Array.isArray(customer.mobileNumbers)
          ? customer.mobileNumbers.join(", ")
          : customer.mobileNumbers || "-", // G: Mobile no.
        terms.principalAmount || 0, // H: Amount
        terms.annualInterestRate || 0, // I: Interest Rate
        terms.processingFee || 0, // J: Processing fee
        terms.tenureType || "Monthly", // K: Tenure Type
        terms.tenureMonths || 0, // L: Tenure
        terms.emiStartDate
          ? new Date(terms.emiStartDate).toLocaleDateString("en-IN")
          : "-", // M: Start date
        terms.emiEndDate
          ? new Date(terms.emiEndDate).toLocaleDateString("en-IN")
          : "-", // N: End date
        terms.monthlyEMI || 0, // O: EMI Amount
        repayment.overdueAmount || 0, // P: Overdue
        repayment.remainingTenure || 0, // Q: Remaining Tenure
        repayment.remainingPrincipal || 0, // R: Remaining Principle Amount
        repayment.nextEmiDueDate
          ? new Date(repayment.nextEmiDueDate).toLocaleDateString("en-IN")
          : "-", // S: Next EMI DueDate
        vInfo.vehicleNumber || "-", // T: Vehicle Number
        vInfo.chassisNumber || "-", // U: Chassis No
        vInfo.engineNumber || "-", // V: Engine No
        vInfo.typeOfVehicle || "-", // W: Type of Vehicle
        vInfo.modelYear || "-", // X: Model
        vInfo.ywBoard || "-", // Y: YW Board
        customer.panNumber || "-", // Z: PAN Number
        customer.aadharNumber || "-", // AA: Aadhar Number
        customer.guarantorName || "-", // AB: Guarantor Name
        vInfo.dealerName || "-", // AC: Dealer name
        vInfo.dealerNumber || "-", // AD: Dealer number
        vInfo.hpEntry || "Not done", // AE: HP Entry
        vInfo.fcDate ? new Date(vInfo.fcDate).toLocaleDateString("en-IN") : "-", // AF: FC Date
        vInfo.insuranceDate
          ? new Date(vInfo.insuranceDate).toLocaleDateString("en-IN")
          : "-", // AG: Insurance date
        repayment.paidEmisCount || 0, // AH: Paid EMI counter
        status.docChecklist || "-", // AI: DOCUMENTS COLLECTED
        Array.isArray(vInfo.rtoWorkPending)
          ? vInfo.rtoWorkPending.join(", ")
          : vInfo.rtoWorkPending || "-", // AJ: RTO WORK PENDING
        "-", // AK: RTO WORK COMPLETED (Placeholder)
        { formula: `AH${rowNumber}*O${rowNumber}+P${rowNumber}+J${rowNumber}` }, // AL: Value
        status.remarks || "-", // AM: Remarks
      ]);
    });
  }

  // Add Title
  const titleRow = worksheet.addRow([title]);
  titleRow.font = { name: "Arial Black", size: 16, bold: true };
  worksheet.mergeCells(1, 1, 1, headers.length);
  titleRow.alignment = { vertical: "middle", horizontal: "center" };
  titleRow.height = 30;

  // Add Headers
  const headerRow = worksheet.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E293B" }, // Slate 800
    };
    cell.font = {
      color: { argb: "FFFFFFFF" },
      bold: true,
      size: 10,
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });
  headerRow.height = 25;

  // Add Data
  columns.forEach((dataRow) => {
    const row = worksheet.addRow(dataRow);
    row.eachCell((cell) => {
      cell.alignment = { vertical: "middle", horizontal: "left" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.font = { size: 9 };

      // Format 0 as "-"
      if (typeof cell.value === "number" && cell.value === 0) {
        cell.value = "-";
      }
    });
  });

  // Auto-fit columns
  worksheet.columns.forEach((column) => {
    let maxColumnLength = 0;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const columnLength = cell.value ? cell.value.toString().length : 10;
      if (columnLength > maxColumnLength) {
        maxColumnLength = columnLength;
      }
    });
    column.width = maxColumnLength < 12 ? 12 : maxColumnLength + 2;
  });

  // Generate and Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, fileName);
};
