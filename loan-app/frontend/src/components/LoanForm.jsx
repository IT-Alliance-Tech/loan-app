"use client";
import { useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useToast } from "../context/ToastContext";
import { calculateEMI as fetchEMI } from "../services/loan.service";

const validationSchema = Yup.object().shape({
  loanNumber: Yup.string().required("Loan number is required"),
  customerName: Yup.string().required("Customer name is required"),
  address: Yup.string().required("Address is required"),
  ownRent: Yup.string().required("Please select ownership status"),
  mobileNumber: Yup.string()
    .matches(
      /^[6-9]\d{9}$/,
      "Invalid Mobile Number. Must be 10 digits starting with 6-9.",
    )
    .required("Mobile number is required"),
  panNumber: Yup.string()
    .matches(
      /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
      "Invalid PAN format (e.g., ABCDE1234F)",
    )
    .nullable(),
  aadharNumber: Yup.string()
    .matches(/^\d{12}$/, "Invalid Aadhar. Must be 12 digits")
    .nullable(),
  principalAmount: Yup.number()
    .positive("Must be positive")
    .required("Principal is required"),
  processingFeeRate: Yup.number().min(0).nullable(),
  processingFee: Yup.number().min(0).nullable(),
  tenureType: Yup.string().required("Tenure type is required"),
  tenureMonths: Yup.number()
    .positive("Must be positive")
    .integer()
    .required("Tenure is required"),
  annualInterestRate: Yup.number()
    .min(0, "Interest cannot be negative")
    .required("Interest rate is required"),
  vehicleNumber: Yup.string()
    .matches(/^[A-Z]{2}-\d{2}-[A-Z]{1,2}-\d{4}$/, "Format: KA-01-AB-1234")
    .nullable(),
});

