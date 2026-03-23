import React, { useEffect, useRef } from "react";
import { addDays, format } from "date-fns";
import { useFormik } from "formik";
import * as Yup from "yup";
import { getUserFromToken } from "../utils/auth";
import ClientResponseSection from "./ClientResponseSection";
import { checkLoanNumberUniqueness } from "../services/loan.service";

const ErrorMsg = ({ name, touched, errors }) => {
  const [section, field] = name.includes(".") ? name.split(".") : [null, name];
  const isTouched = section ? touched[section]?.[field] : touched[field];
  const error = section ? errors[section]?.[field] : errors[field];

  return isTouched && error ? (
    <p className="text-[9px] font-bold text-red-500 mt-1 uppercase tracking-wider">
      {error}
    </p>
  ) : null;
};

const _loanUniquenessCache = new Map();

const WeeklyLoanForm = ({
  initialData,
  onSubmit,
  onCancel,
  submitting,
  isViewOnly = false,
}) => {
  const user = getUserFromToken();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const validationSchema = Yup.object().shape({
    loanNumber: Yup.string()
      .required("Loan number is required")
      .test("unique-loan-number", "Loan number already exists", async (value) => {
        if (!value || isViewOnly) return true;
        // If editing and same as initial, skip
        if (initialData?.loanNumber === value) return true;

        if (_loanUniquenessCache.has(value)) {
          return _loanUniquenessCache.get(value);
        }

        try {
          const res = await checkLoanNumberUniqueness(value);
          _loanUniquenessCache.set(value, res.data.available);
          return res.data.available;
        } catch (err) {
          return true; 
        }
      }),
    customerName: Yup.string().nullable(),
    mobileNumbers: Yup.array()
      .of(
        Yup.string()
          .matches(/^(?:[6-9]\d{9})?$/, "Invalid mobile number")
      )
      .nullable(),
    disbursementAmount: Yup.number().transform((value, originalValue) => originalValue === "" ? null : value).nullable(),
    totalEmis: Yup.number()
      .transform((value, originalValue) => originalValue === "" ? null : value)
      .integer("Tenure must be an integer")
      .nullable(),
    startDate: Yup.string().nullable(),
    dateLoanDisbursed: Yup.string().nullable(),
    emiStartDate: Yup.string().nullable(),
    guarantorName: Yup.string().nullable(),
    guarantorMobileNumbers: Yup.array().of(
      Yup.string().matches(/^(?:[6-9]\d{9})?$/, "Invalid mobile number"),
    ).nullable(),
  });

  const initialValues = {
    ...initialData,
    mobileNumbers: Array.isArray(initialData?.mobileNumbers) 
      ? initialData.mobileNumbers 
      : initialData?.mobileNumber 
        ? [initialData.mobileNumber] 
        : [""],
    guarantorMobileNumbers: Array.isArray(initialData?.guarantorMobileNumbers)
      ? initialData.guarantorMobileNumbers
      : initialData?.guarantorMobileNumber
        ? [initialData.guarantorMobileNumber]
        : [],
    clientResponse: initialData?.clientResponse || "",
    nextFollowUpDate: initialData?.nextFollowUpDate || "",
    status: initialData?.status || "Active",
    emiEndDate: initialData?.emiEndDate || "",
    dateLoanDisbursed: initialData?.dateLoanDisbursed || initialData?.startDate || "",
  };

  const formik = useFormik({
    initialValues,
    validationSchema,
    validateOnChange: true,
    validateOnBlur: true,
    enableReinitialize: true,
    onSubmit: (values) => {
      onSubmit({
        ...values,
        emiAmount,
        processingFee,
        remainingEmis,
        totalAmount,
        totalCollected,
        nextEmiDate,
        emiEndDate: values.emiEndDate,
        remainingPrincipalAmount,
      });
    },
  });

  const { values, setFieldValue, errors, touched, handleBlur } = formik;

  const lastDisbursementDate = useRef(values.startDate);

  // Auto-set EMI Start Date only when Disbursement Date explicitly changes
  useEffect(() => {
    if (values.dateLoanDisbursed && values.dateLoanDisbursed !== lastDisbursementDate.current) {
      const disbursementDate = new Date(values.dateLoanDisbursed);
      if (!isNaN(disbursementDate.getTime())) {
        const autoEmiStart = format(addDays(disbursementDate, 7), "yyyy-MM-dd");
        if (values.emiStartDate !== autoEmiStart) {
          setFieldValue("emiStartDate", autoEmiStart);
        }
        // Also sync startDate for backend compatibility
        setFieldValue("startDate", values.dateLoanDisbursed);
        lastDisbursementDate.current = values.dateLoanDisbursed;
      }
    }
  }, [values.dateLoanDisbursed, setFieldValue, values.emiStartDate]);

  // Auto-calculate EMI End Date from Start Date & Tenure
  useEffect(() => {
    const totalWeeks = parseInt(values.totalEmis);
    if (values.emiStartDate && totalWeeks > 0) {
      const d = new Date(values.emiStartDate);
      if (!isNaN(d.getTime())) {
        const endDate = addDays(d, (totalWeeks - 1) * 7);
        const formattedEnd = format(endDate, "yyyy-MM-dd");
        if (values.emiEndDate !== formattedEnd) {
          setFieldValue("emiEndDate", formattedEnd);
        }
      }
    } else if (values.emiEndDate !== "") {
      setFieldValue("emiEndDate", "");
    }
  }, [values.emiStartDate, values.totalEmis, setFieldValue, values.emiEndDate]);

  // Auto-calculations (Derived State)
  const amount = parseFloat(values.disbursementAmount) || 0;
  const totalWeeks = parseInt(values.totalEmis) || 0;
  const paidWeeks = parseInt(values.paidEmis) || 0;
  const feeRate = parseFloat(values.processingFeeRate) || 10;
  const eStartDate = values.emiStartDate ? new Date(values.emiStartDate) : null;

  // Processing Fee
  const processingFee = (amount * (feeRate / 100)).toFixed(2);

  // Weekly Principal Calculation (No Interest) - Round Up
  const emiAmount = totalWeeks > 0 ? Math.ceil(amount / totalWeeks) : 0;

  const totalAmount = (emiAmount * paidWeeks).toFixed(2);
  const totalCollected = (
    parseFloat(totalAmount) + parseFloat(processingFee)
  ).toFixed(2);
  const remainingEmis = totalWeeks - paidWeeks;
  const remainingPrincipalAmount = (
    amount -
    emiAmount * paidWeeks
  ).toFixed(2);

  const nextEmiDate =
    eStartDate && !isNaN(eStartDate.getTime())
      ? format(addDays(eStartDate, paidWeeks * 7), "yyyy-MM-dd")
      : "";

  const isEditMode = !!values?._id;

  const getFieldClass = (name, index = null) => {
    let isTouched, error;
    if (index !== null) {
      isTouched = touched[name]?.[index];
      error = errors[name]?.[index];
    } else {
      const [section, field] = name.includes(".")
        ? name.split(".")
        : [null, name];
      isTouched = section ? touched[section]?.[field] : touched[field];
      error = section ? errors[section]?.[field] : errors[field];
    }

    const baseClass =
      "w-full bg-slate-50 border rounded-2xl px-5 py-4 text-sm font-bold transition-all placeholder:text-slate-300 disabled:opacity-70 focus:outline-none focus:ring-2 ";
    const stateClass =
      isTouched && error
        ? "border-red-300 text-red-900 focus:ring-red-100 placeholder:text-red-200"
        : "border-transparent text-slate-700 focus:ring-primary/20";
    return baseClass + stateClass;
  };

  return (
    <form
      onSubmit={formik.handleSubmit}
      className="space-y-8 animate-in fade-in duration-500 pb-20"
    >
      {/* Customer Info */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 relative">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 md:pb-2 border-b border-primary/10">
          <h2 className="text-lg md:text-xl font-black text-slate-900 flex items-center gap-2 md:gap-3 uppercase tracking-tight">
            <span className="w-8 h-8 md:w-10 md:h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center text-base md:text-lg">
              👤
            </span>
            Customer & Basic Info
          </h2>

          <div className="flex items-center gap-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Status
            </label>
            <select
              name="status"
              value={values.status || "Active"}
              onChange={formik.handleChange}
              onBlur={handleBlur}
              disabled={isViewOnly || !isSuperAdmin}
              className={`text-[11px] font-bold uppercase tracking-widest py-1 px-3 border rounded-lg focus:outline-none ${isViewOnly || !isSuperAdmin ? "opacity-70 bg-slate-100 cursor-not-allowed text-slate-500" : "bg-white border-primary/30 text-primary shadow-sm focus:ring-2 focus:ring-primary/20"}`}
            >
              <option value="Active">Active</option>
              <option value="Closed">Closed</option>
              <option value="Seized">Seized</option>
              <option value="Pending">Pending</option>
            </select>
          </div>

          <div className="w-full md:w-auto min-w-[150px] flex justify-start md:justify-end">
            {values.updatedBy && (
              <div className="flex flex-col items-start md:items-end pointer-events-none">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">
                  Last Updated By
                </span>
                <div className="flex items-center gap-2 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <span className="text-[10px] font-black text-red-500 uppercase tracking-tight">
                    {typeof values.updatedBy === "string"
                      ? values.updatedBy
                      : values.updatedBy.name}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-red-500/40" />
                  <span className="text-[9px] font-bold text-slate-400 font-mono">
                    {values.updatedAt &&
                      format(new Date(values.updatedAt), "dd/MM/yy HH:mm")}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
              Loan Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="loanNumber"
              value={values.loanNumber || ""}
              onChange={formik.handleChange}
              onBlur={handleBlur}
              disabled={isViewOnly}
              className={getFieldClass("loanNumber")}
              placeholder="Enter Loan Number"
            />
            <ErrorMsg touched={touched} errors={errors} name="loanNumber" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
              Customer Name
            </label>
            <input
              type="text"
              name="customerName"
              value={values.customerName || ""}
              onChange={formik.handleChange}
              onBlur={handleBlur}
              disabled={isViewOnly}
              className={getFieldClass("customerName")}
              placeholder="Enter Customer Name"
            />
            <ErrorMsg touched={touched} errors={errors} name="customerName" />
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                MOBILE NUMBERS
              </label>
            </div>
            <div className="flex flex-col gap-4">
              {values.mobileNumbers.map((num, idx) => (
                <div key={idx} className="relative flex items-center gap-3 group">
                  <div className="flex-1">
                    <input
                      type="text"
                      name={`mobileNumbers[${idx}]`}
                      value={num || ""}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setFieldValue(`mobileNumbers[${idx}]`, val);
                      }}
                      onBlur={handleBlur}
                      disabled={isViewOnly}
                      maxLength={10}
                      className={getFieldClass("mobileNumbers", idx)}
                      placeholder={idx === 0 ? "Primary Mobile Member" : `Alternative Number ${idx}`}
                    />
                    {touched.mobileNumbers?.[idx] && errors.mobileNumbers?.[idx] && (
                      <p className="text-[9px] font-bold text-red-500 mt-1 uppercase tracking-wider ml-1">
                        {errors.mobileNumbers[idx]}
                      </p>
                    )}
                  </div>
                  {!isViewOnly && idx > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newNums = values.mobileNumbers.filter((_, i) => i !== idx);
                        setFieldValue("mobileNumbers", newNums);
                      }}
                      className="flex-none p-2 text-red-400 hover:text-red-600 transition-colors"
                      title="Remove number"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              {!isViewOnly && (
                <button
                  type="button"
                  onClick={() => setFieldValue("mobileNumbers", [...values.mobileNumbers, ""])}
                  className="flex items-center gap-2 text-[11px] font-black text-primary uppercase hover:opacity-80 transition-all w-fit px-1 py-1"
                >
                  <span className="text-lg">+</span> ADD CONTACT NUMBER
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
              Guarantor Name
            </label>
            <input
              type="text"
              name="guarantorName"
              value={values.guarantorName || ""}
              onChange={formik.handleChange}
              onBlur={handleBlur}
              disabled={isViewOnly}
              className={getFieldClass("guarantorName")}
              placeholder="Enter Guarantor Name"
            />
            <ErrorMsg touched={touched} errors={errors} name="guarantorName" />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                GUARANTOR MOBILE NUMBERS
              </label>
            </div>
            <div className="flex flex-col gap-4 max-w-2xl">
              {values.guarantorMobileNumbers.map((num, idx) => (
                <div key={idx} className="relative flex items-center gap-3 group">
                  <div className="flex-1">
                    <input
                      type="text"
                      name={`guarantorMobileNumbers[${idx}]`}
                      value={num || ""}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setFieldValue(`guarantorMobileNumbers[${idx}]`, val);
                      }}
                      onBlur={handleBlur}
                      disabled={isViewOnly}
                      maxLength={10}
                      className={getFieldClass("guarantorMobileNumbers", idx)}
                      placeholder={idx === 0 ? "Primary Guarantor Mobile" : `Alternative Number ${idx}`}
                    />
                    {touched.guarantorMobileNumbers?.[idx] && errors.guarantorMobileNumbers?.[idx] && (
                      <p className="text-[9px] font-bold text-red-500 mt-1 uppercase tracking-wider ml-1">
                        {errors.guarantorMobileNumbers[idx]}
                      </p>
                    )}
                  </div>
                  {!isViewOnly && idx > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newNums = values.guarantorMobileNumbers.filter((_, i) => i !== idx);
                        setFieldValue("guarantorMobileNumbers", newNums);
                      }}
                      className="flex-none p-2 text-red-400 hover:text-red-600 transition-colors"
                      title="Remove number"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              {!isViewOnly && (
                <button
                  type="button"
                  onClick={() => setFieldValue("guarantorMobileNumbers", [...values.guarantorMobileNumbers, ""])}
                  className="flex items-center gap-2 text-[11px] font-black text-primary uppercase hover:opacity-80 transition-all w-fit px-1 py-2"
                >
                  <span className="text-lg">+</span> ADD GUARANTOR CONTACT
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Loan Terms */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3 uppercase tracking-tight text-primary">
          LOAN TERMS (WEEKLY)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
              Amount
            </label>
            <input
              type="number"
              name="disbursementAmount"
              value={values.disbursementAmount || ""}
              onChange={formik.handleChange}
              onBlur={handleBlur}
              disabled={isViewOnly}
              className={getFieldClass("disbursementAmount")}
            />
            <ErrorMsg
              touched={touched}
              errors={errors}
              name="disbursementAmount"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
              Processing Fee Rate (%)
            </label>
            <input
              type="number"
              name="processingFeeRate"
              value={values.processingFeeRate ?? 10}
              onChange={formik.handleChange}
              onBlur={handleBlur}
              disabled={isViewOnly}
              className={getFieldClass("processingFeeRate")}
            />
            <ErrorMsg
              touched={touched}
              errors={errors}
              name="processingFeeRate"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
              Processing Fee
            </label>
            <input
              type="number"
              value={processingFee || ""}
              readOnly
              className="w-full bg-slate-100/50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-500 italic"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
              Tenure (Weeks)
            </label>
            <input
              type="number"
              name="totalEmis"
              value={values.totalEmis || ""}
              onChange={formik.handleChange}
              onBlur={handleBlur}
              disabled={isViewOnly}
              className={getFieldClass("totalEmis")}
            />
            <ErrorMsg touched={touched} errors={errors} name="totalEmis" />
          </div>
          {isEditMode && (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Paid EMIs
              </label>
              <input
                type="number"
                name="paidEmis"
                value={values.paidEmis ?? ""}
                onChange={formik.handleChange}
                onBlur={handleBlur}
                disabled={isViewOnly}
                className={getFieldClass("paidEmis")}
              />
              <ErrorMsg touched={touched} errors={errors} name="paidEmis" />
            </div>
          )}
        </div>
      </div>

      {/* Dates & EMI */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3 uppercase tracking-tight text-primary">
          DATES & EMI
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
              Date Loan Disbursed
            </label>
            <input
              type="date"
              name="dateLoanDisbursed"
              value={values.dateLoanDisbursed || ""}
              onChange={formik.handleChange}
              onBlur={handleBlur}
              disabled={isViewOnly}
              className={getFieldClass("dateLoanDisbursed")}
            />
            <ErrorMsg touched={touched} errors={errors} name="dateLoanDisbursed" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
              EMI Start Date
            </label>
            <input
              type="date"
              name="emiStartDate"
              value={values.emiStartDate || ""}
              onChange={formik.handleChange}
              onBlur={handleBlur}
              disabled={isViewOnly}
              className={getFieldClass("emiStartDate")}
            />
            <ErrorMsg touched={touched} errors={errors} name="emiStartDate" />
            <p className="text-[9px] text-blue-500 font-bold ml-1 italic uppercase tracking-tighter">
              Defaults to 7 days after disbursement
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
              EMI End Date (Auto)
            </label>
            <input
              type="date"
              name="emiEndDate"
              value={values.emiEndDate || ""}
              readOnly
              disabled
              className="w-full bg-slate-100/50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-500 italic"
            />
          </div>

          {/* Conditional Management Fields */}
          {isEditMode && (
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  Remaining EMIs (Auto)
                </label>
                <div className="w-full bg-slate-100/50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-500">
                  {remainingEmis}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  Total Paid Amount (Auto)
                </label>
                <div className="w-full bg-slate-100/50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-500">
                  {totalAmount}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  Next EMI Date (Auto)
                </label>
                <div className="w-full bg-slate-100/50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-500">
                  {nextEmiDate}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  Total Collected (Auto)
                </label>
                <div className="w-full bg-primary/10 border-none rounded-2xl px-5 py-4 text-sm font-black text-primary">
                  {totalCollected}
                </div>
              </div>
            </>
          )}

          {/* Styled Summary Bar */}
          <div className="md:col-span-3 mt-4">
            <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 flex justify-between items-center flex-wrap gap-6">
              <div>
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                  Weekly EMI
                </span>
                <p className="text-2xl font-black text-primary">
                  ₹{emiAmount || 0}
                </p>
              </div>

              <div className="text-center px-6 py-3 bg-emerald-50 rounded-xl border border-emerald-100 flex flex-col justify-center items-center">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                  Total Collected Amount
                </span>
                <p className="text-2xl font-black text-emerald-600">
                  ₹{totalCollected || 0}
                </p>
              </div>

              <div className="text-right flex flex-col items-end gap-2">
                <div className="flex flex-col items-end border-t border-primary/20 pt-2">
                  <label className="text-[10px] font-black text-primary uppercase tracking-widest block mb-1">
                    Remaining Principal Amount
                  </label>
                  <p className="text-xl font-black text-primary">
                    ₹{remainingPrincipalAmount || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ClientResponseSection
        clientResponse={values.clientResponse}
        nextFollowUpDate={values.nextFollowUpDate}
        onChange={formik.handleChange}
        isViewOnly={isViewOnly}
        updatedBy={values.updatedBy}
        updatedAt={values.updatedAt}
      />

      {!isViewOnly && (
        <div className="flex justify-end items-center gap-8 pt-6">
          <button
            type="button"
            onClick={onCancel}
            className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-12 py-4 bg-[#2563EB] text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50 disabled:shadow-none"
          >
            {submitting
              ? "Processing..."
              : isEditMode
                ? "Commit Changes"
                : "Create Weekly Loan"}
          </button>
        </div>
      )}
    </form>
  );
};

export default WeeklyLoanForm;
