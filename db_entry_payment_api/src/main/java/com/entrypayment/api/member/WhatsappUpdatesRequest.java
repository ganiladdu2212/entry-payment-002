package com.entrypayment.api.member;

import jakarta.validation.constraints.NotNull;

public record WhatsappUpdatesRequest(@NotNull Boolean enabled) {}
