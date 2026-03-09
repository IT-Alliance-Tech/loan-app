import React, { useEffect } from "react";
import { addDays, format } from "date-fns";
import { useFormik } from "formik";
import * as Yup from "yup";
import ClientResponseSection from "./ClientResponseSection";

const validationSchema = Yup.object().shape({
  loanNumber: Yup.string().required("Loan number is required"),
  customerName: Yup.string().required("Customer name is required"),
  mobileNumber: Yup.string()
    .matches(/^[6-9]\d{9}$/, "Invalid mobile number")
    .required("Mobile number is required"),
  disbursementAmount: Yup.number()
    .positive("Amount must be positive")
    .required("Amount is required"),
  totalEmis: Yup.number()
    .positive("Tenure must be positive")
    .integer("Tenure must be an integer")
    .required("Tenure is required"),
  startDate: Yup.string().required("Disbursement date is required"),
  emiStartDate: Yup.string().required("EMI start date is required"),
});

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

const WeeklyLoanForm = ({
  initialData,
  onSubmit,
  onCancel,
  submitting,
  isViewOnly = false,
}) => {
  const formik = useFormik({
    initialValues: initialData,
    validationSchema,
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
        emiEndDate,
        remainingPrincipalAmount,
      });
    },
  });

  const { values, setFieldValue, errors, touched, handleBlur } = formik;

  // Auto-set EMI Start Date to 7 days after Disbursement Date
  useEffect(() => {
    if (values.startDate && !formik.values._id) {
      const disbursementDate = new Date(values.startDate);
      if (!isNaN(disbursementDate.getTime())) {
        const autoEmiStart = format(addDays(disbursementDate, 7), "yyyy-MM-dd");
        if (values.emiStartDate !== autoEmiStart) {
          setFieldValue("emiStartDate", autoEmiStart);
        }
      }
    }
  }, [values.startDate, setFieldValue, formik.values._id, values.emiStartDate]);

  // Auto-calculations (Derived State)
  const amount = parseFloat(values.disbursementAmount) || 0;
  const totalWeeks = parseInt(values.totalEmis) || 0;
  const paidWeeks = parseInt(values.paidEmis) || 0;
  const feeRate = parseFloat(values.processingFeeRate) || 10;
  const eStartDate = values.emiStartDate ? new Date(values.emiStartDate) : null;

  // Processing Fee
  const processingFee = (amount * (feeRate / 100)).toFixed(2);

  // Weekly Principal Calculation (No Interest)
  const emiAmount = totalWeeks > 0 ? (amount / totalWeeks).toFixed(2) : "0.00";

  // Dates
  let emiEndDate = "";
  if (eStartDate && totalWeeks > 0) {
    const end = new Date(eStartDate);
    end.setDate(end.getDate() + (totalWeeks - 1) * 7);
    emiEndDate = isNaN(end.getTime()) ? "" : format(end, "yyyy-MM-dd");
  }

  const totalAmount = (parseFloat(emiAmount) * paidWeeks).toFixed(2);
  const totalCollected = (
    parseFloat(totalAmount) + parseFloat(processingFee)
  ).toFixed(2);
  const remainingEmis = totalWeeks - paidWeeks;
  const remainingPrincipalAmount = (
    amount -
    (amount / totalWeeks) * paidWeeks
  ).toFixed(2);

  const nextEmiDate =
    eStartDate && !isNaN(eStartDate.getTime())
      ? format(addDays(eStartDate, paidWeeks * 7), "yyyy-MM-dd")
      : "";

  const isEditMode = !!values?._id;

  const getFieldClass = (name) => {
    const [section, field] = name.includes(".")
      ? name.split(".")
      : [null, name];
    const isTouched = section ? touched[section]?.[field] : touched[field];
    const error = section ? errors[section]?.[field] : errors[field];

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
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3 uppercase tracking-tight">
          <span className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center text-lg">
            👤
          </span>
          Customer & Basic Info
        </h2>
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
              Customer Name <span className="text-red-500">*</span>
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
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
              Mobile Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="mobileNumber"
              value={values.mobileNumber || ""}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                setFieldValue("mobileNumber", val);
              }}
              onBlur={handleBlur}
              disabled={isViewOnly}
              maxLength={10}
              className={getFieldClass("mobileNumber")}
              placeholder="10-digit Number"
            />
            <ErrorMsg touched={touched} errors={errors} name="mobileNumber" />
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
              Amount <span className="text-red-500">*</span>
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
              Tenure (Weeks) <span className="text-red-500">*</span>
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
              name="startDate"
              value={values.startDate || ""}
              onChange={formik.handleChange}
              onBlur={handleBlur}
              disabled={isViewOnly}
              className={getFieldClass("startDate")}
            />
            <ErrorMsg touched={touched} errors={errors} name="startDate" />
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

      {values?._id && (
        <ClientResponseSection
          clientResponse={values.clientResponse}
          nextFollowUpDate={values.nextFollowUpDate}
          onChange={formik.handleChange}
          isViewOnly={isViewOnly}
        />
      )}

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
