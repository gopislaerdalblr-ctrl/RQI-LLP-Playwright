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
        'a.action_dropdown[data-bs-toggle="dropdown"]',
        'a.action_dropdown[data-toggle="dropdown"]',
        "a.action_dropdown",
        'a[role="button"][aria-expanded]',
        'a[data-toggle="dropdown"]',
      ],
      orgDetailsAction: [
        'a:has-text("Organization Details")',
        'a:has-text("Organisation Details")',
        'a[href*="manage_organization"]',
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
    },
    manageStudents: {
      // ✅ Navigation
      manageStudentsNav: ['a:has-text("Manage Students")'],

      // ✅ Import Demographic Data button (top right)
      importDemographicBtn: [
        'button:has-text("Import Demographic Data")',
        'a:has-text("Import Demographic Data")',
      ],

      // ✅ Download CSV template link inside modal
      downloadTemplateLink: [
        'a:has-text("download a formatted blank CSV file")',
        'a[href*="download"]',
      ],

      // ✅ File input (Choose File)
      chooseFileInput: ['input[type="file"]'],

      // ✅ Upload button inside modal
      uploadBtn: ['button:has-text("Upload")', 'input[value="Upload"]'],

      // ✅ Search input (User ID / First Name / filters)
      searchUserInput: [
        'input[placeholder*="User"]',
        'input[name*="user"]',
        'input[id*="user"]',
      ],

      // ✅ Search icon / button
      searchBtn: [
        "button:has(i.fa-search)",
        "a:has(i.fa-search)",
        'button:has-text("Search")',
      ],
    },

    AccessOrganization: [
      'a[user-type="LMS"]',
      'a:has-text("Access Organization")',
      'a[href*="elearning_login"]',
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

    // --- New Locators properly nested inside adminLogin ---
    // GlobalUserDropDown: [
    //   'a.dropdown-toggle:has-text("User Mgmt")',
    //   'a.js-activated:has-text("User Mgmt")',
    //   'li.dropdown:has(a:has-text("User Mgmt"))',
    //   'text="User Mgmt"',
    // ],

    GlobalUserManagementWidget: [
      "button#usermanage-tooltip", // Primary: Explicit ID
      'button.admin-nav-icon:has-text("User Mgmt")', // Secondary: Class + Text combo
      'button[data-toggle="tooltip"]:has(em.fa-user)', // Tertiary: Attribute + DOM Structure
      '//button[@id="usermanage-tooltip"]', // Fallback: Strict XPath
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
} as const;
