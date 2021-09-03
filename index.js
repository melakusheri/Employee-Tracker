const mysql = require('mysql2/promise');
const inquirer = require('inquirer');
const cTable = require('console.table');
const DATABASE = 'employees_db'

// Using pool instead of connection for mysql2/promise to work
const pool = mysql.createPool(
  {
    host: 'localhost',
    user: 'root',
    password: 'mypass',
    database: DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  },
  console.log(`Connected to the database.`)
);

// The main function of the app
async function main_menu() { 

  // Holds all main menu questions
  const mainMenuQs = [
    {
      name: 'selection',
      type: 'list',
      message: 'What would you like to do?',
      choices: [
        "View All Employees",
        "Add Employee",
        "Update Employee Role",
        "View All Departments",
        "Add Department",
        "View All Roles",
        "Add Role",
        "Quit"]
    }
  ];

  // Intro art
  console.log(`
  
███████╗███╗░░░███╗██████╗░██╗░░░░░░█████╗░██╗░░░██╗███████╗███████╗
██╔════╝████╗░████║██╔══██╗██║░░░░░██╔══██╗╚██╗░██╔╝██╔════╝██╔════╝
█████╗░░██╔████╔██║██████╔╝██║░░░░░██║░░██║░╚████╔╝░█████╗░░█████╗░░
██╔══╝░░██║╚██╔╝██║██╔═══╝░██║░░░░░██║░░██║░░╚██╔╝░░██╔══╝░░██╔══╝░░
███████╗██║░╚═╝░██║██║░░░░░███████╗╚█████╔╝░░░██║░░░███████╗███████╗
╚══════╝╚═╝░░░░░╚═╝╚═╝░░░░░╚══════╝░╚════╝░░░░╚═╝░░░╚══════╝╚══════╝

████████╗██████╗░░█████╗░░█████╗░██╗░░██╗███████╗██████╗░
╚══██╔══╝██╔══██╗██╔══██╗██╔══██╗██║░██╔╝██╔════╝██╔══██╗
░░░██║░░░██████╔╝███████║██║░░╚═╝█████═╝░█████╗░░██████╔╝
░░░██║░░░██╔══██╗██╔══██║██║░░██╗██╔═██╗░██╔══╝░░██╔══██╗
░░░██║░░░██║░░██║██║░░██║╚█████╔╝██║░╚██╗███████╗██║░░██║
░░░╚═╝░░░╚═╝░░╚═╝╚═╝░░╚═╝░╚════╝░╚═╝░░╚═╝╚══════╝╚═╝░░╚═╝

`);

  // Run this menu until "quit" is selected
  let running = true;
  while (running) {

    console.log(" "); // Just for a bit of space between each round

    // Choice user made in main menu
    let selection = await inquirer.prompt(mainMenuQs);
    
    console.log(" ") // Just for a bit of space

    switch (selection.selection) {

      case ("View All Employees"):
        await viewEmployeeTable();
        break;

      case ("Add Employee"):
        await addEmployee();
        break;

      case ("Update Employee Role"):
        await updateEmpRole();
        break;

      case ("View All Departments"):
        await viewAllDepartments();
        break;

      case ("Add Department"):
        await addDepartment();
        break;

      case ("Add Role"):
        await addRole();
        break;

      case ("View All Roles"):
        await viewAllRoles();
        break;

      case ("Quit"):
        running = false;
        break;
    }
  }
}

// Display (modified) employee table
async function viewEmployeeTable() {

  const viewAllEmployeesQry = `
  SELECT 
    emp.id, 
    emp.first_name,
    emp.last_name,
    roles.title,
    department.name AS department,
    roles.salary,
    CONCAT(man.first_name, ' ', man.last_name) AS manager
  FROM employee emp
  JOIN roles
    ON emp.role_id = roles.id
  JOIN department
    ON department.id = roles.department_id
  LEFT JOIN employee man
    ON emp.manager_id = man.id
  ORDER BY emp.id ASC;
`;

  let result = await pool.query(viewAllEmployeesQry);
  if (result[0].length < 1) {
    throw new Error('Department with this name was not found');
  }
  console.table(result[0]);
}

