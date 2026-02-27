import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export const exportLoansToExcel = async (
  loans,
  filename = "Loans_Report.xlsx",
) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Loans Profile");

  // Define 40 Columns (A to AM)
  worksheet.columns = [
    { header: "SI No", key: "siNo", width: 8 }, // A
    { header: "Loan No.", key: "loanNumber", width: 12 }, // B
    { header: "", key: "colC", width: 5 }, // C
    { header: "", key: "colD", width: 5 }, // D
    { header: "", key: "colE", width: 5 }, // E
    { header: "", key: "colF", width: 5 }, // F
    { header: "Mobile no.", key: "mobileCombined", width: 35 }, // G
    { header: "Amount", key: "amount", width: 15 }, // H
    { header: "Interest Rate", key: "interestRate", width: 12 }, // I
    { header: "Processing fee", key: "processingFee", width: 15 }, // J
    { header: "Tenure type", key: "tenureType", width: 12 }, // K
    { header: "Tenure", key: "tenure", width: 10 }, // L
    { header: "Start date", key: "startDate", width: 15 }, // M
    { header: "End date", key: "endDate", width: 15 }, // N
    { header: "EMI Amount", key: "emiAmount", width: 12 }, // O
    { header: "Overdue Amount", key: "overdueAmount", width: 15 }, // P
    { header: "Remaining Tenure", key: "remainingTenure", width: 18 }, // Q
    { header: "Remaining Principal", key: "remainingPrincipal", width: 20 }, // R
    { header: "Name", key: "name", width: 25 }, // S
    { header: "Mobile", key: "mobile", width: 15 }, // T
    { header: "Vehicle No.", key: "vehicleNo", width: 18 }, // U
    { header: "Model", key: "model", width: 15 }, // V
    { header: "Type of Vehicle", key: "typeOfVehicle", width: 18 }, // W
    { header: "Chassis Number", key: "chassisNumber", width: 20 }, // X
    { header: "Engine Number", key: "engineNumber", width: 20 }, // Y
    { header: "Board", key: "board", width: 10 }, // Z
    { header: "Dealer Name", key: "dealerName", width: 20 }, // AA
    { header: "Dealer Number", key: "dealerNumber", width: 15 }, // AB
    { header: "FC Date", key: "fcDate", width: 15 }, // AC
    { header: "Insurance Date", key: "insuranceDate", width: 15 }, // AD
    { header: "HP Entry", key: "hpEntry", width: 15 }, // AE
    { header: "Doc Checklist", key: "docChecklist", width: 20 }, // AF
    { header: "Address", key: "address", width: 35 }, // AG
    { header: "Paid counter", key: "paidCounter", width: 15 }, // AH
    { header: "Next Pay date", key: "nextPayDate", width: 15 }, // AI
    { header: "Client Response", key: "clientResponse", width: 25 }, // AJ
    { header: "Remarks", key: "remarks", width: 25 }, // AK
    { header: "Total amount collected", key: "totalCollected", width: 22 }, // AL
    { header: "UPDATEED BY", key: "updatedBy", width: 20 }, // AM
  ];

  // Add Data Rows
  loans.forEach((loan, index) => {
    const stats = loan.repaymentStats || {};

    // Combine Name and Mobiles for Column G
    const primaryMobile = loan.customerDetails.mobileNumbers?.[0] || "";
    const guarantorMobile =
      loan.customerDetails.guarantorMobileNumbers?.[0] || "";
    const combinedMobile =
      `${loan.customerDetails.customerName} ${primaryMobile} Ref: ${guarantorMobile}`.trim();

    worksheet.addRow({
      siNo: index + 1,
      loanNumber: loan.loanTerms.loanNumber,
      colC: "",
      colD: "",
      colE: "",
      colF: "",
      mobileCombined: combinedMobile,
      amount: loan.loanTerms.principalAmount || 0,
      interestRate: loan.loanTerms.annualInterestRate || 0,
      processingFee: loan.loanTerms.processingFee || 0,
      tenureType: loan.loanTerms.tenureType,
      tenure: loan.loanTerms.tenureMonths || 0,
      startDate: loan.loanTerms.dateLoanDisbursed
        ? new Date(loan.loanTerms.dateLoanDisbursed).toLocaleDateString("en-IN")
        : "",
      endDate: loan.loanTerms.emiEndDate
        ? new Date(loan.loanTerms.emiEndDate).toLocaleDateString("en-IN")
        : "",
      emiAmount: loan.loanTerms.monthlyEMI || 0,
      overdueAmount: stats.overdueAmount || 0,
      remainingTenure: stats.remainingTenure || 0,
      remainingPrincipal: stats.remainingPrincipal || 0,
      name: loan.customerDetails.customerName,
      mobile: primaryMobile,
      vehicleNo: loan.vehicleInformation.vehicleNumber,
      model: loan.vehicleInformation.model,
      typeOfVehicle: loan.vehicleInformation.typeOfVehicle,
      chassisNumber: loan.vehicleInformation.chassisNumber,
      engineNumber: loan.vehicleInformation.engineNumber,
      board: loan.vehicleInformation.ywBoard,
      dealerName: loan.vehicleInformation.dealerName,
      dealerNumber: loan.vehicleInformation.dealerNumber,
      fcDate: loan.vehicleInformation.fcDate
        ? new Date(loan.vehicleInformation.fcDate).toLocaleDateString("en-IN")
        : "",
      insuranceDate: loan.vehicleInformation.insuranceDate
        ? new Date(loan.vehicleInformation.insuranceDate).toLocaleDateString(
            "en-IN",
          )
        : "",
      hpEntry: loan.vehicleInformation.hpEntry || "Not done",
      docChecklist: loan.status.docChecklist,
      address: loan.customerDetails.address,
      paidCounter: stats.paidEmisCount || 0,
      nextPayDate: stats.nextEmiDueDate
        ? new Date(stats.nextEmiDueDate).toLocaleDateString("en-IN")
        : "N/A",
      clientResponse: loan.status.clientResponse,
      remarks: loan.status.remarks,
      totalCollected: stats.totalCollected || 0,
      updatedBy:
        typeof loan.status.updatedBy === "object"
          ? loan.status.updatedBy?.name
          : loan.status.updatedBy,
    });
  });

  // Style Header
  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E3A8A" }, // Professional Deep Blue
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // Style all data rows
  worksheet.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.font = { size: 9 };

      // Number formatting for amount columns
      const amountCols = ["H", "J", "O", "P", "R", "AL"];
      if (amountCols.includes(cell.address.replace(/[0-9]/g, ""))) {
        cell.numFmt = "#,##0.00";
      }
    });
  });

  // Generate and Save File
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), filename);
};
