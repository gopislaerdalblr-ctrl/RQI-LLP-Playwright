Feature: Moodle LMS Integration

  @smoke @moodle @test
  Scenario: Create User on the fly and verify in Maurya
    
    Given Launch the application
    Then the page should be accessible
    Then Login with admin credentials
    And Launch the moodle application
    Then Login with moodle admin credentials
    And I create a Moodle user on the fly and assign to course "Basic CPR"
    Then I verify the on-the-fly user appears in Maurya student management
    Then I perform a bulk status check on the last 5 created users in Maurya