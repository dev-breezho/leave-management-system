// Displays only the signed-in employee's leave requests.
initializeStorage();

const historyUser = getCurrentUser();
if (!historyUser || historyUser.role !== "employee") {
    window.location.replace("index.html");
} else {
    document.getElementById("historyWelcome").textContent =
        `Requests for ${historyUser.firstName || ""} ${historyUser.surname || ""}`.trim();

    document.getElementById("backToDashboard").addEventListener("click", function () {
        window.location.href = "employee-dashboard.html";
    });

    renderLeaveHistory();
}

function historyEscape(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
    });
}

function historyLeaveTypeName(leaveType) {
    const names = {
        annual: "Annual Leave", sick: "Sick Leave", maternity: "Maternity Leave",
        parental: "Parental Leave", familyResponsibility: "Family Responsibility Leave",
        study: "Study Leave", birthday: "Birthday Leave", unpaid: "Unpaid Leave"
    };
    return names[leaveType] || leaveType || "Unknown leave type";
}

function historyFormatDate(value) {
    if (!value) return "Not recorded";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}

function renderLeaveHistory() {
    const requests = (getLeaveRequests() || [])
        .filter(request => request.employeeId === historyUser.employeeId)
        .sort((a, b) => new Date(b.submittedDate || 0) - new Date(a.submittedDate || 0));
    const list = document.getElementById("leaveHistoryList");

    if (requests.length === 0) {
        list.innerHTML = '<p class="admin-empty">You have not submitted any leave requests yet.</p>';
        return;
    }

    list.innerHTML = requests.map(request => {
        const statusClass = String(request.status || "").toLowerCase();
        return `<article class="admin-request">
            <div class="admin-request-heading">
                <h3>${historyEscape(request.requestId || "Leave request")}</h3>
                <span class="admin-status ${historyEscape(statusClass)}">${historyEscape(request.status || "Unknown")}</span>
            </div>
            <p><strong>Leave type:</strong> ${historyEscape(historyLeaveTypeName(request.leaveType))}</p>
            <p><strong>Dates:</strong> ${historyEscape(request.startDate)} to ${historyEscape(request.endDate)}</p>
            <p><strong>Working days:</strong> ${historyEscape(request.workingDays)}</p>
            <p><strong>Submitted:</strong> ${historyEscape(historyFormatDate(request.submittedDate))}</p>
            <p><strong>Reason:</strong> ${historyEscape(request.reason)}</p>
            <p><strong>Supporting document:</strong> ${request.supportingDocument ? historyEscape(request.supportingDocument) : "None provided"}</p>
            ${request.decisionDate ? `<p><strong>Decision date:</strong> ${historyEscape(historyFormatDate(request.decisionDate))}</p>` : ""}
            ${request.rejectionReason ? `<p><strong>Rejection reason:</strong> ${historyEscape(request.rejectionReason)}</p>` : ""}
        </article>`;
    }).join("");
}
