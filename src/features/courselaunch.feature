Feature: Course launch and completion for CTC user.

  @smoke @test @completion @demo1
  Scenario: BLS Complete course launch and completion for CTC user
    Given Launch the application
    Then Login with admin credentials
    Then Admin should be logged in successfully
    Then Select Super admin role
    Then Navigate to Admin Dashboard
    Then Navigate to Organizations listing page
    Then Admin search org by id "orgId"
    Then Navigate to Organization details page
    Then Navigate to products page
    Then Check if course is available or add the course as "HeartCode® BLS Complete" and "RQI® BLS Provider - True Start"
    Then Navigate to manage students page
    Then Import 1 students from file "students.csv"
    Then Navigate back to Organizations listing page
    Then Admin search org by id "orgId"
    Then Navigate to Access Organization page
    Then Navigate to Assignments page
    Then I create a manual assignment with a specific due date for course "HeartCode® BLS Complete"
    Then I verify the assignment was created successfully with 1 learner added
    Then I retrieve the password reset link from Zimbra for the newly created user
    Then I reset the user password, login, and save the user details
    #Then I activate and launch the assigned course
    Then I launch and complete the assigned course "HeartCode® BLS Complete" for "qtr 0"
    Then the page should be accessible
    Then Launch the application
    Then Login with admin credentials
    Then Admin should be logged in successfully
    Then Select Super admin role
    Then Navigate to Admin Dashboard
    Then Navigate to Organizations listing page
    Then Admin search org by id "orgId"
    Then Navigate to Access Organization page
    Then I click on reports dropdown
    Then I navigate to compliance report page
    Then I search user with email id and validate for eCard compliance until date.

  @smoke @test @completion @demo1
  Scenario: BLS TrueStart course launch and completion for CTC user
    Given Launch the application
    Then Login with admin credentials
    Then Admin should be logged in successfully
    Then Select Super admin role
    Then Navigate to Admin Dashboard
    Then Navigate to Organizations listing page
    Then Admin search org by id "orgId6"
    Then Navigate to Organization details page
    Then Navigate to products page
    Then Check if course is available or add the course as "RQI® BLS Provider - True Start" and "RQI® BLS Provider - Perpetual"
    Then Navigate to manage students page
    Then Import 1 students from file "students.csv"
    Then Navigate back to Organizations listing page
    Then Admin search org by id "orgId6"
    Then Navigate to Access Organization page
    Then Navigate to Assignments page
    Then I create a manual assignment with a specific due date for course "RQI® BLS Provider - True Start"
    Then I verify the assignment was created successfully with 1 learner added
    Then I retrieve the password reset link from Zimbra for the newly created user
    Then I reset the user password, login, and save the user details
    #Then I activate and launch the assigned course
    Then I launch and complete the assigned course "RQI® BLS Provider - True Start" for "qtr -2"
    Then the page should be accessible
    Then Launch the application
    Then Login with admin credentials
    Then Admin should be logged in successfully
    Then Select Super admin role
    Then Navigate to Admin Dashboard
    Then Navigate to Organizations listing page
    Then Admin search org by id "orgId6"
    Then Navigate to Access Organization page
    Then I click on reports dropdown
    Then I navigate to compliance report page
    Then I search user with email id and validate for eCard compliance until date.

  @smoke @test @completion @demo
  Scenario: BLS TrueStart and Perpetual course launch and completion for CTC user
    Given Launch the application
    Then Login with admin credentials
    Then Admin should be logged in successfully
    Then Select Super admin role
    Then Navigate to Admin Dashboard
    Then Navigate to Organizations listing page
    Then Admin search org by id "orgId7"
    Then Navigate to Organization details page
    Then Navigate to products page
    Then Check if course is available or add the course as "RQI® BLS Provider - True Start" and "RQI® BLS Provider - Perpetual"
    Then Navigate to manage students page
    Then Import 1 students from file "students.csv"
    Then Navigate back to Organizations listing page
    Then Admin search org by id "orgId7"
    Then Navigate to Access Organization page
    Then Navigate to Assignments page
    Then I create a manual assignment with a specific due date for course "RQI® BLS Provider - True Start"
    Then I verify the assignment was created successfully with 1 learner added
    Then Navigate to Assignments page
    Then I create a manual assignment for course "RQI® BLS Provider - Perpetual"
    Then I verify the assignment was created successfully with 1 learner added
    Then I retrieve the password reset link from Zimbra for the newly created user
    Then I reset the user password, login, and save the user details
    #Then I activate and launch the assigned course
    Then I launch and complete the assigned course "RQI® BLS Provider - True Start" for "qtr -5"
    Then the page should be accessible
    Then I launch and complete the specific course "RQI® BLS Provider - Perpetual" for "qtr 0"
    Then the page should be accessible
    Then Launch the application
    Then Login with admin credentials
    Then Admin should be logged in successfully
    Then Select Super admin role
    Then Navigate to Admin Dashboard
    Then Navigate to Organizations listing page
    Then Admin search org by id "orgId7"
    Then Navigate to Access Organization page
    Then I click on reports dropdown
    Then I navigate to compliance report page
    Then I search user with email id and validate for eCard compliance until date.
