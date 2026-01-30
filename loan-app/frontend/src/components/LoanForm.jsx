"use client";
// Layout updated to move Additional Mobile Numbers (Customer) below the main Mobile Number field.
import { useState, useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useToast } from "../context/ToastContext";
import { addMonths, format } from "date-fns";
import {
  calculateEMI as fetchEMI,
  getRtoWorks,
  createRtoWork,
} from "../services/loan.service";

const validationSchema = Yup.object().shape({
  loanNumber: Yup.string().required("Loan number is required"),
  customerName: Yup.string().required("Customer name is required"),
  address: Yup.string().required("Address is required"),
  ownRent: Yup.string().required("Please select ownership status"),
  mobileNumber: Yup.string()
    .matches(/^[6-9]\d{9}$/, "Invalid Mobile Number")
    .required("Mobile number is required"),
  additionalMobileNumbers: Yup.array().of(
    Yup.string().matches(/^[6-9]\d{9}$/, {
      message: "Invalid Mobile Number",
      excludeEmptyString: true,
    }),
  ),
  guarantorName: Yup.string().nullable(),
  guarantorMobileNumbers: Yup.array().of(
    Yup.string().matches(/^[6-9]\d{9}$/, {
      message: "Invalid Mobile Number",
      excludeEmptyString: true,
    }),
  ),
  guarantorMobileNumber: Yup.string()
    .matches(/^[6-9]\d{9}$/, "Invalid Mobile Number")
    .required("Guarantor mobile number is required"),
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
  chassisNumber: Yup.string().nullable(),
  engineNumber: Yup.string().nullable(),
  model: Yup.string().nullable(),
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
  status: Yup.string().required("Status is required"),
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

  const [rtoOptions, setRtoOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [isRtoDropdownOpen, setIsRtoDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchOptions = async () => {
      setLoadingOptions(true);
      try {
        const res = await getRtoWorks();
        if (res.data) {
          setRtoOptions(res.data.map((opt) => opt.name));
        }
      } catch (err) {
        console.error("Failed to fetch RTO options", err);
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchOptions();
  }, []);

  const formik = useFormik({
    initialValues: {
      ...initialData,
      rtoWorkPending: Array.isArray(initialData.rtoWorkPending)
        ? initialData.rtoWorkPending
        : initialData.rtoWorkPending
          ? [initialData.rtoWorkPending]
          : [],
      additionalMobileNumbers: Array.isArray(
        initialData.additionalMobileNumbers,
      )
        ? initialData.additionalMobileNumbers
        : [],
      guarantorName: initialData.guarantorName || "",
      guarantorMobileNumbers: Array.isArray(initialData.guarantorMobileNumbers)
        ? initialData.guarantorMobileNumbers
        : [],
      guarantorMobileNumber: initialData.guarantorMobileNumber || "",
      processingFeeRate: initialData.processingFeeRate ?? 0,
      status: initialData.status || "",
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      // Clean up rtoWorkPending: ensure it's an array and filter out empty strings
      const rtoWork = Array.isArray(values.rtoWorkPending)
        ? values.rtoWorkPending.filter((w) => w.trim() !== "")
        : [];

      // Save any new options to the backend
      for (const work of rtoWork) {
        if (!rtoOptions.includes(work)) {
          try {
            await createRtoWork(work);
          } catch (err) {
            console.error("Failed to save new RTO work option", err);
          }
        }
      }

      onSubmit({ ...values, rtoWorkPending: rtoWork });
    },
  });

  const handleRtoCheckboxChange = (option) => {
    const current = Array.isArray(formik.values.rtoWorkPending)
      ? formik.values.rtoWorkPending
      : [];
    if (current.includes(option)) {
      formik.setFieldValue(
        "rtoWorkPending",
        current.filter((item) => item !== option),
      );
    } else {
      formik.setFieldValue("rtoWorkPending", [...current, option]);
    }
  };

  const [customRto, setCustomRto] = useState("");
  const handleAddCustomRto = () => {
    if (customRto.trim()) {
      const current = Array.isArray(formik.values.rtoWorkPending)
        ? formik.values.rtoWorkPending
        : [];
      if (!current.includes(customRto.trim())) {
        formik.setFieldValue("rtoWorkPending", [...current, customRto.trim()]);
      }
      setCustomRto("");
    }
  };

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

  // Auto-calculate EMI Start Date from Disbursement Date
  useEffect(() => {
    const disbursementDate = formik.values.dateLoanDisbursed;
    if (disbursementDate) {
      const d = new Date(disbursementDate);
      const startDate = addMonths(d, 1);
      formik.setFieldValue("emiStartDate", format(startDate, "yyyy-MM-dd"));
    }
  }, [formik.values.dateLoanDisbursed]);

  // Auto-calculate EMI End Date from Start Date & Tenure
  useEffect(() => {
    const startDate = formik.values.emiStartDate;
    const tenure = parseInt(formik.values.tenureMonths);
    if (startDate && tenure) {
      const d = new Date(startDate);
      // End Date = Start Date + (Tenure - 1) Months
      const endDate = addMonths(d, tenure - 1);
      formik.setFieldValue("emiEndDate", format(endDate, "yyyy-MM-dd"));
    }
  }, [formik.values.emiStartDate, formik.values.tenureMonths]);

  const ErrorMsg = ({ name }) => {
    const meta = formik.getFieldMeta(name);
    return meta.touched && meta.error ? (
      <p className="text-[9px] font-bold text-red-500 mt-1 uppercase tracking-wider">
        {meta.error}
      </p>
    ) : null;
  };

  const getFieldClass = (name) => {
    const meta = formik.getFieldMeta(name);
    const baseClass =
      "w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 transition-all ";
    const stateClass =
      meta.touched && meta.error
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
              {/* Left Column: Own/Rent & PAN */}
              <div className="space-y-6">
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
              </div>

              {/* Right Column: Mobile Number & Aadhar Number */}
              <div className="space-y-6">
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

                  {/* Additional Mobile Numbers (Customer) */}
                  <div className="space-y-4 mt-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between">
                      Alternative Mobile Number
                    </label>
                    <div className="space-y-2">
                      {formik.values.additionalMobileNumbers.map((num, idx) => (
                        <div key={idx} className="flex-1">
                          <div className="flex gap-2 animate-in slide-in-from-left-2 duration-200">
                            <input
                              type="text"
                              name={`additionalMobileNumbers.${idx}`}
                              maxLength={10}
                              value={num}
                              onChange={(e) => {
                                const val = e.target.value.replace(
                                  /[^0-9]/g,
                                  "",
                                );
                                const newArr = [
                                  ...formik.values.additionalMobileNumbers,
                                ];
                                newArr[idx] = val;
                                formik.setFieldValue(
                                  "additionalMobileNumbers",
                                  newArr,
                                );
                              }}
                              onBlur={formik.handleBlur}
                              className={getFieldClass(
                                `additionalMobileNumbers.${idx}`,
                              )}
                              placeholder={`Alt number ${idx + 1}`}
                              readOnly={isViewOnly}
                            />
                            {!isViewOnly && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newArr =
                                    formik.values.additionalMobileNumbers.filter(
                                      (_, i) => i !== idx,
                                    );
                                  formik.setFieldValue(
                                    "additionalMobileNumbers",
                                    newArr,
                                  );
                                }}
                                className="p-2 text-red-400 hover:text-red-600 transition-colors"
                              >
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            )}
                          </div>
                          <ErrorMsg name={`additionalMobileNumbers.${idx}`} />
                        </div>
                      ))}
                      {!isViewOnly && (
                        <button
                          type="button"
                          onClick={() =>
                            formik.setFieldValue("additionalMobileNumbers", [
                              ...formik.values.additionalMobileNumbers,
                              "",
                            ])
                          }
                          className="text-[10px] font-black text-primary uppercase tracking-widest hover:text-primary/70 transition-colors flex items-center gap-1.5"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="3"
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                          Add Contact Number
                        </button>
                      )}
                    </div>
                  </div>
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

              {/* Guarantor & Multi-Mobile Section */}
              <div className="md:col-span-2 space-y-6 pt-4 border-t border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Guarantor Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Guarantor Name
                    </label>
                    <input
                      type="text"
                      name="guarantorName"
                      value={formik.values.guarantorName || ""}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      readOnly={isViewOnly}
                      className={getFieldClass("guarantorName")}
                      placeholder="Enter Guarantor Name"
                    />
                    <ErrorMsg name="guarantorName" />
                  </div>

                  {/* Guarantor Primary Mobile Number */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Guarantor Mobile Number{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="guarantorMobileNumber"
                      maxLength={10}
                      value={formik.values.guarantorMobileNumber || ""}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        if (val.length <= 10)
                          formik.setFieldValue("guarantorMobileNumber", val);
                      }}
                      onBlur={formik.handleBlur}
                      readOnly={isViewOnly}
                      className={getFieldClass("guarantorMobileNumber")}
                      placeholder="Enter Guarantor Mobile Number"
                    />
                    <ErrorMsg name="guarantorMobileNumber" />

                    {/* Additional Guarantor Mobile Numbers (Nesting inside this column) */}
                    <div className="space-y-4 mt-6">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Alternative Mobile Number
                      </label>
                      <div className="space-y-2">
                        {formik.values.guarantorMobileNumbers.map(
                          (num, idx) => (
                            <div key={idx} className="flex-1">
                              <div className="flex gap-2 animate-in slide-in-from-right-2 duration-200">
                                <input
                                  type="text"
                                  name={`guarantorMobileNumbers.${idx}`}
                                  maxLength={10}
                                  value={num}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(
                                      /[^0-9]/g,
                                      "",
                                    );
                                    const newArr = [
                                      ...formik.values.guarantorMobileNumbers,
                                    ];
                                    newArr[idx] = val;
                                    formik.setFieldValue(
                                      "guarantorMobileNumbers",
                                      newArr,
                                    );
                                  }}
                                  onBlur={formik.handleBlur}
                                  className={getFieldClass(
                                    `guarantorMobileNumbers.${idx}`,
                                  )}
                                  placeholder="10 digit number"
                                  readOnly={isViewOnly}
                                />
                                {!isViewOnly && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newArr =
                                        formik.values.guarantorMobileNumbers.filter(
                                          (_, i) => i !== idx,
                                        );
                                      formik.setFieldValue(
                                        "guarantorMobileNumbers",
                                        newArr,
                                      );
                                    }}
                                    className="p-2 text-red-400 hover:text-red-600 transition-colors"
                                  >
                                    <svg
                                      className="w-5 h-5"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                      />
                                    </svg>
                                  </button>
                                )}
                              </div>
                              <ErrorMsg
                                name={`guarantorMobileNumbers.${idx}`}
                              />
                            </div>
                          ),
                        )}
                        {!isViewOnly && (
                          <button
                            type="button"
                            onClick={() =>
                              formik.setFieldValue("guarantorMobileNumbers", [
                                ...formik.values.guarantorMobileNumbers,
                                "",
                              ])
                            }
                            className="text-[10px] font-black text-primary uppercase tracking-widest hover:text-primary/70 transition-colors flex items-center gap-1.5"
                          >
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="3"
                                d="M12 4v16m8-8H4"
                              />
                            </svg>
                            Add Guarantor Contact
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Loan Terms */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] border-b border-primary/10 pb-2">
              Loan Terms (monthly)
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
                  Engine Number
                </label>
                <input
                  type="text"
                  name="engineNumber"
                  value={formik.values.engineNumber || ""}
                  onChange={(e) =>
                    formik.setFieldValue(
                      "engineNumber",
                      e.target.value.toUpperCase(),
                    )
                  }
                  onBlur={formik.handleBlur}
                  readOnly={isViewOnly}
                  className={getFieldClass("engineNumber") + " uppercase"}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
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
                {!isViewOnly ? (
                  <div className="relative">
                    {/* Multi-select Dropdown Trigger */}
                    <div
                      onClick={() => setIsRtoDropdownOpen(!isRtoDropdownOpen)}
                      className={
                        "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus-within:ring-2 focus-within:ring-primary/20 transition-all cursor-pointer flex justify-between items-center gap-2 min-h-[44px]"
                      }
                    >
                      <div className="flex flex-wrap gap-1 flex-1 items-center py-1">
                        {Array.isArray(formik.values.rtoWorkPending) &&
                        formik.values.rtoWorkPending.length > 0 ? (
                          formik.values.rtoWorkPending.map((item) => (
                            <span
                              key={item}
                              className="bg-primary/10 text-primary text-[9px] font-black px-2 py-0.5 rounded-md border border-primary/10 animate-in fade-in zoom-in duration-200 flex items-center gap-1"
                            >
                              {item}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRtoCheckboxChange(item);
                                }}
                                className="hover:text-red-500 transition-colors p-0.5"
                              >
                                <svg
                                  className="w-2.5 h-2.5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="3"
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 font-medium text-[11px]">
                            Select RTO Tasks...
                          </span>
                        )}
                      </div>
                      <div className="flex-shrink-0 ml-auto">
                        <svg
                          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-300 ${isRtoDropdownOpen ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="3"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>

                    {/* Dropdown Menu - Positioned UPWARDS to avoid clipping at the bottom of the card */}
                    {isRtoDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setIsRtoDropdownOpen(false)}
                        ></div>

                        <div className="absolute bottom-[calc(100%+8px)] left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 z-50 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300 ring-4 ring-slate-900/5">
                          <div className="flex justify-between items-center px-1 border-b border-slate-50 pb-2">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                              Availability List
                            </span>
                            {Array.isArray(formik.values.rtoWorkPending) &&
                              formik.values.rtoWorkPending.length > 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    formik.setFieldValue("rtoWorkPending", []);
                                  }}
                                  className="text-[9px] font-black text-red-400 uppercase hover:text-red-600 transition-colors"
                                >
                                  Clear All
                                </button>
                              )}
                          </div>

                          <div className="grid grid-cols-1 gap-1 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                            {loadingOptions ? (
                              <div className="py-8 text-center">
                                <span className="text-xs italic text-slate-400">
                                  Loading Intelligence...
                                </span>
                              </div>
                            ) : (
                              rtoOptions.map((opt) => (
                                <label
                                  key={opt}
                                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer group transition-all ${
                                    Array.isArray(
                                      formik.values.rtoWorkPending,
                                    ) &&
                                    formik.values.rtoWorkPending.includes(opt)
                                      ? "bg-primary/5 border border-primary/10"
                                      : "hover:bg-slate-50 border border-transparent"
                                  }`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div
                                    className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                                      Array.isArray(
                                        formik.values.rtoWorkPending,
                                      ) &&
                                      formik.values.rtoWorkPending.includes(opt)
                                        ? "bg-primary border-primary"
                                        : "bg-white border-slate-300 group-hover:border-primary"
                                    }`}
                                  >
                                    {Array.isArray(
                                      formik.values.rtoWorkPending,
                                    ) &&
                                      formik.values.rtoWorkPending.includes(
                                        opt,
                                      ) && (
                                        <svg
                                          className="w-3.5 h-3.5 text-white"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="4"
                                            d="M5 13l4 4L19 7"
                                          />
                                        </svg>
                                      )}
                                  </div>
                                  <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={
                                      Array.isArray(
                                        formik.values.rtoWorkPending,
                                      ) &&
                                      formik.values.rtoWorkPending.includes(opt)
                                    }
                                    onChange={() =>
                                      handleRtoCheckboxChange(opt)
                                    }
                                  />
                                  <span
                                    className={`text-sm font-bold transition-colors ${
                                      Array.isArray(
                                        formik.values.rtoWorkPending,
                                      ) &&
                                      formik.values.rtoWorkPending.includes(opt)
                                        ? "text-primary"
                                        : "text-slate-600 group-hover:text-primary"
                                    }`}
                                  >
                                    {opt}
                                  </span>
                                </label>
                              ))
                            )}
                          </div>

                          <div className="pt-4 border-t border-slate-100 space-y-4">
                            <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                                Custom RTO Task Entry
                              </p>
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  placeholder="Task name..."
                                  className="min-w-0 flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-300"
                                  value={customRto}
                                  onChange={(e) => setCustomRto(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyPress={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleAddCustomRto();
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddCustomRto();
                                  }}
                                  className="flex-shrink-0 bg-slate-900 text-white px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md active:scale-95"
                                >
                                  Add
                                </button>
                              </div>
                            </div>

                            <div className="pt-2">
                              <button
                                type="button"
                                onClick={() => setIsRtoDropdownOpen(false)}
                                className="w-full bg-primary text-white py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:bg-blue-700 transition-all active:scale-[0.98]"
                              >
                                Done
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-1 border-b border-slate-100 pb-2">
                    {Array.isArray(formik.values.rtoWorkPending) &&
                    formik.values.rtoWorkPending.length > 0 ? (
                      formik.values.rtoWorkPending.map((item) => (
                        <span
                          key={item}
                          className="bg-slate-50 text-slate-500 text-[10px] font-black px-3 py-1 rounded-full border border-slate-100"
                        >
                          {item}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm italic text-slate-300 font-bold">
                        None
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Status <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="status"
                  value={formik.values.status || ""}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  readOnly={isViewOnly}
                  className={getFieldClass("status")}
                  placeholder="Enter current status (e.g. Verified, Pending Documents, etc.)"
                />
                <ErrorMsg name="status" />
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
