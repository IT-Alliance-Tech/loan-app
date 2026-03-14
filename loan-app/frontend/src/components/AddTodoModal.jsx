"use client";
import React, { useState, useEffect, useCallback } from "react";
import Modal from "./Modal";
import { getEmployees } from "../services/userService";

const AddTodoModal = ({ isOpen, onClose, onSubmit, submitting, todoToEdit = null }) => {
  const [formData, setFormData] = useState({
    title: todoToEdit?.title || "",
    description: todoToEdit?.description || "",
    status: todoToEdit?.status || "Todo",
    priority: todoToEdit?.priority || "Medium",
    dueDate: todoToEdit?.dueDate ? new Date(todoToEdit.dueDate).toISOString().split("T")[0] : "",
    assignedTo: todoToEdit?.assignedTo?._id || todoToEdit?.assignedTo || "",
  });

  const [employees, setEmployees] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState(todoToEdit?.assignedTo?.name || "");
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await getEmployees();
      if (res.data && Array.isArray(res.data.employees)) {
        setEmployees(res.data.employees);
      } else if (Array.isArray(res.data)) {
        setEmployees(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch employees", err);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };





  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const filteredEmployees = Array.isArray(employees) ? employees.filter((emp) =>
    emp.name.toLowerCase().includes(employeeSearch.toLowerCase())
  ) : [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={todoToEdit ? "Edit To-Do" : "Add New To-Do"} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block mb-2">
            Title *
          </label>
          <input
            type="text"
            name="title"
            required
            className="w-full bg-slate-50 border border-transparent rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-300"
            placeholder="ENTER TASK TITLE..."
            value={formData.title}
            onChange={handleChange}
          />
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block mb-2">
            Description
          </label>
          <textarea
            name="description"
            rows="3"
            className="w-full bg-slate-50 border border-transparent rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-300"
            placeholder="ENTER TASK DESCRIPTION..."
            value={formData.description}
            onChange={handleChange}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block mb-2">
              Status
            </label>
            <select
              name="status"
              className="w-full bg-slate-50 border border-transparent rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="Todo">TODO</option>
              <option value="In Progress">IN PROGRESS</option>
              <option value="Done">DONE</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block mb-2">
              Priority
            </label>
            <select
              name="priority"
              className="w-full bg-slate-50 border border-transparent rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
              value={formData.priority}
              onChange={handleChange}
            >
              <option value="Low">LOW</option>
              <option value="Medium">MEDIUM</option>
              <option value="High">HIGH</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block mb-2">
            Due Date
          </label>
          <div className="relative">
            <input
              type="date"
              name="dueDate"
              className="w-full bg-slate-50 border border-transparent rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
              value={formData.dueDate}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="relative">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block mb-2">
            Assigned To
          </label>
          <input
            type="text"
            className="w-full bg-slate-50 border border-transparent rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-300"
            placeholder="SEARCH EMPLOYEE BY NAME..."
            value={employeeSearch}
            onChange={(e) => {
              setEmployeeSearch(e.target.value);
              setShowEmployeeDropdown(true);
            }}
            onFocus={() => {
              setShowEmployeeDropdown(true);
              fetchEmployees();
            }}
          />
          {showEmployeeDropdown && employeeSearch.trim() && (
            <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl max-h-48 overflow-y-auto">
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((emp) => (
                  <button
                    key={emp._id}
                    type="button"
                    className="w-full px-5 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 font-bold text-xs uppercase text-slate-700"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, assignedTo: emp._id }));
                      setEmployeeSearch(emp.name);
                      setShowEmployeeDropdown(false);
                    }}
                  >
                    {emp.name} ({emp.role})
                  </button>
                ))
              ) : (
                <div className="px-5 py-3 text-slate-400 font-bold text-[10px] uppercase">
                  No employees found
                </div>
              )}
            </div>
          )}
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-white font-black py-4 rounded-3xl shadow-lg shadow-primary/30 hover:bg-blue-700 transition-all uppercase tracking-widest text-sm disabled:opacity-50"
          >
            {submitting ? "SUBMITTING..." : todoToEdit ? "UPDATE TASK" : "SUBMIT"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddTodoModal;
