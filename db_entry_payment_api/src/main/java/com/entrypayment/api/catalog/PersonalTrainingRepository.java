package com.entrypayment.api.catalog;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PersonalTrainingRepository extends JpaRepository<PersonalTraining, Long> {
  List<PersonalTraining> findAllByManagementIdOrderByCreatedDateDescIdDesc(Long managementId);
}
