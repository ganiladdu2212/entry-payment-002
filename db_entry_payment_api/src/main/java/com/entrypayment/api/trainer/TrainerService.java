package com.entrypayment.api.trainer;

import com.entrypayment.api.management.ManagementRepository;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TrainerService {

  private final TrainerRepository trainerRepository;
  private final ManagementRepository managementRepository;

  public TrainerService(TrainerRepository trainerRepository, ManagementRepository managementRepository) {
    this.trainerRepository = trainerRepository;
    this.managementRepository = managementRepository;
  }

  @Transactional
  public TrainerResponse create(TrainerRequest request) {
    requireManagement(request.managementId());
    return response(trainerRepository.save(new Trainer(
        request.managementId(), request.name(), request.mobileNumber())));
  }

  @Transactional(readOnly = true)
  public List<TrainerResponse> getByManagementId(Long managementId) {
    requireManagement(managementId);
    return trainerRepository.findAllByManagementIdOrderByCreatedDateDescIdDesc(managementId)
        .stream().map(this::response).toList();
  }

  private void requireManagement(Long managementId) {
    if (!managementRepository.existsById(managementId)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Management account not found.");
    }
  }

  private TrainerResponse response(Trainer trainer) {
    return new TrainerResponse(
        trainer.getId(), trainer.getManagementId(), trainer.getName(),
        trainer.getMobileNumber(), trainer.getCreatedDate());
  }
}
