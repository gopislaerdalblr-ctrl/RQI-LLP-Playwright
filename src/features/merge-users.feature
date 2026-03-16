Feature: Merge User Actions UI Validation.

  @smoke @merge @mergeUI
  Scenario: Merge user page should load successfully
    Given Launch the application
    Then Login with admin credentials
    Then Admin should be logged in successfully
    Then Select Super admin role
    Then Navigate to Admin Dashboard
    Then Navigate to Organizations listing page
    Then Admin search org by id "orgId2"
    Then Navigate to Access Organization page
    Then Click on Support Action dropdown
    Then Click on Merge Account option
    Then Merge user page should load successfully
    Then Validate the UI elements on Merge user page
    Then Logout from the application

    @merge
    Scenario: Ability to select account one with user id
    Given Launch the application
    Then Login with admin credentials
    Then Admin should be logged in successfully
    Then Select Super admin role
    Then Navigate to Admin Dashboard
    Then Navigate to Organizations listing page
    Then Admin search org by id "orgId"
    Then Navigate to Organization details page
    Then Navigate to manage students page
    Then Import 10 students from file "students.csv"
    Then Navigate to products page
    Then Check if course is available or add the course as "courseId" and "courseId1"


    @smoke @merge @samurai
  Scenario: Merge user page should load successfully for LMS organization
    Given Launch the application
    Then Login with admin credentials
    Then Admin should be logged in successfully
    Then Select Super admin role
    Then Navigate to Admin Dashboard
    Then Navigate to Organizations listing page
    Then Admin search org by id "orgId2"
    Then Navigate to Access Organization page
    Then Click on Support Action dropdown
    Then Click on Merge Account option
    Then Merge user page should load successfully
    #Then Validate the UI elements on Merge user page
    Then Logout from the application
    


    @smoke @merge @mergeUI 
  Scenario: Merge user page should load successfully
    Given Launch the application
    Then the page should be accessible
    Then Login with admin credentials
    Then the page should be accessible
    Then Admin should be logged in successfully
    Then the page should be accessible
    Then Select Super admin role
    Then the page should be accessible
    Then Navigate to Admin Dashboard
    Then the page should be accessible
    Then Navigate to Organizations listing page
    Then the page should be accessible
    Then Admin search org by id "orgId2"
    Then the page should be accessible
    Then Navigate to Access Organization page
    Then the page should be accessible
    Then Click on Support Action dropdown
    Then the page should be accessible
    Then Click on Merge Account option
    Then the page should be accessible
    Then Merge user page should load successfully
    Then the page should be accessible
    Then Validate the UI elements on Merge user page
    Then the page should be accessible
    Then Logout from the application



    @smoke @merge @samurai @elevatedAccess
  Scenario: Merge user page should load successfully for LMS organization
    Given Launch the application
    Then Login with admin credentials
    Then Admin should be logged in successfully
    Then Select Super admin role
    Then Navigate to Admin Dashboard
    Then Navigate to Global User Management page
    Then Search user with email id "optim17@rqimail.laerdalblr.in"
    Then Click on search icon
    Then Click on edit icon for the searched user
    Then Navigate to New Role details
    Then the page should be accessible