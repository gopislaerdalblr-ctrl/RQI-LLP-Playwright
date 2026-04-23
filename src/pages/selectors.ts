export const S = {
  adminLogin: {
    signIn: ["#sap-link", "button#sap-link", "a#sap-link"],

    // Gigya renders login ID as data-gigya-name="loginID"
    email: [
      'input[data-gigya-name="loginID"]:visible',
      "input.gigya-input-text:visible",
      'input[name="username"]:visible',
      'input[aria-label="Email"]:visible',
    ],

    password: [
      'input[data-gigya-name="password"]:visible',
      "input.gigya-input-password:visible",
      'input[name="password"]:visible',
    ],

    submit: [
      "input.gigya-input-submit:visible",
      "button.gigya-input-submit:visible",
      'button:has-text("Log In"):visible',
      'button:has-text("Sign in"):visible',
      'button[type="submit"]:visible',
      'input[type="submit"]:visible',
    ],
    superAdminRole: [
      'a.circle_login:has-text("Super Administrator")',
      'a:has-text("Super Administrator")',
    ],
    admindashboard: {
      OrgListingNav: [
        '.huge-title:has-text("Organizations")',
        'div:has(.huge-title:has-text("Organizations"))',
      ],
    },

    orgListing: {
      searchInput: [
        'input[placeholder*="org_id"]',
        'input[type="text"]',
        'input[name="org_id"]',
      ],
      OrganizationsLink: [
        'a[href*="/admin/organizations"]',
        'a:has-text("Organizations")',
        'a.active:has-text("Organizations")',
        'a[href$="/organizations"]',
      ],

      searchButton: [
        "#search",
        "button.search_icon.organization-btn-top",
        "button:has(.fa-search)",
      ],
    },

    orgListingActions: {
      OrgListingRow: [
        "table tbody tr", // Primary: Standard HTML table row
        ".rt-tr-group", // Secondary: Common React-Table row class
        "//table//tbody//tr", // Fallback: Strict XPath
      ],

      ClearSearchButton: [
        'a:has-text("Clear Search")', // Primary: The exact link text
        'button:has-text("Clear Search")', // Secondary: Just in case it's a styled button
        'text="Clear Search"', // Fallback: Broad text match
      ],

      orgActions: [
        'a.action_dropdown',
        'a.action_dropdown.dropdown-toggle',
        'a[data-bs-toggle="dropdown"]',
        'a[role="button"]',
        'a.action_dropdown[data-bs-toggle="dropdown"]',
        'a.action_dropdown[aria-expanded]',
        '//a[contains(@class,"action_dropdown")]',
        '//a[@data-bs-toggle="dropdown"]',
        '//a[contains(@class,"action_dropdown") and @data-bs-toggle="dropdown"]',
        '//a[@role="button" and contains(@class,"dropdown-toggle")]',
        '//a[contains(text(),"...")]',
      ],
      orgDetailsAction: [
        "text=Organization Details",
        "a.dropdown-item:has-text('Organization Details')",
        "a[href*='/manage_organization/']",
        "//a[normalize-space(text())='Organization Details']",
      ],
    },
    orgProducts: {
      orgProducts: ['a:has-text("Products")', 'a[href*="manage_product"]'],
      addProductLink: ['a.white_btn:has-text("Add Product")'],
      addProductdrop: ["#filter-option pull-left"],

      productDropdown: [
        'span.filter-option:has-text("Select Product"), span.filter-option.pull-left',
        'button.dropdown-toggle:has(.filter-option:has-text("Select Product"))',
        '.filter-option.pull-left:has-text("Select Product")',
      ],
      productSearchInput: ["#autocompleteProduct"],
      productList: ["#scrollProduct"],
      productOptionByText: (text: string) =>
        `#scrollProduct li a span.text:has-text("${text}")`,
      organizationPayLabel: ['label[for="organization_pay"]'],
      unlimitedRadio: [
        "input#unlimited",
        'input[name="license_limit_type"][value="2_unlimited"]',
        'label:has-text("Unlimited")',
      ],
      submitAddProduct: ["#submitBtn"],
      courseVisibleText: (text: string) => `text=${text}`,
      productsTable: ['table:has(th:has-text("PRODUCT CODE"))'],
      dataTablesInfo: [
        '.dataTables_info',
        'div.dataTables_info',
        "[id$='_info']",
      ],
      flashSuccess: [
        '.alert-success',
        '.flash-success',
        'div:has-text("added successfully")',
      ],
    },
    manageStudents: {
      manageStudentsNav: ['a:has-text("Manage Students")'],
      importDemographicBtn: [
        'button:has-text("Import Demographic Data")',
        'a:has-text("Import Demographic Data")',
      ],
      downloadTemplateLink: [
        'a:has-text("download a formatted blank CSV file")',
        'a[href*="download"]',
      ],
      chooseFileInput: ['input[type="file"]'],
      uploadBtn: ['button:has-text("Upload")', 'input[value="Upload"]'],
      searchUserInput: [
        'input[placeholder*="User"]',
        'input[name*="user"]',
        'input[id*="user"]',
      ],
      searchBtn: [
        "button:has(i.fa-search)",
        "a:has(i.fa-search)",
        'button:has-text("Search")',
      ],
      csvDownloadFallback: [
        'a:has-text("download"):has-text("CSV")',
        'a:has-text("download"):has-text("template")',
        'a[href*="download"]',
        'a[href*=".csv"]',
      ],
      hiddenFileInput: ['input#upload[type="file"]'],
      inputUploadBtn: [
        'input[type="submit"][value="Upload"]',
        'input[type="button"][value="Upload"]',
        'input[value="Upload"]',
      ],
      anyUploadBtn: [
        'button:has-text("Upload")',
        'a:has-text("Upload")',
      ],
      importSuccessMsg: ['text=/your import request was processed successfully/i'],
      modalCloseBtn: [
        'button:has-text("Close")',
        'input[value="Close"]',
        'a:has-text("Close")',
      ],
      modalCloseBtnX: ['button.close'],
      emptyStateText: ['text="Please search and/or select filters to view the record."'],
      resultsTable: [
        'table#learnerTableList',
        'table.dataTable',
      ],
      noRecordsText: [
        'text="No data available in table"',
        'text="No records found"',
      ],
      paginationContainer: [
        'div.dataTables_paginate',
        '.dataTables_paginate',
        'nav[aria-label*="pagination"]',
      ],
      paginationNextBtn: [
        'a:has-text("Next")',
        'button:has-text("Next")',
        'li:has-text("Next") a',
      ],
      paginationPage1Btn: [
        'a:has-text("1")',
        'button:has-text("1")',
      ],
    },

    AccessOrganization: [
      'a[user-type="LMS"]',
      'a:has-text("Access Organization")',
      'a[href*="elearning_login"]',
    ],
    Assignments: [
      'a[href="/manage/assignments"]',
      'a:has-text("Assignments")',
      'a[role="button"]',
      'a[aria-haspopup="true"]',
    ],
    CreateAssignment: [
      'a#btn_primary:has-text("Create Assignment")',
      'a[href*="add_assignments"]',
      'a:has-text("Create Assignment")',
      'a.btn_primary[data-toggle="modal"]',
    ],
    ManualSelection: [
      'label[for="manual"]',
      'label:has-text("Manual")',
      '.form-check-label.big:has-text("Manual")',
    ],
    AutomaticSelection: [
      'label[for="automatic"]',
      'label:has-text("Automatic")',
      '.form-check-label.big:has-text("Automatic")',
    ],
    CourseCurriculumDropdown: [
      'span.filter-option:has-text("Select course/curriculum")',
      'span.filter-option.pull-left:has-text("Select course")',
      '.filter-option.pull-left',
    ],
    CourseSearchInput: [
      'input[aria-label="Search"][role="textbox"]',
      'input.form-control[placeholder="Search"]',
      'input[autocomplete="off"][placeholder="Search"]',
    ],
    SpecificDateRadio: [
      'label#specific_due_date_label',
      'input#radio_options[value="specific_due_date"]',
      'label:has-text("Specific Date")',
      'input[name="due_date"][value="specific_due_date"]',
    ],
    AssignmentNextButton: [
      'a#addLearnersSection',
      '#addLearnersSection',
      'a.btn_primary:has-text("Next")',
      'a[href="javascript:void(0)"]#addLearnersSection',
    ],
    AssignmentTitleInput: [
      'input#assignment_name',
      'input[name="assignment_name"]',
      'input[placeholder="Assignment Title"]',
      '#assignment_name',
    ],
    CreateAssignmentButton: [
      'a#addassignmentmanual',
      '#addassignmentmanual',
      'a.btn_primary:has-text("Create Assignment")',
      'a[href="javascript:void(0)"]#addassignmentmanual',
    ],
    AddLearnerButton: [
      'button#add-learners',
      '#add-learners',
      'button.btn_primary:has-text("Add Learner")',
      'button[data-target="#learnersDialog"]',
    ],
    AssignmentSearchUser: [
      'input[placeholder*="Search"]',
      '#searchUser'
    ],
    SearchaAsignmentTitleInput: [
      'input#assignment_name',
      'input[name="assignment_name"]',
      'input[placeholder="Assignment Title"]',
      'input.form-control#assignment_name',
    ],
    AssignmentSearchButton: [
      'button#search',
      '#search',
      'button:has-text("Search")',
      'button.btn_primary#search',
    ],
    AssignmentDueDateInput: [
      'input#assignment_specific_due_date',
      '#assignment_specific_due_date',
      'input[name="assignment_specific_due_date"]',
      'input.datePicker#assignment_specific_due_date',
    ],
    CalendarActiveDays: [
      'td.day:not(.old):not(.new)',
      'td:not(.ui-state-disabled):not(.disabled)'
    ],
    NoRecurrenceRadioLabel: [
      'label:text-is("No")'
    ],
    DueDateInput: [
      'input[name="due_date"]',
      'input#due_date',
      'input#specific_due_date',
      'input[placeholder*="Date"]',
    ],
    ModalSearchInput: [
      '#learnersDialog input[type="search"]',
      '#learnersDialog input[placeholder="Search"]',
      'input.form-control.input-sm',
      'input[aria-controls="DataTables_Table_0"]',
    ],
    ModalSearchButton: [
      '#learnersDialog button#search',
      '#learnersDialog button:has-text("Search")',
      '#learnersDialog .btn_primary:has-text("Search")',
    ],
    ModalAddButton: [
      '#learnersDialog button#add-selected-learners',
      '#learnersDialog button:has-text("Add")',
      'button:has-text("Save")',
      '#addLearnerSubmit',
    ],
    learnerStatus: {
      navLink: ['a:has-text("Learner Status")', 'a[href*="learner_status"]'],
    },
    SupportActionDropdown: [
      'a.dropdown-toggle:has-text("Support Action")',
      'a[data-toggle="dropdown"]:has-text("Support Action")',
      'a[href="#"][aria-expanded]',
      'a:has-text("Support Action")',
    ],
    MergeAccountOption: [
      'a[href="/manage/merge_account"]',
      'a:has-text("Merge Account")',
      'a[role="button"]',
      'a[aria-haspopup="true"]',
    ],
    profileDropdown: [
      "a.pro_pic.pii-user-info",
      'a[data-toggle="dropdown"].pro_pic',
      'a.pro_pic:has-text("GS")',
    ],
    logoutLink: [
      'a[href*="elearning_signout"]',
      'a[href*="signout"]',
      'a:has-text("Logout - Org2000209")',
      'a:has-text("Logout")',
    ],
    GlobalUserManagementWidget: [
      "button#usermanage-tooltip",
      'button.admin-nav-icon:has-text("User Mgmt")',
      'button[data-toggle="tooltip"]:has(em.fa-user)',
      '//button[@id="usermanage-tooltip"]',
    ],
    GlobalUserManagement: [
      'a:has-text("User Management")',
      'a[href="/admin/manageuser?clearsearch=yes"]',
      'a[href*="/admin/manageuser"]',
      'a[href*="clearsearch=yes"]',
    ],
    EmailField: [
      "input#email",
      'input[name="email"]',
      'input[placeholder="Email Address"]',
      "input#email.form-control.mb0",
    ],
    globalUserSearchButton: [
      "button#search_list",
      'button[aria-label="Search"]',
      "button:has(em.fa-search)",
      'button[type="submit"].btn-default',
    ],
    globalUserEdit: [
      'a[title="Edit user"]',
      "a:has(em.fa-pencil-square-o)",
      "em.fa-pencil-square-o",
    ],
    NewRoleDetails: [
      'a:has-text("New Role Details")',
      'a[href*="/admin/newrole/"]',
      'a[href^="/admin/newrole/ZFhObGN"]',
    ],
    passwordFieldCheck: ['input[type="password"]'],
    loadingSpinner: [
      '.loading',
      '.spinner',
      '#loading-image',
    ],
    specificDateLabel: ['label'],
    addLearnerConfirmBtn: ['button:has-text("Add")'],
    assignmentSuccessBanner: ['text="Assignment was created successfully."'],
    assignmentSearchOmniBtn: [
      'button:has-text("Search")',
      'input[type="submit"][value="Search"]',
      'input[type="button"][value="Search"]',
      '[aria-label="Search"]',
      '.btn-search',
      '#search-btn',
    ],
    assignmentResultRow: ['table.dataTable tbody tr'],
    mergeUsers: {
      dotsMenuFallback: ['text="..."'] as (string | RegExp)[],
      orgDetailsDropdownProof: [/Organi[sz]ation Details/i] as (string | RegExp)[],
      accessOrganizationRegex: [/Access Organi[sz]ation/i] as (string | RegExp)[],
    },
  },

  moodle: {
    username: ["input#username", "input[name='username']"],
    password: ["input#password", "input[name='password']"],
    loginBtn: ["button#loginbtn", "#loginbtn"],
    userMenu: [".userbutton", ".usermenu", ".dropdown-toggle"],
  },

  moodleUserForm: {
    username: ["#id_username"],
    passwordToggle: [
      "span[data-passwordunmask='edit']",
      "em >> text=Click to enter text",
    ],
    passwordInput: ["#id_newpassword"],
    firstname: ["#id_firstname"],
    lastname: ["#id_lastname"],
    email: ["#id_email"],
    createBtn: ["#id_submitbutton"],
    errorMsg: [".form-control-feedback", ".alert-danger"],
  },

  zimbra: {
    usernameInput: ['input#username', 'input[name="username"]'],
    passwordInput: ['input#password', 'input[name="password"]'],
    loginBtn: ['input.ZLoginButton', 'button:has-text("Sign In")'],
    searchInput: ['input#app-02-search-input', 'input.search_input'],
    searchBtn: ['div#app-02-search-button', 'button:has-text("Search")'],
    emailRow: ['div.MsgHeader:has-text("Account created")', 'tr:has-text("Account created")'],
    emailIframe: ['iframe#msg-body-iframe', 'iframe'],
    resetLinkUrl: ['a:has-text("here"), a[href*="reset_password"]'],
    searchInputStandard: ['input#searchField', 'input[name="sq"]', 'input.searchField', 'input[type="text"]'],
    searchBtnStandard: ['input[type="submit"][value="Search"], button:has-text("Search")'],
    emailLinkStandard: ['a:has-text("Account created")']
  },


  // ✅ UPDATED: Password Reset Screen Selectors
  resetPassword: {
    newPasswordInput: [
      'input[name="newPassword"]',
      'input[placeholder*="New Password"]',
      "xpath=(//input[@type='password'])[1]"
    ],
    confirmPasswordInput: [
      'input[name="confirmPassword"]',
      'input[placeholder*="Confirm"]',
      "xpath=(//input[@type='password'])[2]"
    ],
    submitBtn: [
      'button:has-text("Create Password")',
      'input[value="Create Password"]',
      'a:has-text("Create Password")'
    ],
    returnToLoginLink: [
      'button:has-text("Next")',
      'a:has-text("Next")',
      'input[value="Next"]',
      'a:has-text("return to login page")',
      'a:has-text("Return to Login")'
    ]
  },

  // ✅ Main RQI Student Login Screen Selectors
  studentLogin: {
    loginBtnHomepage: [
      'a[aria-label="Login"]:visible',
      'a[href*="/sap/login"]:visible',
      'a.sf-button:has-text("Login"):visible',
      'a[aria-label="Login"]',
      'a[href*="/sap/login"]',
      'a.sf-button:has-text("Login")',
      'a:has-text("Sign In")'
    ],
    emailInput: [
      'input[placeholder*="Username or email"]:visible',
      'input[name="username"]:visible',
      'input[data-gigya-name="loginID"]:visible',
      'input[type="text"]:visible'
    ],
    passwordInput: [
      'input[name="password"]:visible',
      'input[placeholder*="Password"]:visible',
      'input[type="password"]:visible'
    ],
    submitLoginBtn: [
      'button:has-text("Log In"):visible',
      'button[type="submit"]:visible',
      'input[value="Log In"]:visible'
    ],
    hamburgerMenu: [
      '#nav__hamburger',
      '.c-top-nav__menu-trigger',
      '[aria-label="Mobile Menu"]',
      'button.navbar-toggler',
      '.navbar-toggle',
      '[aria-label="Toggle navigation"]',
      '.mobile-menu-btn',
      '.header-menu-icon',
      '.navbar-header button'
    ],
  },
  studentDashboard: {
    courseCardByText: (courseName: string) =>
      `div.card, div.course-card, div.list-item, div[class*="course"]:has-text("${courseName}")`,
    courseStartBtn: (courseName: string) =>
      `div:has-text("${courseName}") button:has-text("Start"), div:has-text("${courseName}") button:has-text("Launch")`,
    launchBtn: ['button:has-text("Launch")', 'button:has-text("Start")', 'a:has-text("Launch")'],
    courseRowByText: (courseName: string) => `.inner-content:has(.course-title:has-text("${courseName}")), .list-group-item:has-text("${courseName}"), .course-card:has-text("${courseName}"), tr:has-text("${courseName}")`,
    activateBtn: ['button:has-text("Activate")', 'a:has-text("Activate")'],
    tableStartBtn: [
      'table tr button:has-text("START")',
      'table tr a:has-text("START")',
      'tr:has-text("Online Activity") button:has-text("START")',
      'tr:has-text("eLearning") button:has-text("START")',
      '.table button:has-text("START")'
    ],
    startBtn: ['button:has-text("Start")', 'button:has-text("Launch")', 'a:has-text("Start")'],
    datePickerModal: ['.modal:has-text("Date")', '[role="dialog"]:has-text("Date")', 'div.test-date-modal', 'div.modal-content:has-text("Date")'],
    dateInput: ['input[type="date"]', 'input[placeholder*="MM"]', 'input[placeholder*="DD"]', 'input[name="testDate"]', 'input[placeholder*="MM/DD/YYYY"]'],
    saveDateBtn: ['button:has-text("Save")', 'button:has-text("Continue")', 'button:has-text("Submit")'],
    courseCards: [
      '.card',
      '[class*="course"]',
      '.list-group-item',
    ],
    activateBtnUppercase: [
      'button:has-text("ACTIVATE")',
      'a:has-text("ACTIVATE")',
    ],
    launchBtnUppercase: [
      'button:has-text("LAUNCH")',
      'a:has-text("LAUNCH")',
      'button:has-text("Launch")',
    ],
    inlineSubmitBtn: [
      'button:has-text("SUBMIT")',
      'input[value="SUBMIT" i]',
    ],
    inlineDateInput: [
      'input[name="test_today_date"]',
      'input[name="testDate"]',
      'input[type="date"]',
      'input[placeholder*="YYYY"]',
    ],
    menuToggles: [
      '#my_programs_menu_item',
      '.navbar-toggle',
      '.hamburger',
      '[aria-label*="menu" i]',
      'button:has-text("Menu")',
      'a:has-text("Menu")'
    ] as const,

    myProgramsLink: [
      '#my_programs_menu_item',
      'a[href="/mycourse"]',
      'a:has-text("My Program")'
    ]
  },
  courseLaunch: {
    safeClickTarget: ['h1', 'body'],
  },
  coursePlayer: {
    exitBtn: [
      'button:has-text("Exit Exercise")',
      'a:has-text("Exit Exercise")',
      'button:has-text("Exit")',
      '.exit-button'
    ]
  },
  postCompletion: {
    cmeModal: ['.modal:has-text("CE/CME Credits")', '[role="dialog"]:has-text("CE/CME Credits")', 'div:has-text("eligible to claim CE/CME")'],
    acknowledgeBtn: ['button:has-text("Acknowledge")'],

    // NEW: eCard Email Modal Selectors
    eCardModal: ['.modal:has-text("Email eCard")', '[role="dialog"]:has-text("Email eCard")'],
    eCardCancelBtn: ['button:has-text("Cancel")'],

    // Selectors for the Evaluation phase
    evaluationBtn: ['a:has-text("EVALUATION")', 'button:has-text("EVALUATION")', 'div.step-item:has-text("Evaluation") button', 'a:has-text("Evaluation")'],
    evalTextAreas: ['textarea', 'input[type="text"].eval-text'],
    submitEvalBtn: ['button:has-text("Submit")', 'input[value="Submit"]', 'button:has-text("Save")']
  },
  adminReports: {
    hamburgerMenu: ['.navbar-toggler', '.hamburger-menu', 'button[aria-label="Toggle navigation"]'],
    reportsDropdown: ['a:text-is("Reports")', 'button:text-is("Reports")', 'a:has-text("Reports")'],
    complianceReportLink: ['a:text-is("Compliance Report")', 'a:has-text("Compliance Report")'],
    pageHeader: ['h1', 'h2', 'h3', '.page-title'],
    searchInput: ['#searchbox_name_email', 'input[placeholder*="Search for Name"]', 'input[placeholder*="User ID"]'],
    searchButton: ['#searchbtn', '.search_submit', 'button:text-is("Search")'], // text-is prevents it from clicking "Clear Search"
    tableRow: ['.dataTables_scrollBody tbody tr', '#reports tbody tr'],
    tableHeaders: ['.dataTables_scrollHeadInner thead th', '#reports_wrapper thead th'],
    tableCells: ['td']
  }

} as const;
