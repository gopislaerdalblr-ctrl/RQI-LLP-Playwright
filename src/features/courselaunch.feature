Feature: BLS TrueStart and perpetual course launch and completion for CTC user.

  @smoke @test @completion
  Scenario: Super Admin login successfully
    Given Launch the application
    Then Login with admin credentials
    Then Admin should be logged in successfully
    Then Select Super admin role
    Then Navigate to Admin Dashboard
    Then Navigate to Organizations listing page
    Then Admin search org by id "orgId6"
    Then Navigate to Organization details page
    Then Navigate to products page
    Then Check if course is available or add the course as "courseId" and "courseId1"
    Then Navigate to manage students page
    Then Import 1 students from file "students.csv"
    Then Navigate back to Organizations listing page
    Then Admin search org by id "orgId6"
    Then Navigate to Access Organization page
    Then Navigate to Assignments page
    Then I create a manual assignment with a specific due date for course "courseId"
    Then I verify the assignment was created successfully with 1 learner added
    Then I retrieve the password reset link from Zimbra for the newly created user
    Then I reset the user password, login, and save the user details
