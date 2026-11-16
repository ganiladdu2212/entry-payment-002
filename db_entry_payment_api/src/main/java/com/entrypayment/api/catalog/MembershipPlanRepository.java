package com.entrypayment.api.catalog;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MembershipPlanRepository extends JpaRepository<MembershipPlan, Long> {
  List<MembershipPlan> findAllByManagementIdOrderByCreatedDateDescIdDesc(Long managementId);
}
