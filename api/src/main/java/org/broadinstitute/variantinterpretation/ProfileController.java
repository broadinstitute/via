package org.broadinstitute.variantinterpretation;

import org.broadinstitute.variantinterpretation.api.ProfileApi;
import org.broadinstitute.variantinterpretation.model.UserProfile;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ProfileController implements ProfileApi {

  private final String ownerEmail;

  public ProfileController(@Value("${WORKBENCH_USER_EMAIL:}") String ownerEmail) {
    this.ownerEmail = ownerEmail;
  }

  @Override
  public ResponseEntity<UserProfile> profile() {
    return ResponseEntity.ok(new UserProfile().userEmail(ownerEmail));
  }
}
