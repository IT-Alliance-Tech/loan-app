"use client";
import { useState, useEffect } from "react";

const LoanForm = ({ initialData, onSubmit, onCancel, isViewOnly, submitting, renderExtraActions }) => {
  const [formData, setFormData] = useState(initialData);
  const [error, setError] = useState("");

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const calculateEMI = (p, r_annual, n) => {
    const principal = parseFloat(p);
    const roi = parseFloat(r_annual);
    const tenure = parseInt(n);
    if (!principal || !roi || !tenure) return 0;
    const r = roi / 12 / 100;
    if (r === 0) return (principal / tenure).toFixed(2);
    const emi =
      (principal * r * Math.pow(1 + r, tenure)) / (Math.pow(1 + r, tenure) - 1);
    return emi.toFixed(2);
  };

  const validateForm = () => {
    const mobileRegex = /^[6-9]\d{9}$/;
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    const aadharRegex = /^\d{12}$/;
    const vehicleRegex = /^[A-Z]{2}-\d{2}[-\s][A-Z]{1,2}-\d{4}$/;

    if (!mobileRegex.test(formData.mobileNumber)) {
      setError("Invalid Mobile Number. Must be 10 digits starting with 6-9.");
      return false;
    }
    if (formData.panNumber && !panRegex.test(formData.panNumber.toUpperCase())) {
      setError("Invalid PAN Number format (e.g., ABCDE1234F).");
      return false;
    }
    if (formData.aadharNumber && !aadharRegex.test(formData.aadharNumber)) {
      setError("Invalid Aadhar Number. Must be 12 digits.");
      return false;
    }
    if (formData.vehicleNumber && !vehicleRegex.test(formData.vehicleNumber.toUpperCase())) {
      setError("Invalid Vehicle Number format (e.g., KA-01 AB-1234).");
      return false;
    }
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <div className="bg-white w-full max-w-4xl mx-auto rounded-3xl shadow-sm overflow-hidden border border-slate-200 flex flex-col">
      <div className="p-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold uppercase tracking-tight">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] border-b border-primary/10 pb-2">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loan Number</label>
                <input type="text" name="loanNumber" value={formData.loanNumber || ""} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 uppercase" placeholder="LN-001" required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</label>
                <input type="text" name="customerName" value={formData.customerName || ""} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Full Name" required />
              </div>
            </div>
          </div>

          {/* Customer Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] border-b border-primary/10 pb-2">Customer Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Address</label>
                <textarea name="address" value={formData.address || ""} onChange={handleChange} readOnly={isViewOnly} rows="2" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20" required></textarea>
              </div>
              <div className="grid grid-cols-2 gap-6 md:col-span-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Own/Rent</label>
                  <select name="ownRent" value={formData.ownRent || ""} onChange={handleChange} disabled={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="Own">Own</option>
                    <option value="Rent">Rent</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mobile Number</label>
                  <input type="text" name="mobileNumber" value={formData.mobileNumber || ""} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6 md:col-span-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PAN Number</label>
                  <input type="text" name="panNumber" value={formData.panNumber || ""} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 uppercase" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aadhar Number</label>
                  <input type="text" name="aadharNumber" value={formData.aadharNumber || ""} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
            </div>
          </div>

          {/* Loan Terms */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] border-b border-primary/10 pb-2">Loan Terms</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input type="number" name="principalAmount" value={formData.principalAmount || ""} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20" required />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Processing Fee Rate (%)</label>
                <input type="number" name="processingFeeRate" value={formData.processingFeeRate || ""} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Processing Fee</label>
                <input type="number" name="processingFee" value={formData.processingFee || ""} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tenure Type</label>
                <select name="tenureType" value={formData.tenureType || ""} onChange={handleChange} disabled={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="Monthly">Monthly</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Daily">Daily</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tenure (Months)</label>
                <input type="number" name="tenureMonths" value={formData.tenureMonths || ""} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20" required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Interest Rate (%)</label>
                <input type="number" step="0.01" name="annualInterestRate" value={formData.annualInterestRate || ""} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20" required />
              </div>
            </div>
          </div>

          {/* Dates & EMI */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] border-b border-primary/10 pb-2">Dates & EMI</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date Loan Disbursed</label>
                <input type="date" name="dateLoanDisbursed" value={formData.dateLoanDisbursed || ""} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">EMI Start Date</label>
                <input type="date" name="emiStartDate" value={formData.emiStartDate || ""} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">EMI End Date</label>
                <input type="date" name="emiEndDate" value={formData.emiEndDate || ""} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="md:col-span-3">
                <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">Calculated Monthly EMI</span>
                    <p className="text-xl font-black text-primary">₹{calculateEMI(formData.principalAmount, formData.annualInterestRate, formData.tenureMonths)}</p>
                  </div>
                  <div className="text-right">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Interest Amount</label>
                    <input type="number" name="totalInterestAmount" value={formData.totalInterestAmount || ""} onChange={handleChange} readOnly={isViewOnly} className="bg-transparent border-b border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:border-primary text-right w-32" placeholder="0" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Vehicle Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] border-b border-primary/10 pb-2">Vehicle Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vehicle Number</label>
                <input type="text" name="vehicleNumber" value={formData.vehicleNumber || ""} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 uppercase" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chassis Number</label>
                <input type="text" name="chassisNumber" value={formData.chassisNumber || ""} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 uppercase" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Model</label>
                <input type="text" name="model" value={formData.model || ""} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type of Vehicle</label>
                <input type="text" name="typeOfVehicle" value={formData.typeOfVehicle || ""} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Board (Yellow/White)</label>
                <select name="ywBoard" value={formData.ywBoard || ""} onChange={handleChange} disabled={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="Yellow">Yellow</option>
                  <option value="White">White</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Doc Checklist</label>
                <input type="text" name="docChecklist" value={formData.docChecklist || ""} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-900 text-white px-4 py-2 rounded-lg">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">Doc Checklist & RTO Details</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dealer Name</label>
                <input type="text" name="dealerName" value={formData.dealerName || ""} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dealer Number</label>
                <input type="text" name="dealerNumber" value={formData.dealerNumber || ""} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">HP Entry</label>
                <select name="hpEntry" value={formData.hpEntry || ""} onChange={handleChange} disabled={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="Not done">Not done</option>
                  <option value="Done">Done</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">FC Date</label>
                <input type="date" name="fcDate" value={formData.fcDate || ""} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Insurance Date</label>
                <input type="date" name="insuranceDate" value={formData.insuranceDate || ""} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">RTO Work Pending</label>
                <input type="text" name="rtoWorkPending" value={formData.rtoWorkPending || ""} onChange={handleChange} readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-6">
            <div>
              {renderExtraActions && renderExtraActions()}
            </div>
            <div className="flex gap-4">
              {isViewOnly ? (
                <button type="button" onClick={onCancel} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all">Back to List</button>
              ) : (
                <>
                  <button type="button" onClick={onCancel} className="px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-200 transition-colors">Cancel</button>
                  <button type="submit" disabled={submitting} className="bg-primary text-white px-10 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 transition-all uppercase">
                    {submitting ? "Processing..." : initialData._id ? "Commit Changes" : "Create Profile"}
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
