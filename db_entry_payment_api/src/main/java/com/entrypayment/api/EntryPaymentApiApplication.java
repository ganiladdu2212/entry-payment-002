package com.entrypayment.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class EntryPaymentApiApplication {

	public static void main(String[] args) {
		SpringApplication.run(EntryPaymentApiApplication.class, args);
	}

}
