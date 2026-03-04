import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { format } from "date-fns";

/**
 * Export loan data to Excel matching a specific format
 * @param {Array} data - Array of loan objects
 * @param {String} type - 'DAILY' or 'WEEKLY'
 */
export const exportLoansToExcel = async (data, type) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(type);

  // Set default column widths
  worksheet.columns = [
    { header: "Loan No", key: "loanNumber", width: 12 },
    { header: "Name", key: "customerName", width: 25 },
    { header: "Number", key: "mobileNumber", width: 15 },
    { header: "Amount", key: "disbursementAmount", width: 15 },
    { header: "Disbursed date", key: "startDate", width: 15 },
    { header: "start date", key: "emiStartDate", width: 15 },
    { header: "Total EMIs", key: "totalEmis", width: 12 },
    { header: "EMI Amount", key: "emiAmount", width: 15 },
    { header: "Paid EMIs", key: "paidEmis", width: 12 },
    { header: "Remaining EMIs", key: "remainingEmis", width: 15 },
    { header: "Total Amount paid", key: "totalPaid", width: 18 },
    { header: "Next EMI duedate", key: "nextEmiDate", width: 18 },
    { header: "Remarks", key: "remarks", width: 30 },
  ];

  // 1. Add Title Row (Header merged)
  worksheet.insertRow(1, [type]);
  worksheet.mergeCells("A1:M1");
  const titleCell = worksheet.getCell("A1");
  titleCell.font = { name: "Calibri", size: 16, bold: true };
  titleCell.alignment = { horizontal: "left" };

  // 2. Set Row 2 as Headers
  const headerRow = worksheet.getRow(2);
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Calibri", size: 11, bold: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9E1F2" }, // Light blue background
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  // Color specific headers if needed (Next EMI duedate is red in screenshot)
  const nextEmiHeader = worksheet.getCell("L2");
  nextEmiHeader.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFF0000" }, // Red
  };
  nextEmiHeader.font = {
    name: "Calibri",
    size: 11,
    bold: true,
    color: { argb: "FFFFFFFF" },
  };

  const remainingEmisHeader = worksheet.getCell("J2");
  remainingEmisHeader.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" }, // Darker blue
  };
  remainingEmisHeader.font = {
    name: "Calibri",
    size: 11,
    bold: true,
    color: { argb: "FFFFFFFF" },
  };

  // 3. Add Data Rows
  data.forEach((loan) => {
    const row = worksheet.addRow({
      loanNumber: loan.loanNumber,
      customerName: loan.customerName,
      mobileNumber: loan.mobileNumber,
      disbursementAmount: loan.disbursementAmount || 0,
      startDate: loan.startDate
        ? format(new Date(loan.startDate), "dd-MM-yyyy")
        : "-",
      emiStartDate: loan.emiStartDate
        ? format(new Date(loan.emiStartDate), "dd-MM-yyyy")
        : "-",
      totalEmis: loan.totalEmis || 0,
      emiAmount: loan.emiAmount || 0,
      paidEmis: loan.paidEmis || 0,
      remainingEmis: loan.remainingEmis || 0,
      totalPaid: (loan.emiAmount || 0) * (loan.paidEmis || 0),
      nextEmiDate: loan.nextEmiDate
        ? format(new Date(loan.nextEmiDate), "dd-MM-yyyy")
        : "-",
      remarks: loan.remarks || "",
    });

    // Style data row
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.font = { name: "Calibri", size: 10 };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });
  });

  // Generate Buffer and Save
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `${type}_Loans_${format(new Date(), "ddMMyyyy_HHmm")}.xlsx`);
};
