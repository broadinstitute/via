package org.broadinstitute.variantinterpretation;

import com.google.auth.oauth2.GoogleCredentials;
import java.io.IOException;
import org.springframework.stereotype.Component;

/**
 * Resolves the researcher's Google Application Default Credentials on demand, rather than at
 * startup, so the app still boots locally where no ADC file exists (e.g. SKIP_WORKBENCH_WAIT
 * dev mode). In a real Workbench deployment, the ADC file is written by
 * `wb auth login --mode=APP_DEFAULT_CREDENTIALS` (see startupscript/install-cli.sh) before this
 * app starts (see deploy/entrypoint.sh), and reflects the researcher's own data permissions --
 * callers use these credentials to reach GCP APIs as the logged-in researcher, not as a service
 * account.
 */
@Component
public class WorkbenchCredentialsProvider {

  private GoogleCredentials credentials;

  public synchronized GoogleCredentials getCredentials() throws IOException {
    if (credentials == null) {
      credentials = GoogleCredentials.getApplicationDefault();
    }
    return credentials;
  }
}
