// Admin-only page logic. Uses the existing localStorage keys and request fields.
initializeStorage();

const adminUser = getCurrentUser();
if (!adminUser || adminUser.role !== "admin") {
    window.location.replace("index.html");
} else {
    document.getElementById("adminWelcome").textContent =
        `Signed in as ${adminUser.username}. Review and manage leave requests.`;
    document.getElementById("logoutButton").addEventListener("click", function () {
        localStorage.removeItem("currentUser");
        window.location.href = "index.html";
    });
    renderAdminDashboard();
}

function escapeAdminText(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
        return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[character];
    });
}

function adminEmployeeName(employee) {
    return employee ? `${employee.firstName || ""} ${employee.surname || ""}`.trim() : "Unknown employee";
}

// Admin page uses its own leave-type label helper because app.js is not loaded here.
function getLeaveTypeName(leaveType) {
    const names = {
        annual: "Annual Leave",
        sick: "Sick Leave",
        maternity: "Maternity Leave",
        parental: "Parental Leave",
        familyResponsibility: "Family Responsibility Leave",
        study: "Study Leave",
        birthday: "Birthday Leave",
        unpaid: "Unpaid Leave"
    };

    return names[leaveType] || leaveType || "Unknown leave type";
}

function adminFormatDate(value) {
    if (!value) return "Not recorded";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}

function renderAdminDashboard(message) {
    const employees = getEmployees() || [];
    const requests = getLeaveRequests() || [];
    const balances = getLeaveBalances() || [];
    const pending = requests.filter(request => request.status === "Pending");

    document.getElementById("pendingCount").textContent = pending.length;
    document.getElementById("employeeCount").textContent = employees.length;
    document.getElementById("requestCount").textContent = requests.length;
    document.getElementById("adminMessage").textContent = message || "";

    const pendingList = document.getElementById("pendingList");
    if (pending.length === 0) {
        pendingList.innerHTML = '<p class="admin-empty">There are no pending leave requests.</p>';
    } else {
        pendingList.innerHTML = pending.map(request => {
            const employee = employees.find(item => item.employeeId === request.employeeId);
            return `<article class="admin-request">
              <div class="admin-request-heading">
                <h3>${escapeAdminText(request.requestId)}</h3>
                <span class="admin-status pending">Pending</span>
              </div>
              <p><strong>Employee:</strong> ${escapeAdminText(adminEmployeeName(employee))} (${escapeAdminText(request.employeeId)})</p>
              <p><strong>Leave type:</strong> ${escapeAdminText(getLeaveTypeName(request.leaveType) || request.leaveType)}</p>
              <p><strong>Dates:</strong> ${escapeAdminText(request.startDate)} to ${escapeAdminText(request.endDate)}</p>
              <p><strong>Working days:</strong> ${escapeAdminText(request.workingDays)}</p>
              <p><strong>Submitted:</strong> ${escapeAdminText(adminFormatDate(request.submittedDate))}</p>
              <p><strong>Reason:</strong> ${escapeAdminText(request.reason)}</p>
              <p><strong>Supporting document:</strong> ${request.supportingDocument ? escapeAdminText(request.supportingDocument) : "None provided"}</p>
              <details><summary>View full request details</summary>
                <p><strong>Employee start date:</strong> ${escapeAdminText(employee ? employee.employmentStartDate : "Unknown")}</p>
                <p><strong>Current ${escapeAdminText(getLeaveTypeName(request.leaveType) || request.leaveType)} balance:</strong>
                ${escapeAdminText(getEmployeeBalance(balances, request.employeeId)?.[request.leaveType] ?? "Not available")} days</p>
              </details>
              <div class="admin-request-actions">
                <button type="button" data-approve="${escapeAdminText(request.requestId)}">Approve</button>
                <button type="button" class="admin-reject-button" data-reject="${escapeAdminText(request.requestId)}">Reject</button>
              </div>
            </article>`;
        }).join("");
    }

    const employeeList = document.getElementById("employeeList");
    if (employees.length === 0) {
        employeeList.innerHTML = '<p class="admin-empty">No employee records were found.</p>';
    } else {
        employeeList.innerHTML = employees.map(employee => {
            const balance = getEmployeeBalance(balances, employee.employeeId) || {};
            const history = requests.filter(request => request.employeeId === employee.employeeId);
            const balanceLabels = [
                ["Annual", "annual"], ["Sick", "sick"], ["Maternity", "maternity"],
                ["Parental", "parental"], ["Family responsibility", "familyResponsibility"],
                ["Study", "study"], ["Birthday", "birthday"], ["Unpaid", "unpaid"]
            ];
            return `<article class="admin-employee">
              <h3>${escapeAdminText(adminEmployeeName(employee))}</h3>
              <p><strong>Employee ID:</strong> ${escapeAdminText(employee.employeeId)}</p>
              <p><strong>Employment start date:</strong> ${escapeAdminText(employee.employmentStartDate)}</p>
              <details>
                <summary>View balances and request history (${history.length})</summary>
                <div class="admin-balance-list">${balanceLabels.map(([label, key]) =>
                    `<span><strong>${label}:</strong> ${escapeAdminText(balance[key] ?? "N/A")} days</span>`
                ).join("")}</div>
                ${history.length ? `<ul class="admin-history-list">${history.map(request =>
                    `<li><strong>${escapeAdminText(request.requestId)}</strong> — ${escapeAdminText(getLeaveTypeName(request.leaveType) || request.leaveType)}, ${escapeAdminText(request.startDate)} to ${escapeAdminText(request.endDate)} — <span class="admin-status ${String(request.status).toLowerCase()}">${escapeAdminText(request.status)}</span>${request.rejectionReason ? `<p><strong>Rejection reason:</strong> ${escapeAdminText(request.rejectionReason)}</p>` : ""}</li>`
                ).join("")}</ul>` : "<p>No leave request history.</p>"}
              </details>
            </article>`;
        }).join("");
    }

    pendingList.querySelectorAll("[data-approve]").forEach(button => {
        button.addEventListener("click", () => approveAdminRequest(button.dataset.approve));
    });
    pendingList.querySelectorAll("[data-reject]").forEach(button => {
        button.addEventListener("click", () => rejectAdminRequest(button.dataset.reject));
    });
}

