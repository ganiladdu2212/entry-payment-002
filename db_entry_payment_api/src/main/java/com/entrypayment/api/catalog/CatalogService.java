package com.entrypayment.api.catalog;

import com.entrypayment.api.management.ManagementRepository;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CatalogService {

  private final ManagementRepository managementRepository;
  private final MembershipPlanRepository membershipPlanRepository;
  private final PersonalTrainingRepository personalTrainingRepository;

  public CatalogService(
      ManagementRepository managementRepository,
      MembershipPlanRepository membershipPlanRepository,
      PersonalTrainingRepository personalTrainingRepository) {
    this.managementRepository = managementRepository;
    this.membershipPlanRepository = membershipPlanRepository;
    this.personalTrainingRepository = personalTrainingRepository;
  }

  @Transactional
  public PlanResponse createMembershipPlan(PlanRequest request) {
    requireManagement(request.managementId());
    MembershipPlan plan = membershipPlanRepository.save(
        new MembershipPlan(request.managementId(), request.name(), request.amount(), request.durationMonths(), request.sessionCount()));
    return membershipResponse(plan);
  }

  @Transactional(readOnly = true)
  public List<PlanResponse> getMembershipPlans(Long managementId) {
    requireManagement(managementId);
    return membershipPlanRepository.findAllByManagementIdOrderByCreatedDateDescIdDesc(managementId)
        .stream().map(this::membershipResponse).toList();
  }

  @Transactional
  public PlanResponse createPersonalTraining(PlanRequest request) {
    requireManagement(request.managementId());
    PersonalTraining training = personalTrainingRepository.save(
        new PersonalTraining(request.managementId(), request.name(), request.amount(), request.durationMonths(), request.sessionCount()));
    return personalTrainingResponse(training);
  }

  @Transactional(readOnly = true)
  public List<PlanResponse> getPersonalTrainings(Long managementId) {
    requireManagement(managementId);
    return personalTrainingRepository.findAllByManagementIdOrderByCreatedDateDescIdDesc(managementId)
        .stream().map(this::personalTrainingResponse).toList();
  }

  private void requireManagement(Long managementId) {
    if (!managementRepository.existsById(managementId)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Management account not found.");
    }
  }

  private PlanResponse membershipResponse(MembershipPlan plan) {
    return new PlanResponse(
        plan.getId(), plan.getManagementId(), plan.getName(), plan.getAmount(),
        plan.getDurationMonths(), plan.getSessionCount(), plan.getCreatedDate());
  }

  private PlanResponse personalTrainingResponse(PersonalTraining training) {
    return new PlanResponse(
        training.getId(), training.getManagementId(), training.getName(), training.getAmount(),
        training.getDurationMonths(), training.getSessionCount(), training.getCreatedDate());
  }
}
