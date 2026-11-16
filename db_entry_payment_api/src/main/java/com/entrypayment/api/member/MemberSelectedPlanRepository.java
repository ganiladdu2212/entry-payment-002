package com.entrypayment.api.member;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberSelectedPlanRepository extends JpaRepository<MemberSelectedPlan, Long> {
  List<MemberSelectedPlan> findAllByStatusAndExpiresOnBefore(String status, LocalDate expiryDate);
  List<MemberSelectedPlan> findAllByMemberIdIn(Collection<Long> memberIds);
}
