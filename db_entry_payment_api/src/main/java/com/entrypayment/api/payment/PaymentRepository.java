package com.entrypayment.api.payment;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
  List<Payment> findAllByManagementIdAndMemberIdOrderByCreatedDateDescIdDesc(Long managementId, Long memberId);
  List<Payment> findAllByManagementIdOrderByCreatedDateDescIdDesc(Long managementId);
  boolean existsByMemberSelectedPlanId(Long memberSelectedPlanId);
}
