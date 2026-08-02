package org.broadinstitute.variantinterpretation;

import com.google.auth.oauth2.GoogleCredentials;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Map;
import org.broadinstitute.variantinterpretation.api.GoogleUserInfoApi;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;

/**
 * Verifies that Workbench's Application Default Credentials actually resolve to the logged-in
 * researcher, by calling Google's userinfo endpoint with the ADC access token and returning
 * whatever it says.
 */
@RestController
public class GoogleUserInfoController implements GoogleUserInfoApi {

  private static final String USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

  private final WorkbenchCredentialsProvider credentialsProvider;
  private final RestClient restClient = RestClient.create();

  public GoogleUserInfoController(WorkbenchCredentialsProvider credentialsProvider) {
    this.credentialsProvider = credentialsProvider;
  }

  @Override
  public ResponseEntity<Map<String, Object>> googleUserInfo() {
    String accessToken = getAccessToken();

    Map<String, Object> userInfo =
        restClient
            .get()
            .uri(USERINFO_URL)
            .header("Authorization", "Bearer " + accessToken)
            .retrieve()
            .body(new ParameterizedTypeReference<Map<String, Object>>() {});

    return ResponseEntity.ok(userInfo);
  }

  private String getAccessToken() {
    try {
      GoogleCredentials credentials = credentialsProvider.getCredentials();
      credentials.refreshIfExpired();
      return credentials.getAccessToken().getTokenValue();
    } catch (IOException e) {
      throw new UncheckedIOException("Failed to resolve Application Default Credentials", e);
    }
  }
}
