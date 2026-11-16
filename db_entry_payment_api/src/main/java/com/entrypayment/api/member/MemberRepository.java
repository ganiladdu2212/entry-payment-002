package com.entrypayment.api.member;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberRepository extends JpaRepository<Member, Long> {
  List<Member> findAllByManagementIdOrderByCreatedDateDescIdDesc(Long managementId);
  Optional<Member> findByWhatsappNumber(String whatsappNumber);
}
