"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { Building2, Plus, Search } from "lucide-react";

interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  default_sla_hours: number;
  is_active: boolean;
  member_count: number;
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    default_sla_hours: 48,
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const data = await apiGet<Department[]>("/admin/departments");
      setDepartments(data);
    } catch (error) {
      console.error("Failed to fetch departments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiPost("/admin/departments", formData);
      setShowForm(false);
      setFormData({
        name: "",
        code: "",
        description: "",
        default_sla_hours: 48,
      });
      fetchDepartments();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to create department";
      alert(message);
    }
  };

  if (loading) {
    return (
      <div className="text-slate-600 font-medium">Loading Departments...</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Departments</h2>
          <p className="text-sm text-slate-500">
            Organizational units and SLA configurations.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Department
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-4">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-800">
              Create New Department
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Department Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="e.g., Public Works Department"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Code
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="e.g., PWD"
                  required
                />
              </div>
            </div>

            <div>
              <label
                className="block text-sm font-medium text-slate-700 mb-1"
                htmlFor="dept-desc"
              >
                Description
              </label>
              <textarea
                id="dept-desc"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                rows={2}
                placeholder="Brief description of responsibilities..."
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium text-slate-700 mb-1"
                htmlFor="dept-sla"
              >
                Default SLA (Hours)
              </label>
              <input
                id="dept-sla"
                type="number"
                value={formData.default_sla_hours}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    default_sla_hours: parseInt(e.target.value),
                  })
                }
                className="w-32 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-sm"
              >
                Create Department
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 bg-white text-slate-700 font-medium rounded-lg border border-slate-300 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {departments.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
            <Building2 className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-slate-500 mt-4 text-lg">No departments found.</p>
            <p className="text-slate-400 text-sm">
              Create your first organizational unit to get started.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Staff Count
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {departments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="shrink-0 h-10 w-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                          {dept.code}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-slate-900">
                            {dept.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            Code: {dept.code}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600 line-clamp-1">
                        {dept.description || "-"}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        SLA: {dept.default_sla_hours}h
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          dept.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {dept.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <span className="text-slate-900 font-bold">
                        {dept.member_count}
                      </span>
                      <span className="text-slate-500 ml-1">staff</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
