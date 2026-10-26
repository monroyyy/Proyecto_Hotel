package com.ico.hotel.services;

import reactor.core.publisher.Flux;

public interface HotelChatService {
    String chat(String prompt, String model);
    String chat(String prompt, String model, String conversationId);
    Flux<String> chatStream(String prompt, String model);
    Flux<String> chatStream(String prompt, String model, String conversationId);
}
