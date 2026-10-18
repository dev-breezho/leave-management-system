
function initializeStorage() {
    // Load existing employees from localStorage.
    const savedEmployees = localStorage.getItem("employees");

    if (!savedEmployees) {
        localStorage.setItem("employees", JSON.stringify(employees));
    } else {
        const storedEmployees = JSON.parse(savedEmployees);

        // Add employees that are not already stored.
        employees.forEach(function (employee) {
            const employeeExists = storedEmployees.some(
                function (storedEmployee) {
                    return storedEmployee.employeeId === employee.employeeId;
                }
            );

            if (!employeeExists) {
                storedEmployees.push(employee);
            }
        });

        localStorage.setItem("employees", JSON.stringify(storedEmployees)
        );
    }

    if (!localStorage.getItem("admin")) {
        localStorage.setItem("admin", JSON.stringify(admin));
    }

    if (!localStorage.getItem("leaveBalances")) {
        localStorage.setItem("leaveBalances", JSON.stringify(leaveBalances)
        );
    }

    if (!localStorage.getItem("leaveRequests")) {
        localStorage.setItem("leaveRequests", JSON.stringify([]));
    }
}


function getEmployees() {
    return JSON.parse(localStorage.getItem("employees"));
}

function getAdmin() {
    return JSON.parse(localStorage.getItem("admin"));
}

function getLeaveBalances() {
    return JSON.parse(localStorage.getItem("leaveBalances"));
}

function getLeaveRequests() {
    return JSON.parse(localStorage.getItem("leaveRequests"));
}

function setCurrentUser(user) {
    localStorage.setItem("currentUser", JSON.stringify(user));
}

function getCurrentUser() {
    return JSON.parse(localStorage.getItem("currentUser"));
}