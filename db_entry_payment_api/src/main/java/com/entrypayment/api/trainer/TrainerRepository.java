package com.entrypayment.api.trainer;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TrainerRepository extends JpaRepository<Trainer, Long> {
  List<Trainer> findAllByManagementIdOrderByCreatedDateDescIdDesc(Long managementId);
  Optional<Trainer> findByMobileNumber(String mobileNumber);
}
