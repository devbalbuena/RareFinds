"use client";

import * as React from "react";
import { Role } from "@prisma/client";
import {
  createUserOrStaffAction,
  promoteCustomerAction,
  changeUserRoleAction,
  toggleUserActiveAction,
} from "@/actions/users";
import {
  UserPlus,
  Search,
  CheckCircle,
  AlertCircle,
  Loader2,
  UserX,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface SerializedUser {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

interface UsersManagementTableProps {
  initialUsers: SerializedUser[];
  currentUserId: string;
}

export function UsersManagementTable({
  initialUsers,
  currentUserId,
}: UsersManagementTableProps) {
  const [users, setUsers] = React.useState<SerializedUser[]>(initialUsers);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<string>("ALL");

  // Add staff modal state
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [addName, setAddName] = React.useState("");
  const [addEmail, setAddEmail] = React.useState("");
  const [addPassword, setAddPassword] = React.useState("");
  const [addRole, setAddRole] = React.useState<"STAFF" | "ADMIN">("STAFF");
  const [addError, setAddError] = React.useState<string | null>(null);
  const [addSuccess, setAddSuccess] = React.useState<string | null>(null);
  const [isPending, setIsPending] = React.useState(false);

  // Promote existing customer prompt state
  const [existingCustomerData, setExistingCustomerData] = React.useState<{
    id: string;
    email: string;
    name: string | null;
  } | null>(null);

  // Action status message state
  const [actionAlert, setActionAlert] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setAddSuccess(null);
    setExistingCustomerData(null);
    setIsPending(true);

    const res = await createUserOrStaffAction({
      name: addName.trim(),
      email: addEmail.trim(),
      password: addPassword,
      role: addRole,
    });

    setIsPending(false);

    if (res.customerExists && res.existingUserId) {
      setExistingCustomerData({
        id: res.existingUserId,
        email: res.existingUserEmail || addEmail,
        name: res.existingUserName || null,
      });
      return;
    }

    if (res.error) {
      setAddError(res.error);
      return;
    }

    if (res.user) {
      setAddSuccess(`Account for ${res.user.email} created as ${res.user.role}.`);
      setUsers((prev) => [res.user!, ...prev]);
      setAddName("");
      setAddEmail("");
      setAddPassword("");
      setTimeout(() => {
        setIsAddModalOpen(false);
        setAddSuccess(null);
      }, 1500);
    }
  };

  const handlePromoteExisting = async () => {
    if (!existingCustomerData) return;
    setAddError(null);
    setIsPending(true);

    const res = await promoteCustomerAction(existingCustomerData.id, addRole);
    setIsPending(false);

    if (res.error) {
      setAddError(res.error);
      return;
    }

    if (res.user) {
      setUsers((prev) =>
        prev.map((u) => (u.id === res.user!.id ? res.user! : u))
      );
      setAddSuccess(`Customer ${res.user.email} promoted to ${res.user.role}.`);
      setExistingCustomerData(null);
      setTimeout(() => {
        setIsAddModalOpen(false);
        setAddSuccess(null);
      }, 1500);
    }
  };

  const handleRoleChange = async (userId: string, newRole: Role) => {
    setActionAlert(null);
    setIsPending(true);

    const res = await changeUserRoleAction(userId, newRole);
    setIsPending(false);

    if (res.error) {
      setActionAlert({ type: "error", message: res.error });
      return;
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
    setActionAlert({
      type: "success",
      message: `User role successfully updated to ${newRole}.`,
    });
  };

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    setActionAlert(null);
    setIsPending(true);

    const res = await toggleUserActiveAction(userId, !currentActive);
    setIsPending(false);

    if (res.error) {
      setActionAlert({ type: "error", message: res.error });
      return;
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, isActive: !currentActive } : u))
    );
    setActionAlert({
      type: "success",
      message: !currentActive
        ? "User account reactivated."
        : "User account deactivated. User is blocked from signing in immediately.",
    });
  };

  return (
    <div className="space-y-6 text-zinc-900">
      {/* Action Notification Alert */}
      {actionAlert && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in shadow-2xs font-medium ${
            actionAlert.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          {actionAlert.type === "error" ? (
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
          ) : (
            <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
          )}
          <div className="flex-1">{actionAlert.message}</div>
          <button
            onClick={() => setActionAlert(null)}
            className="text-zinc-400 hover:text-zinc-700 font-bold text-sm cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="pl-9 h-10 text-xs bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400 shadow-2xs font-medium"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-10 rounded-xl border border-zinc-300 bg-white px-3 text-xs text-zinc-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500 shadow-2xs font-medium"
          >
            <option value="ALL">All Roles</option>
            <option value="ADMIN">Admins</option>
            <option value="STAFF">Staff</option>
            <option value="CUSTOMER">Customers</option>
          </select>
        </div>

        <Button
          onClick={() => {
            setIsAddModalOpen(true);
            setAddError(null);
            setAddSuccess(null);
            setExistingCustomerData(null);
          }}
          className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs h-10 gap-1.5 cursor-pointer shadow-xs"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add Staff Account</span>
        </Button>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50/80 border-b border-zinc-200 text-[11px] font-bold uppercase tracking-wider text-zinc-600">
              <tr>
                <th className="py-3.5 px-4">User Details</th>
                <th className="py-3.5 px-4">Current Role</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Role Assignment</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isSelf = u.id === currentUserId;

                  return (
                    <tr key={u.id} className="hover:bg-zinc-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-zinc-900 flex items-center gap-2">
                          <span>{u.name || "No Name Provided"}</span>
                          {isSelf && (
                            <span className="text-[10px] text-zinc-500 font-mono font-normal">
                              (You)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono">
                          {u.email}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {u.role === Role.ADMIN ? (
                          <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-bold">
                            ADMIN
                          </Badge>
                        ) : u.role === Role.STAFF ? (
                          <Badge className="bg-blue-50 text-blue-800 border-blue-200 text-[10px] font-bold">
                            STAFF
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-zinc-600 border-zinc-200 bg-zinc-50 font-medium">
                            CUSTOMER
                          </Badge>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {u.isActive ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold text-[11px]">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-rose-700 font-bold text-[11px]">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                            Deactivated
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {isSelf ? (
                          <span className="text-[11px] text-zinc-400 italic">
                            Cannot change own role
                          </span>
                        ) : (
                          <select
                            disabled={isPending}
                            value={u.role}
                            onChange={(e) =>
                              handleRoleChange(u.id, e.target.value as Role)
                            }
                            className="h-8 rounded-lg border border-zinc-300 bg-white px-2 text-xs text-zinc-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500 cursor-pointer disabled:opacity-50 shadow-2xs font-medium"
                          >
                            <option value="CUSTOMER">Customer</option>
                            <option value="STAFF">Staff</option>
                            <option value="ADMIN">Admin</option>
                          </select>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {isSelf ? (
                          <span className="text-[11px] text-zinc-400 italic">
                            Self-protected
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant={u.isActive ? "outline" : "default"}
                            disabled={isPending}
                            onClick={() => handleToggleActive(u.id, u.isActive)}
                            className={`h-8 text-[11px] font-bold cursor-pointer shadow-2xs ${
                              u.isActive
                                ? "border-zinc-200 bg-white text-zinc-700 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-200"
                                : "bg-emerald-600 text-white hover:bg-emerald-700"
                            }`}
                          >
                            {u.isActive ? (
                              <>
                                <UserX className="h-3.5 w-3.5 mr-1 text-rose-600" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-3.5 w-3.5 mr-1" />
                                Reactivate
                              </>
                            )}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff / Admin Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 text-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-amber-500" />
                <h3 className="font-bold text-sm text-zinc-900">
                  Add Store Staff / Admin
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 text-base font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {addError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 font-medium">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{addError}</span>
              </div>
            )}

            {addSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 font-medium">
                <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>{addSuccess}</span>
              </div>
            )}

            {/* If Customer exists prompt */}
            {existingCustomerData ? (
              <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 space-y-3 text-xs">
                <div className="font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  Existing Customer Detected
                </div>
                <p className="text-zinc-700 leading-relaxed">
                  <strong>{existingCustomerData.email}</strong> is already registered as a Customer. Would you like to promote this account to <strong>{addRole}</strong>?
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    onClick={handlePromoteExisting}
                    disabled={isPending}
                    className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs h-9 cursor-pointer shadow-xs"
                  >
                    {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                    Yes, Promote to {addRole}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setExistingCustomerData(null)}
                    disabled={isPending}
                    className="h-9 text-xs border-zinc-200 font-semibold"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateStaff} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 block">
                    Full Name *
                  </label>
                  <Input
                    required
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="e.g. Maria Santos"
                    className="h-10 text-xs bg-white border-zinc-300 text-zinc-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 block">
                    Email Address *
                  </label>
                  <Input
                    required
                    type="email"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    placeholder="staff@rarefinds.ph"
                    className="h-10 text-xs bg-white border-zinc-300 text-zinc-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 block">
                    Account Role *
                  </label>
                  <select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value as "STAFF" | "ADMIN")}
                    className="w-full h-10 rounded-xl border border-zinc-300 bg-white px-3 text-xs text-zinc-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500 font-medium"
                  >
                    <option value="STAFF">STAFF (Fulfill Orders &amp; Update Stock)</option>
                    <option value="ADMIN">ADMIN (Full Platform Privileges)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 block">
                    Temporary Password *
                  </label>
                  <Input
                    required
                    type="password"
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    placeholder="Min 8 chars, uppercase, lowercase, number, symbol"
                    className="h-10 text-xs bg-white border-zinc-300 text-zinc-900"
                  />
                  <p className="text-[10px] text-zinc-500">
                    Must contain at least 8 characters with upper, lower, number, and special symbol.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddModalOpen(false)}
                    disabled={isPending}
                    className="h-9 text-xs border-zinc-200 text-zinc-700 font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs h-9 cursor-pointer gap-1.5 shadow-xs"
                  >
                    {isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UserPlus className="h-3.5 w-3.5" />
                    )}
                    <span>Create {addRole} Account</span>
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
