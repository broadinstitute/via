package org.broadinstitute.variantinterpretation;

import java.time.Instant;
import org.broadinstitute.variantinterpretation.api.HelloApi;
import org.broadinstitute.variantinterpretation.model.HelloResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController implements HelloApi {

  @Override
  public ResponseEntity<HelloResponse> hello() {
    return ResponseEntity.ok(new HelloResponse().timestamp(Instant.now().toString()));
  }
}
