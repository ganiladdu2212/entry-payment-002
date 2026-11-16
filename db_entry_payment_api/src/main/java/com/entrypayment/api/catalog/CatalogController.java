package com.entrypayment.api.catalog;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.validation.annotation.Validated;

@RestController
@Validated
@RequestMapping("/api/v1")
@Tag(name = "Plan catalog", description = "Management-owned membership and personal-training plans")
public class CatalogController {

  private final CatalogService catalogService;

  public CatalogController(CatalogService catalogService) {
    this.catalogService = catalogService;
  }

  @PostMapping("/membership-plans")
  @ResponseStatus(HttpStatus.CREATED)
  @Operation(summary = "Save a membership plan")
  public PlanResponse createMembershipPlan(@Valid @RequestBody PlanRequest request) {
    com.entrypayment.api.config.GymAccess.require(request.managementId());
    return catalogService.createMembershipPlan(request);
  }

  @GetMapping("/membership-plans")
  @Operation(summary = "Get membership plans for one management account")
  public List<PlanResponse> getMembershipPlans(@RequestParam @Positive Long managementId) {
    com.entrypayment.api.config.GymAccess.require(managementId);
    return catalogService.getMembershipPlans(managementId);
  }

  @PostMapping("/personal-trainings")
  @ResponseStatus(HttpStatus.CREATED)
  @Operation(summary = "Save a personal-training subscription")
  public PlanResponse createPersonalTraining(@Valid @RequestBody PlanRequest request) {
    com.entrypayment.api.config.GymAccess.require(request.managementId());
    return catalogService.createPersonalTraining(request);
  }

  @GetMapping("/personal-trainings")
  @Operation(summary = "Get personal-training subscriptions for one management account")
  public List<PlanResponse> getPersonalTrainings(@RequestParam @Positive Long managementId) {
    com.entrypayment.api.config.GymAccess.require(managementId);
    return catalogService.getPersonalTrainings(managementId);
  }
}