function getEmployeeBalance(balances, employeeId) {
    return balances.find(balance => balance.employeeId === employeeId);
}

function completedEmploymentMonths(startDate) {
    if (!startDate) return -1;
    const start = new Date(startDate + "T00:00:00");
    const today = new Date();
    let months = (today.getFullYear() - start.getFullYear()) * 12 +
        today.getMonth() - start.getMonth();
    if (today.getDate() < start.getDate()) months--;
    return months;
}

function validateAdminEligibility(request, employee) {
    if (!employee) return "The employee record could not be found.";
    const months = completedEmploymentMonths(employee.employmentStartDate);
    if (request.leaveType === "sick" && months < 3) {
        return "The employee has not completed the required 3 months of employment for sick leave.";
    }
    if (request.leaveType === "maternity") {
        if (employee.gender !== "female") return "The employee does not meet the configured maternity leave eligibility rule.";
        if (months < 12) return "The employee has not completed 12 months of employment for paid maternity leave.";
    }
    if (request.leaveType === "birthday") {
        if (!employee.dateOfBirth) return "The employee date of birth is missing, so birthday leave eligibility cannot be confirmed.";
        const birthMonth = new Date(employee.dateOfBirth + "T00:00:00").getMonth();
        const start = new Date(request.startDate + "T00:00:00");
        const end = new Date(request.endDate + "T00:00:00");
        if (start.getMonth() !== birthMonth || end.getMonth() !== birthMonth ||
            start.getFullYear() !== end.getFullYear()) {
            return "Birthday leave must be taken within the employee's birthday month.";
        }
    }
    return "";
}

