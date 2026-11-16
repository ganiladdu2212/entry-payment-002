package com.entrypayment.api.management;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ManagementRepository extends JpaRepository<Management, Long> {
  Optional<Management> findByMobileNumber(String mobileNumber);
}