const LoanForm = ({
  initialData,
  onSubmit,
  onCancel,
  isViewOnly,
  submitting,
  renderExtraActions,
}) => {
  const { showToast } = useToast();

  const formik = useFormik({
    initialValues: initialData,
    validationSchema,
    enableReinitialize: true,
    onSubmit: (values) => {
      onSubmit(values);
    },
  });

  // Auto-format Vehicle Number: KA01TH8520 -> KA-01-TH-8520
  const formatVehicleNumber = (val) => {
    let clean = val.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    let parts = [];

    // Pattern: 2 chars - 2 digits - 1 or 2 chars - 4 digits
    if (clean.length > 0) parts.push(clean.substring(0, 2));
    if (clean.length > 2)
      parts.push(clean.substring(2, 4).replace(/[^0-9]/g, ""));
    if (clean.length > 4) {
      let remaining = clean.substring(4);
      let digitMatch = remaining.match(/\d/);
      if (digitMatch) {
        let digitIdx = remaining.indexOf(digitMatch[0]);
        parts.push(remaining.substring(0, digitIdx).replace(/[^A-Z]/g, ""));
        parts.push(
          remaining.substring(digitIdx, digitIdx + 4).replace(/[^0-9]/g, ""),
        );
      } else {
        parts.push(remaining.replace(/[^A-Z]/g, ""));
      }
    }
    return parts.filter((p) => p.length > 0).join("-");
  };

  const handleProcessingFeeRateChange = (rate) => {
    formik.setFieldValue("processingFeeRate", rate);
    const principal = parseFloat(formik.values.principalAmount) || 0;
    if (principal && !isNaN(rate)) {
      const fee = ((principal * parseFloat(rate)) / 100).toFixed(2);
      formik.setFieldValue("processingFee", fee);
    }
  };

  const handleProcessingFeeChange = (fee) => {
    formik.setFieldValue("processingFee", fee);
    const principal = parseFloat(formik.values.principalAmount) || 0;
    if (principal && !isNaN(fee)) {
      const rate = ((parseFloat(fee) / principal) * 100).toFixed(2);
      formik.setFieldValue("processingFeeRate", rate);
    }
  };

  // Auto-calculate EMI from backend
  useEffect(() => {
    const principal = parseFloat(formik.values.principalAmount);
    const rate = parseFloat(formik.values.annualInterestRate);
    const tenure = parseInt(formik.values.tenureMonths);

    if (principal && rate && tenure) {
      const getEMI = async () => {
        try {
          const res = await fetchEMI({
            principalAmount: principal,
            annualInterestRate: rate,
            tenureMonths: tenure,
          });
          if (res.data && res.data.emi) {
            formik.setFieldValue("monthlyEMI", res.data.emi);
            const totalInt = principal * (rate / 100) * tenure;
            formik.setFieldValue("totalInterestAmount", totalInt.toFixed(2));
          }
        } catch (err) {
          console.error("Failed to fetch EMI", err);
        }
      };
      getEMI();
    } else {
      formik.setFieldValue("monthlyEMI", 0);
      formik.setFieldValue("totalInterestAmount", 0);
    }
  }, [
    formik.values.principalAmount,
    formik.values.annualInterestRate,
    formik.values.tenureMonths,
  ]);

  // Auto-calculate EMI Start and End Dates
  useEffect(() => {
    const disbursementDate = formik.values.dateLoanDisbursed;
    const tenure = parseInt(formik.values.tenureMonths);

    if (disbursementDate) {
      const d = new Date(disbursementDate);

      // EMI Start Date = Disbursement Date + 1 Month
      const startDate = new Date(d);
      startDate.setMonth(startDate.getMonth() + 1);
      formik.setFieldValue(
        "emiStartDate",
        startDate.toISOString().split("T")[0],
      );

      // EMI End Date = Disbursement Date + Tenure Months
      if (tenure) {
        const endDate = new Date(d);
        endDate.setMonth(endDate.getMonth() + tenure);
        formik.setFieldValue("emiEndDate", endDate.toISOString().split("T")[0]);
      }
    }
  }, [formik.values.dateLoanDisbursed, formik.values.tenureMonths]);

  const ErrorMsg = ({ name }) => {
    return formik.touched[name] && formik.errors[name] ? (
      <p className="text-[9px] font-bold text-red-500 mt-1 uppercase tracking-wider">
        {formik.errors[name]}
      </p>
    ) : null;
  };

  const getFieldClass = (name) => {
    const baseClass =
      "w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 transition-all ";
    const stateClass =
      formik.touched[name] && formik.errors[name]
        ? "border-red-300 text-red-900 focus:ring-red-100 placeholder:text-red-200"
        : "border-slate-200 text-slate-700 focus:ring-primary/20 placeholder:text-slate-300";
    return baseClass + stateClass;
  };

  return (
    <div className="bg-white w-full max-w-4xl mx-auto rounded-3xl shadow-sm overflow-hidden border border-slate-200 flex flex-col">
      <div className="p-8">
        <form onSubmit={formik.handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] border-b border-primary/10 pb-2">
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Loan Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="loanNumber"
                  value={formik.values.loanNumber || ""}
                  onChange={(e) =>
                    formik.setFieldValue(
                      "loanNumber",
                      e.target.value.toUpperCase(),
                    )
                  }
                  onBlur={formik.handleBlur}
                  readOnly={isViewOnly}
                  className={getFieldClass("loanNumber") + " uppercase"}
                  placeholder="LN-001"
                />
                <ErrorMsg name="loanNumber" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="customerName"
                  value={formik.values.customerName || ""}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  readOnly={isViewOnly}
                  className={getFieldClass("customerName")}
                  placeholder="Full Name"
                />
                <ErrorMsg name="customerName" />
              </div>
            </div>
          </div>

          {/* Customer Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] border-b border-primary/10 pb-2">
              Customer Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Current Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="address"
                  value={formik.values.address || ""}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  readOnly={isViewOnly}
                  rows="2"
                  className={getFieldClass("address")}
                ></textarea>
                <ErrorMsg name="address" />
              </div>
              <div className="grid grid-cols-2 gap-6 md:col-span-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Own/Rent <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="ownRent"
                    value={formik.values.ownRent || ""}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    disabled={isViewOnly}
                    className={getFieldClass("ownRent")}
                  >
                    <option value="Own">Own</option>
                    <option value="Rent">Rent</option>
                  </select>
                  <ErrorMsg name="ownRent" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="mobileNumber"
                    maxLength={10}
                    value={formik.values.mobileNumber || ""}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      if (val.length <= 10)
                        formik.setFieldValue("mobileNumber", val);
                    }}
                    onBlur={formik.handleBlur}
                    readOnly={isViewOnly}
                    className={getFieldClass("mobileNumber")}
                    placeholder="10 digit number"
                  />
                  <ErrorMsg name="mobileNumber" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6 md:col-span-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    PAN Number
                  </label>
                  <input
                    type="text"
                    name="panNumber"
                    maxLength={10}
                    value={formik.values.panNumber || ""}
                    onChange={(e) =>
                      formik.setFieldValue(
                        "panNumber",
                        e.target.value.toUpperCase(),
                      )
                    }
                    onBlur={formik.handleBlur}
                    readOnly={isViewOnly}
                    className={getFieldClass("panNumber") + " uppercase"}
                    placeholder="ABCDE1234F"
                  />
                  <ErrorMsg name="panNumber" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Aadhar Number
                  </label>
                  <input
                    type="text"
                    name="aadharNumber"
                    maxLength={12}
                    value={formik.values.aadharNumber || ""}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      if (val.length <= 12)
                        formik.setFieldValue("aadharNumber", val);
                    }}
                    onBlur={formik.handleBlur}
                    readOnly={isViewOnly}
                    className={getFieldClass("aadharNumber")}
                    placeholder="12 digit number"
                  />
                  <ErrorMsg name="aadharNumber" />
                </div>
              </div>
            </div>
          </div>

          {/* Loan Terms */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] border-b border-primary/10 pb-2">
              Loan Terms
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                    ₹
                  </span>
                  <input
                    type="number"
                    name="principalAmount"
                    value={formik.values.principalAmount || ""}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    readOnly={isViewOnly}
                    className={getFieldClass("principalAmount") + " pl-8 pr-4"}
                  />
                </div>
                <ErrorMsg name="principalAmount" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Processing Fee Rate (%)
                </label>
                <input
                  type="number"
                  name="processingFeeRate"
                  value={formik.values.processingFeeRate || ""}
                  onChange={(e) =>
                    handleProcessingFeeRateChange(e.target.value)
                  }
                  onBlur={formik.handleBlur}
                  readOnly={isViewOnly}
                  className={getFieldClass("processingFeeRate")}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Processing Fee
                </label>
                <input
                  type="number"
                  name="processingFee"
                  value={formik.values.processingFee || ""}
                  onChange={(e) => handleProcessingFeeChange(e.target.value)}
                  onBlur={formik.handleBlur}
                  readOnly={isViewOnly}
                  className={
                    getFieldClass("processingFee") +
                    (isViewOnly ? " bg-slate-100 italic" : "")
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Tenure Type <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value="Monthly"
                  readOnly
                  className={getFieldClass("tenureType") + " bg-slate-100"}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Tenure (Months) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="tenureMonths"
                  value={formik.values.tenureMonths || ""}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  readOnly={isViewOnly}
                  className={getFieldClass("tenureMonths")}
                />
                <ErrorMsg name="tenureMonths" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Interest Rate (%) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="annualInterestRate"
                  value={formik.values.annualInterestRate || ""}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  readOnly={isViewOnly}
                  className={getFieldClass("annualInterestRate")}
                />
                <ErrorMsg name="annualInterestRate" />
              </div>
            </div>
          </div>

          {/* Dates & EMI */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] border-b border-primary/10 pb-2">
              Dates & EMI
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Date Loan Disbursed
                </label>
                <input
                  type="date"
                  name="dateLoanDisbursed"
                  value={formik.values.dateLoanDisbursed || ""}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  readOnly={isViewOnly}
                  className={getFieldClass("dateLoanDisbursed")}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  EMI Start Date
                </label>
                <input
                  type="date"
                  name="emiStartDate"
                  value={formik.values.emiStartDate || ""}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  readOnly={isViewOnly}
                  className={getFieldClass("emiStartDate")}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  EMI End Date
                </label>
                <input
                  type="date"
                  name="emiEndDate"
                  value={formik.values.emiEndDate || ""}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  readOnly={isViewOnly}
                  className={getFieldClass("emiEndDate")}
                />
              </div>
              <div className="md:col-span-3">
                <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                      Monthly EMI
                    </span>
                    <p className="text-xl font-black text-primary">
                      ₹{formik.values.monthlyEMI || 0}
                    </p>
                  </div>
                  <div className="text-right">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                      Total Interest Amount
                    </label>
                    <input
                      type="number"
                      name="totalInterestAmount"
                      value={formik.values.totalInterestAmount || ""}
                      readOnly
                      className="bg-transparent border-b border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:border-primary text-right w-32"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Vehicle Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] border-b border-primary/10 pb-2">
              Vehicle Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Vehicle Number
                </label>
                <input
                  type="text"
                  name="vehicleNumber"
                  value={formik.values.vehicleNumber || ""}
                  onChange={(e) =>
                    formik.setFieldValue(
                      "vehicleNumber",
                      formatVehicleNumber(e.target.value),
                    )
                  }
                  onBlur={formik.handleBlur}
                  readOnly={isViewOnly}
                  className={getFieldClass("vehicleNumber") + " uppercase"}
                  placeholder="KA-01-AB-1234"
                />
                <ErrorMsg name="vehicleNumber" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Chassis Number
                </label>
                <input
                  type="text"
                  name="chassisNumber"
                  value={formik.values.chassisNumber || ""}
                  onChange={(e) =>
                    formik.setFieldValue(
                      "chassisNumber",
                      e.target.value.toUpperCase(),
                    )
                  }
                  onBlur={formik.handleBlur}
                  readOnly={isViewOnly}
                  className={getFieldClass("chassisNumber") + " uppercase"}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Model
                </label>
                <input
                  type="text"
                  name="model"
                  value={formik.values.model || ""}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  readOnly={isViewOnly}
                  className={getFieldClass("model")}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Type of Vehicle
                </label>
                <input
                  type="text"
                  name="typeOfVehicle"
                  value={formik.values.typeOfVehicle || ""}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  readOnly={isViewOnly}
                  className={getFieldClass("typeOfVehicle")}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Board (Yellow/White)
                </label>
                <select
                  name="ywBoard"
                  value={formik.values.ywBoard || ""}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  disabled={isViewOnly}
                  className={getFieldClass("ywBoard")}
                >
                  <option value="Yellow">Yellow</option>
                  <option value="White">White</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Dealer Name
                </label>
                <input
                  type="text"
                  name="dealerName"
                  value={formik.values.dealerName || ""}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  readOnly={isViewOnly}
                  className={getFieldClass("dealerName")}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Dealer Number
                </label>
                <input
                  type="text"
                  name="dealerNumber"
                  value={formik.values.dealerNumber || ""}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  readOnly={isViewOnly}
                  className={getFieldClass("dealerNumber")}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  HP Entry
                </label>
                <select
                  name="hpEntry"
                  value={formik.values.hpEntry || ""}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  disabled={isViewOnly}
                  className={getFieldClass("hpEntry")}
                >
                  <option value="Not done">Not done</option>
                  <option value="Done">Done</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  FC Date
                </label>
                <input
                  type="date"
                  name="fcDate"
                  value={formik.values.fcDate || ""}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  readOnly={isViewOnly}
                  className={getFieldClass("fcDate")}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Insurance Date
                </label>
                <input
                  type="date"
                  name="insuranceDate"
                  value={formik.values.insuranceDate || ""}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  readOnly={isViewOnly}
                  className={getFieldClass("insuranceDate")}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  RTO Work Pending
                </label>
                <input
                  type="text"
                  name="rtoWorkPending"
                  value={formik.values.rtoWorkPending || ""}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  readOnly={isViewOnly}
                  className={getFieldClass("rtoWorkPending")}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-6">
            <div>{renderExtraActions && renderExtraActions()}</div>
            <div className="flex gap-4">
              {isViewOnly ? (
                <button
                  type="button"
                  onClick={onCancel}
                  className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all"
                >
                  Back to List
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onCancel}
                    className="px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      submitting || (formik.submitCount > 0 && !formik.isValid)
                    }
                    className="bg-primary text-white px-10 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 transition-all"
                  >
                    {submitting
                      ? "Processing..."
                      : initialData._id
                        ? "Commit Changes"
                        : "Create Profile"}
                  </button>
                </>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoanForm;
