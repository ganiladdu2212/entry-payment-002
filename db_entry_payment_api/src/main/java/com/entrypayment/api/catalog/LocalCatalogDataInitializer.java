package com.entrypayment.api.catalog;

import com.entrypayment.api.management.Management;
import com.entrypayment.api.management.ManagementRepository;
import java.math.BigDecimal;
import java.util.Set;
import com.entrypayment.api.trainer.Trainer;
import com.entrypayment.api.trainer.TrainerRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;

/** Local H2 catalog data so the responsive onboarding UI has real API plans to display. */
@Configuration
@Profile("local")
public class LocalCatalogDataInitializer {

  @Bean
  @Order(2)
  CommandLineRunner seedLocalCatalog(
      ManagementRepository managementRepository,
      MembershipPlanRepository membershipPlanRepository,
      PersonalTrainingRepository personalTrainingRepository,
      TrainerRepository trainerRepository) {
    return args -> {
      Management management = managementRepository.findByMobileNumber("9876501003").orElseThrow();
      Long managementId = management.getId();

      Set<String> membershipNames = membershipPlanRepository
          .findAllByManagementIdOrderByCreatedDateDescIdDesc(managementId).stream()
          .map(MembershipPlan::getName).collect(java.util.stream.Collectors.toSet());
      seedMembership(membershipPlanRepository, membershipNames, managementId, "Monthly", "1500", 1);
      seedMembership(membershipPlanRepository, membershipNames, managementId, "Quarterly", "4000", 3);
      seedMembership(membershipPlanRepository, membershipNames, managementId, "Half-yearly", "7500", 6);
      seedMembership(membershipPlanRepository, membershipNames, managementId, "Annual", "13000", 12);

      Set<String> trainingNames = personalTrainingRepository
          .findAllByManagementIdOrderByCreatedDateDescIdDesc(managementId).stream()
          .map(PersonalTraining::getName).collect(java.util.stream.Collectors.toSet());
      seedTraining(personalTrainingRepository, trainingNames, managementId, "Monthly", "3000", 1);
      seedTraining(personalTrainingRepository, trainingNames, managementId, "Quarterly", "8000", 3);
      seedTraining(personalTrainingRepository, trainingNames, managementId, "Half-yearly", "15000", 6);
      seedTraining(personalTrainingRepository, trainingNames, managementId, "Annual", "28000", 12);

      Set<String> trainerNames = trainerRepository.findAllByManagementIdOrderByCreatedDateDescIdDesc(managementId).stream()
          .map(Trainer::getName).collect(java.util.stream.Collectors.toSet());
      if (!trainerNames.contains("Ahmed")) trainerRepository.save(new Trainer(managementId, "Ahmed", "9876501001"));
      if (!trainerNames.contains("Kiran")) trainerRepository.save(new Trainer(managementId, "Kiran", "9876501002"));
    };
  }

  private void seedMembership(
      MembershipPlanRepository repository, Set<String> existingNames, Long managementId,
      String name, String amount, int durationMonths) {
    if (!existingNames.contains(name)) {
      repository.save(new MembershipPlan(managementId, name, new BigDecimal(amount), durationMonths));
    }
  }

  private void seedTraining(
      PersonalTrainingRepository repository, Set<String> existingNames, Long managementId,
      String name, String amount, int durationMonths) {
    if (!existingNames.contains(name)) {
      repository.save(new PersonalTraining(managementId, name, new BigDecimal(amount), durationMonths));
    }
  }
}
