package com.ico.hotel.controllers;

import com.ico.hotel.dto.ChatRequest;
import com.ico.hotel.services.HotelChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
public class HotelChatController {

    private final HotelChatService hotelChatService;

    @PostMapping
    public ResponseEntity<String> chat(@Valid @RequestBody ChatRequest request) {
        return ResponseEntity.ok(hotelChatService.chat(request.prompt(), request.model()));
    }

    @PostMapping(value = "/stream", produces = "text/event-stream; charset=UTF-8")
    public Flux<String> chatStream(@Valid @RequestBody ChatRequest request) {
        return hotelChatService.chatStream(request.prompt(), request.model());
    }
}

