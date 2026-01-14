import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const exportLoansToExcel = async (loans, filename = 'Loans_Report.xlsx') => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Loans Profile');

  // Define Columns
  worksheet.columns = [
    { header: 'SI No', key: 'siNo', width: 8 },
    { header: 'Loan Number', key: 'loanNumber', width: 15 },
    { header: 'Customer Name', key: 'customerName', width: 25 },
    { header: 'Address', key: 'address', width: 30 },
    { header: 'Own/Rent', key: 'ownRent', width: 12 },
    { header: 'Mobile Number', key: 'mobileNumber', width: 15 },
    { header: 'PAN Number', key: 'panNumber', width: 15 },
    { header: 'Aadhar Number', key: 'aadharNumber', width: 18 },
    { header: 'Principal Amount', key: 'principalAmount', width: 18 }, // Column I
    { header: 'Processing Fee Rate (%)', key: 'processingFeeRate', width: 22 }, // Column J
    { header: 'Processing Fee', key: 'processingFee', width: 18 }, // Column K
    { header: 'Tenure Type', key: 'tenureType', width: 12 }, // Column L
    { header: 'Tenure (Months)', key: 'tenureMonths', width: 15 }, // Column M
    { header: 'Interest Rate (%)', key: 'annualInterestRate', width: 18 }, // Column N
    { header: 'Date Loan Disbursed', key: 'dateLoanDisbursed', width: 20 },
    { header: 'EMI Start Date', key: 'emiStartDate', width: 20 },
    { header: 'EMI End Date', key: 'emiEndDate', width: 20 },
    { header: 'Monthly EMI', key: 'monthlyEMI', width: 18 }, // Column R
    { header: 'Total Interest Amount', key: 'totalInterestAmount', width: 22 }, // Column S
    { header: 'Vehicle Number', key: 'vehicleNumber', width: 18 },
    { header: 'Chassis Number', key: 'chassisNumber', width: 20 },
    { header: 'Model', key: 'model', width: 15 },
    { header: 'Type of Vehicle', key: 'typeOfVehicle', width: 15 },
    { header: 'Board (Y/W)', key: 'ywBoard', width: 12 },
    { header: 'Doc Checklist', key: 'docChecklist', width: 25 },
    { header: 'Dealer Name', key: 'dealerName', width: 20 },
    { header: 'Dealer Number', key: 'dealerNumber', width: 15 },
    { header: 'HP Entry', key: 'hpEntry', width: 12 },
    { header: 'FC Date', key: 'fcDate', width: 15 },
    { header: 'Insurance Date', key: 'insuranceDate', width: 15 },
    { header: 'RTO Work Pending', key: 'rtoWorkPending', width: 20 },
    { header: 'Status', key: 'isSeized', width: 12 }
  ];

  // Add Data Rows
  loans.forEach((loan, index) => {
    const rowNumber = index + 2; // +1 for 1-based, +1 for header
    const row = worksheet.addRow({
      siNo: index + 1,
      loanNumber: loan.loanNumber,
      customerName: loan.customerName,
      address: loan.address,
      ownRent: loan.ownRent,
      mobileNumber: loan.mobileNumber,
      panNumber: loan.panNumber,
      aadharNumber: loan.aadharNumber,
      principalAmount: loan.principalAmount || 0,
      processingFeeRate: loan.processingFeeRate || 0,
      processingFee: loan.processingFee || 0,
      tenureType: loan.tenureType,
      tenureMonths: loan.tenureMonths || 0,
      annualInterestRate: loan.annualInterestRate || 0,
      dateLoanDisbursed: loan.dateLoanDisbursed ? new Date(loan.dateLoanDisbursed).toLocaleDateString() : '',
      emiStartDate: loan.emiStartDate ? new Date(loan.emiStartDate).toLocaleDateString() : '',
      emiEndDate: loan.emiEndDate ? new Date(loan.emiEndDate).toLocaleDateString() : '',
      monthlyEMI: loan.monthlyEMI || 0,
      totalInterestAmount: loan.totalInterestAmount || 0,
      vehicleNumber: loan.vehicleNumber,
      chassisNumber: loan.chassisNumber,
      model: loan.model,
      typeOfVehicle: loan.typeOfVehicle,
      ywBoard: loan.ywBoard,
      docChecklist: loan.docChecklist,
      dealerName: loan.dealerName,
      dealerNumber: loan.dealerNumber,
      hpEntry: loan.hpEntry,
      fcDate: loan.fcDate ? new Date(loan.fcDate).toLocaleDateString() : '',
      insuranceDate: loan.insuranceDate ? new Date(loan.insuranceDate).toLocaleDateString() : '',
      rtoWorkPending: loan.rtoWorkPending,
      isSeized: loan.isSeized ? 'Seized' : 'Active'
    });

    // Add Dynamic Formulas
    // Processing Fee: Principal * Rate / 100
    row.getCell('K').value = { formula: `I${rowNumber}*J${rowNumber}/100`, result: loan.processingFee };
    
    // Monthly EMI (Standard formula in Excel: Principal * (Rate/12/100) * (1+(Rate/12/100))^Tenure / ((1+(Rate/12/100))^Tenure - 1))
    // Excel PMT function is easier: ROUND(PMT(Rate/12/100, Tenure, -Principal), 2)
    row.getCell('R').value = { 
      formula: `IF(AND(I${rowNumber}>0, M${rowNumber}>0), ROUND(PMT(N${rowNumber}/12/100, M${rowNumber}, -I${rowNumber}), 2), 0)`,
      result: loan.monthlyEMI 
    };

    // Total Interest Amount: (EMI * Tenure) - Principal
    row.getCell('S').value = { 
      formula: `IF(AND(R${rowNumber}>0, M${rowNumber}>0), (R${rowNumber}*M${rowNumber})-I${rowNumber}, 0)`,
      result: loan.totalInterestAmount 
    };
  });

  // Style Header
  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' } // Professional Deep Blue
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // Style all data rows
  worksheet.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { vertical: 'middle' };
    });
  });

  // Generate and Save File
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), filename);
};