// Add a new employee to the employee table
async function addEmployee() {
  // Ask user to enter the new employee's first name
  let selectFName = [
    {
      name: 'selection',
      message: "What is this employee's first name?",
    }
  ];
  let selectedFName = await inquirer.prompt(selectFName);

  const empFirstName = selectedFName.selection;  // Holds employee's first name

  // Ask user to enter the new employee's last name
  let selectLName = [
    {
      name: 'selection',
      message: "What is this employee's last name?",
    }
  ];
  let selectedLName = await inquirer.prompt(selectLName);

  const empLastName = selectedLName.selection; // Holds employee's last name

  // Generate a list of all currently existing roles
  const getRolesListQry = `
    SELECT title FROM roles 
    `;

  let result = await pool.query(getRolesListQry);
  if (result[0].length < 1) {
    throw new Error('Could not generate list of role titles');
  }

  let roleList = [];
  await result[0].forEach((role) => roleList.push(role.title));

  // Ask user to select a role from this list
  const selectRole = [
    {
      name: 'selection',
      type: 'list',
      message: "Select this employee's role",
      choices: roleList
    }
  ];
  let selectedRole = await inquirer.prompt(selectRole);
  let roleName = selectedRole.selection;  // Holds name of selected role

  // Find matching id for this role
  const getRoleIDQry = `
    SELECT id FROM roles 
    WHERE roles.title = ?
    `;

  result = await pool.query(getRoleIDQry, [roleName]);
  if (result[0].length < 1) {
    throw new Error('Role with this name was not found');
  }

  let empRoleID = result[0][0].id; // Holds role id for this role

  // Generate a list of all currently existing employees
  const getEmployeeListQry = `
    SELECT CONCAT(first_name, ' ', last_name) AS name FROM employee
    `;

  result = await pool.query(getEmployeeListQry);
  if (result[0].length < 1) {
    throw new Error('Couldn not generate list of employee names');
  }

  let employeeList = [];
  await result[0].forEach((employee) => employeeList.push(employee.name));

  // Ask user to select an employee from this list
  const selectManager = [
    {
      name: 'selection',
      type: 'list',
      message: "Select this employee's manager",
      choices: employeeList
    }
  ];
  let selectedManager = await inquirer.prompt(selectManager);
  let managerName = selectedManager.selection;  // Holds name of selected role

  // Find matching id for this role
  const getManagerIDQry = `
    SELECT id FROM employee 
    WHERE CONCAT(employee.first_name, ' ', employee.last_name) = ?
    `;

  result = await pool.query(getManagerIDQry, [managerName]);
  if (result[0].length < 1) {
    throw new Error('Employee with this name was not found');
  }

  let empManagerID = result[0][0].id; // Holds role id for this role

  // Add employee to the employee table
  const addEmployeeQry = `
  INSERT INTO employee (first_name, last_name, role_id, manager_id) 
  VALUES (?, ?, ?, ?);
  `;

  result = await pool.query(addEmployeeQry, [empFirstName, empLastName, empRoleID, empManagerID]);
  if (result[0].length < 1) {
    throw new Error('Something went wrong');
  }
  else { console.log(`${empFirstName} ${empLastName} has been added to the list of employees`); }

}

// Update an employee's role
async function updateEmpRole() {
  // Generate a list of all currently existing employees
  const getEmployeeListQry = `
    SELECT CONCAT(first_name, ' ', last_name) AS name FROM employee
    `;

  let result = await pool.query(getEmployeeListQry);
  if (result[0].length < 1) {
    throw new Error('Couldn not generate list of employee names');
  }

  let employeeList = [];
  await result[0].forEach((employee) => employeeList.push(employee.name));

  // Ask user to select an employee from this list
  const selectEmp = [
    {
      name: 'selection',
      type: 'list',
      message: "Select the employee whose role should be updated",
      choices: employeeList
    }
  ];
  let selectedEmp = await inquirer.prompt(selectEmp);
  let empName = selectedEmp.selection;  // Holds name of selected role

  // Generate a list of all currently existing roles
  const getRolesListQry = `
    SELECT title FROM roles 
    `;

  result = await pool.query(getRolesListQry);
  if (result[0].length < 1) {
    throw new Error('Could not generate list of role titles');
  }

  let roleList = [];
  await result[0].forEach((role) => roleList.push(role.title));

  // Ask user to select a role from this list
  const selectRole = [
    {
      name: 'selection',
      type: 'list',
      message: "Select the role that should be assigned to the employee",
      choices: roleList
    }
  ];
  let selectedRole = await inquirer.prompt(selectRole);
  let roleName = selectedRole.selection;  // Holds name of selected role

  // Find matching id for this role
  const getRoleIDQry = `
    SELECT id FROM roles 
    WHERE roles.title = ?
  `;

  result = await pool.query(getRoleIDQry, [roleName]);
  if (result[0].length < 1) {
    throw new Error('Role with this name was not found');
  }

  let roleID = result[0][0].id; // Holds role id for this role

  // Update the selected employee's role to the selected role
  const updateRoleQry = `
    UPDATE employee
    SET role_id = ?
    WHERE CONCAT(employee.first_name, ' ', employee.last_name) = ?;
    `;
  result = await pool.query(updateRoleQry, [roleID, empName]);
  if (result[0].length < 1) {
    throw new Error("Could not update employee's role");
  }
  console.log(`${empName}'s role has been updated.`);
}