function approveAdminRequest(requestId) {
    const requests = getLeaveRequests() || [];
    const request = requests.find(item => item.requestId === requestId);
    if (!request || request.status !== "Pending") {
        renderAdminDashboard("This request no longer exists or is not pending. Refresh and try again.");
        return;
    }

    const employees = getEmployees() || [];
    const employee = employees.find(item => item.employeeId === request.employeeId);
    const eligibilityError = validateAdminEligibility(request, employee);
    if (eligibilityError) {
        renderAdminDashboard("Approval blocked: " + eligibilityError);
        return;
    }

    // Re-read current data immediately before decision to avoid stale balances.
    const balances = getLeaveBalances() || [];
    const balance = getEmployeeBalance(balances, request.employeeId);
    if (!balance) {
        renderAdminDashboard("Approval blocked: no leave balance record was found for this employee.");
        return;
    }

    const isPaidLeave = request.leaveType !== "unpaid";
    if (isPaidLeave) {
        if (typeof balance[request.leaveType] !== "number") {
            renderAdminDashboard("Approval blocked: the employee's balance for this leave type is missing or invalid.");
            return;
        }
        const otherPendingDays = requests.filter(item =>
            item.employeeId === request.employeeId &&
            item.leaveType === request.leaveType &&
            item.status === "Pending" &&
            item.requestId !== request.requestId
        ).reduce((total, item) => total + (Number(item.workingDays) || 0), 0);
        const availableAfterOtherPending = balance[request.leaveType] - otherPendingDays;
        if (Number(request.workingDays) <= 0 ||
            Number(request.workingDays) > availableAfterOtherPending) {
            renderAdminDashboard(`Approval blocked: available ${getLeaveTypeName(request.leaveType)} balance is insufficient after accounting for other pending requests.`);
            return;
        }
    } else if (Number(request.workingDays) <= 0) {
        renderAdminDashboard("Approval blocked: the number of working days is invalid.");
        return;
    }

    // Do not allow overlapping pending/approved requests to be approved.
    const overlapping = requests.some(item =>
        item.requestId !== request.requestId &&
        item.employeeId === request.employeeId &&
        (item.status === "Pending" || item.status === "Approved") &&
        request.startDate <= item.endDate && request.endDate >= item.startDate
    );
    if (overlapping) {
        renderAdminDashboard("Approval blocked: this request overlaps another pending or approved request.");
        return;
    }

    if (!window.confirm(`Approve ${request.requestId} for ${request.workingDays} working day(s)?`)) return;

    // Recheck status and balance after confirmation.
    const latestRequests = getLeaveRequests() || [];
    const latestRequest = latestRequests.find(item => item.requestId === requestId);
    if (!latestRequest || latestRequest.status !== "Pending") {
        renderAdminDashboard("This request was already processed. No balance was changed.");
        return;
    }
    const latestBalances = getLeaveBalances() || [];
    const latestBalance = getEmployeeBalance(latestBalances, latestRequest.employeeId);
    if (!latestBalance) {
        renderAdminDashboard("Approval blocked: leave balance record is missing.");
        return;
    }
    if (latestRequest.leaveType !== "unpaid") {
        const otherPending = latestRequests.filter(item =>
            item.employeeId === latestRequest.employeeId &&
            item.leaveType === latestRequest.leaveType &&
            item.status === "Pending" &&
            item.requestId !== requestId
        ).reduce((total, item) => total + (Number(item.workingDays) || 0), 0);
        if (typeof latestBalance[latestRequest.leaveType] !== "number" ||
            Number(latestRequest.workingDays) <= 0 ||
            Number(latestRequest.workingDays) > latestBalance[latestRequest.leaveType] - otherPending) {
            renderAdminDashboard("Approval blocked: the balance changed while you were reviewing this request.");
            return;
        }
        latestBalance[latestRequest.leaveType] -= Number(latestRequest.workingDays);
    }

    latestRequest.status = "Approved";
    latestRequest.decisionDate = new Date().toISOString();
    latestRequest.rejectionReason = null;

    // Store the balance and request decisions. localStorage is not a multi-user database.
    localStorage.setItem("leaveBalances", JSON.stringify(latestBalances));
    localStorage.setItem("leaveRequests", JSON.stringify(latestRequests));
    renderAdminDashboard(`Request ${requestId} approved successfully.`);
}

function rejectAdminRequest(requestId) {
    const requests = getLeaveRequests() || [];
    const request = requests.find(item => item.requestId === requestId);
    if (!request || request.status !== "Pending") {
        renderAdminDashboard("This request no longer exists or is not pending. Refresh and try again.");
        return;
    }
    const reason = window.prompt("Enter the reason for rejecting this leave request:");
    if (reason === null) return;
    if (!reason.trim()) {
        renderAdminDashboard("A rejection reason is required. The request has not been changed.");
        return;
    }

    const latestRequests = getLeaveRequests() || [];
    const latestRequest = latestRequests.find(item => item.requestId === requestId);
    if (!latestRequest || latestRequest.status !== "Pending") {
        renderAdminDashboard("This request was already processed. No changes were made.");
        return;
    }
    latestRequest.status = "Rejected";
    latestRequest.decisionDate = new Date().toISOString();
    latestRequest.rejectionReason = reason.trim();
    localStorage.setItem("leaveRequests", JSON.stringify(latestRequests));
    renderAdminDashboard(`Request ${requestId} rejected. No leave balance was deducted.`);
}

const leaveHistoryButton = document.getElementById("leaveHistoryButton");

if (leaveHistoryButton) {
    leaveHistoryButton.addEventListener("click", function () {
        window.location.href = "leave-history.html";
    });
}