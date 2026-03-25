Feature: TC/Ts Module regression scripts.

  @smoke @test @tcts
  Scenario: Search and list the TC/TS org in the organization listing page.
    Given Launch the application
    Then Login with admin credentials
    Then Admin should be logged in successfully
    Then Select Super admin role
    Then Navigate to Admin Dashboard
    Then Navigate to Organizations listing page
    Then Admin search org by TC org id "orgId3"
    Then Admin validate the searched TC org in the listing page
    Then Admin clear the search field
    Then Admin search org by TS org id "orgId4"
    Then Admin validate the searched TS org in the listing page
    Then Admin clear the search field
    


    @smoke @test @tcts1
  Scenario: Navigate to Tc org product page.
  Given Launch the application
  Then Login with admin credentials
  Then Admin should be logged in successfully
  Then Select Super admin role
  Then Navigate to Admin Dashboard
  Then Navigate to Organizations listing page
  Then Admin search org by TC org id "orgId3"
  Then Navigate to Organization details page
  Then Navigate to products page
  Then Check if course is available or add the course as "courseId" and "courseId1"