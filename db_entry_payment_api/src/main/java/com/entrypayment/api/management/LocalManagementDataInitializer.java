package com.entrypayment.api.management;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;

/** Temporary H2 data for manual local development only. */
@Configuration
@Profile("local")
public class LocalManagementDataInitializer {

  @Bean
  @Order(1)
  CommandLineRunner seedLocalManagement(ManagementRepository managementRepository) {
    return args -> {
      if (managementRepository.findByMobileNumber("9876501003").isEmpty()) {
        managementRepository.save(
            new Management("Mahesh", "9876501003", null, "4271", null));
      }
      if (managementRepository.findByMobileNumber("9876501004").isEmpty()) {
        managementRepository.save(
            new Management("Bala", "9876501004", null, "4271", null));
      }
    };
  }
}