// Display department table
async function viewAllDepartments() {
  const viewAllDepartmentsQry = `SELECT * FROM department ORDER BY department.id ASC;`;

  let result = await pool.query(viewAllDepartmentsQry);
  if (result[0].length < 1) {
    throw new Error('Department with this name was not found');
  }
  console.table(result[0]);
}

// Display (modified) roles table
async function viewAllRoles() {
  const viewAllRolesQry = `
  SELECT roles.id, roles.title, department.name AS department, roles.salary 
  FROM roles 
  JOIN department ON roles.department_id = department.id
  ORDER BY roles.id ASC;
  `;

  let result = await pool.query(viewAllRolesQry);
  if (result[0].length < 1) {
    throw new Error('Department with this name was not found');
  }
  console.table(result[0]);
}

// Add a new department to the department table
async function addDepartment() {
  // Ask for name of department that user wants to add
  let selectDepartment = [
    {
      name: 'selection',
      message: 'What is the name of the department?',
    }
  ];

  let selectedDep = await inquirer.prompt(selectDepartment);
  const department = selectedDep.selection;

  // Insert the new department into department table
  const addDepartmentQry = `
        INSERT INTO department (name) 
        VALUES (?);
        `;

  let result = await pool.query(addDepartmentQry, [department]);
  if (result[0].length < 1) {
    throw new Error('Something went wrong');
  }
  else { console.log(`${department} department has been added`); }
}

// Add a new role to the role table
async function addRole() {

  // Ask user to specify title for the new role
  let selectTitle = [
    {
      name: 'selection',
      message: 'What is the title for this role?',
    }
  ];
  let selectedTitle = await inquirer.prompt(selectTitle);

  const title = selectedTitle.selection;  // Holds title for role

  // Ask user to enter the salary for the new role
  let selectSalary = [
    {
      name: 'selection',
      message: 'What is the salary for this role?',
    }
  ];
  let selectedSalary = await inquirer.prompt(selectSalary);

  const salary = selectedSalary.selection;  // Holds salary for role

  // Generate a list of all currently existing departments
  const getDepartmentListQry = `
  SELECT name FROM department 
  `;

  let result = await pool.query(getDepartmentListQry);
  if (result[0].length < 1) {
    throw new Error('Couldn not generate list of department names');
  }

  let departmentList = result[0]; // Holds array of all department names

  // Ask user to select a department from this list
  const selectDepartment = [
    {
      name: 'selection',
      type: 'list',
      message: 'Select the department that this role belongs to',
      choices: departmentList
    }
  ];
  let selectedDepartment = await inquirer.prompt(selectDepartment);
  let departmentName = selectedDepartment.selection;  // Holds name of selected department

  // Find matching id for this department
  const getDepartmentIDQry = `
  SELECT id FROM department 
  WHERE department.name = ?
  `;

  result = await pool.query(getDepartmentIDQry, [departmentName]);
  if (result[0].length < 1) {
    throw new Error('Department with this name was not found');
  }

  let departmentID = result[0][0].id; // Holds department id for this role

  // Insert new role into role table
  const addRoleQry = `
  INSERT INTO roles (title, salary, department_id) 
  VALUES (?, ?, ?);
  `;

  result = await pool.query(addRoleQry, [title, salary, departmentID]);
  if (result[0].length < 1) {
    throw new Error('Something went wrong');
  }
  else { console.log(`${title} role has been added`); }
}

// Initialize app
main_menu();