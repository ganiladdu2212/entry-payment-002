package com.entrypayment.api.trainer;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequestMapping("/api/v1/trainers")
@Tag(name = "Trainers", description = "Management-owned trainer directory")
public class TrainerController {

  private final TrainerService trainerService;

  public TrainerController(TrainerService trainerService) {
    this.trainerService = trainerService;
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @Operation(summary = "Save a trainer")
  public TrainerResponse create(@Valid @RequestBody TrainerRequest request) {
    com.entrypayment.api.config.GymAccess.require(request.managementId());
    return trainerService.create(request);
  }

  @GetMapping
  @Operation(summary = "Get trainers for one management account")
  public List<TrainerResponse> getByManagementId(@RequestParam @Positive Long managementId) {
    com.entrypayment.api.config.GymAccess.require(managementId);
    return trainerService.getByManagementId(managementId);
  }
}
