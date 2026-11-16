package com.entrypayment.api.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

  @Bean
  OpenAPI entryPaymentOpenApi() {
    return new OpenAPI()
        .info(
            new Info()
                .title("Entry Payment API")
                .version("v1")
                .description("Management, trainer, and member APIs for Entry Payment."));
  }
}
