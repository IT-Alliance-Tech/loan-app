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
      "Name",
      "Number",
      "Amount",
      "Disbursed date",
      "start date",
      "Total EMIs",
      "EMI Amount",
      "Paid EMIs",
      "Remaining EMIs",
      "Total Amount paid",
      "Next EMI duedate",
      "Remarks",
    ];

    data.forEach((loan) => {
      columns.push([
        loan.loanNumber || "",
        loan.customerName || "",
        loan.mobileNumber || "",
        loan.disbursementAmount || 0,
        loan.startDate
          ? new Date(loan.startDate).toLocaleDateString("en-IN")
          : "",
        loan.emiStartDate
          ? new Date(loan.emiStartDate).toLocaleDateString("en-IN")
          : "",
        loan.totalEmis || 0,
        loan.emiAmount || 0,
        loan.paidEmis || 0,
        loan.remainingEmis || 0,
        loan.totalAmount || 0,
        loan.nextEmiDate
          ? new Date(loan.nextEmiDate).toLocaleDateString("en-IN")
          : "",
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
    title = "MONTHLY LOANS";
    headers = [
      "Loan No",
      "Customer Name",
      "Mobile",
      "Principal",
      "ROI %",
      "Tenure",
      "EMI Amount",
      "Total Paid",
      "Next EMI Due",
      "Status",
    ];

    data.forEach((loan) => {
      const customer = loan.customerDetails || {};
      const terms = loan.loanTerms || {};
      const status = loan.status || {};

      columns.push([
        terms.loanNumber || "",
        customer.customerName || "",
        Array.isArray(customer.mobileNumbers) ? customer.mobileNumbers[0] : "",
        terms.principalAmount || 0,
        terms.annualInterestRate || 0,
        terms.tenureMonths || 0,
        terms.monthlyEMI || 0,
        loan.repaymentStats?.totalPaidAmount || 0,
        status.nextEmiDueDate
          ? new Date(status.nextEmiDueDate).toLocaleDateString("en-IN")
          : "-",
        status.status || "",
      ]);
    });
  }

  // Add Title
  const titleRow = worksheet.addRow([title]);
  titleRow.font = { name: "Arial Black", size: 16, bold: true };
  worksheet.mergeCells(`A1:${String.fromCharCode(64 + headers.length)}1`);
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
