/**
 * SSE Generator: Real-time progress streaming for implementation generation
 * Mimics the FastAPI pattern but in Express/Node.js
 */

import type { Response } from "express";

export interface GenerationEvent {
  event: string;
  payload: Record<string, any>;
}

// In-memory SSE clients per generation ID
const SSE_CLIENTS: Map<string, Response> = new Map();

// Event buffer for clients that connect late
const EVENT_BUFFER: Map<string, any[]> = new Map();

// Max buffer size to prevent memory leaks
const MAX_BUFFER_SIZE = 50;

// Map to track cancellation status for each generation
const CANCELED_GENERATIONS: Set<string> = new Set();

/**
 * Register SSE client for a generation ID
 */
export function registerSSEClient(generationId: string, res: Response): void {
  SSE_CLIENTS.set(generationId, res);
  CANCELED_GENERATIONS.delete(generationId); // Reset cancellation status on new connection

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  // Send initial connection message
  sendSSEEvent(generationId, "connected", { message: "SSE stream connected" });

  // Flush any buffered events that were sent before client connected
  const bufferedEvents = EVENT_BUFFER.get(generationId);
  if (bufferedEvents && bufferedEvents.length > 0) {
    console.log(`[SSE] Flushing ${bufferedEvents.length} buffered events for ${generationId}`);
    for (const bufferedEvent of bufferedEvents) {
      sendSSEEvent(generationId, bufferedEvent.event, bufferedEvent.payload);
    }
    EVENT_BUFFER.delete(generationId);
  }

  // Cleanup on disconnect
  res.on("close", () => {
    SSE_CLIENTS.delete(generationId);
    // When the client disconnects (e.g. via handleCancel on frontend), mark as canceled
    CANCELED_GENERATIONS.add(generationId);
    console.log(`[SSE] Client disconnected for ${generationId}, marked as canceled`);
  });
}

/**
 * Check if a generation has been canceled
 */
export function isGenerationCanceled(generationId: string): boolean {
  return CANCELED_GENERATIONS.has(generationId);
}

/**
 * Send an SSE event to a specific generation
 * If client not connected yet, buffer the event
 * Uses proper SSE format with event type field
 */
export function sendSSEEvent(generationId: string, event: string, payload: Record<string, any>): void {
  const res = SSE_CLIENTS.get(generationId);
  
  // If client not connected, buffer the event
  if (!res || res.destroyed) {
    if (!res) {
      const buffer = EVENT_BUFFER.get(generationId) || [];
      if (buffer.length < MAX_BUFFER_SIZE) {
        buffer.push({ event, payload });
        EVENT_BUFFER.set(generationId, buffer);
        console.log(`[SSE] Buffered event ${event} for ${generationId} (${buffer.length}/${MAX_BUFFER_SIZE})`);
      }
    }
    return;
  }

  try {
    // Send proper SSE format: event type on its own line, then data
    // This ensures EventSource.addEventListener("eventType") works correctly
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
    console.log(`[SSE] Sent ${event} to ${generationId}`);
  } catch (err) {
    console.error(`[SSE] Failed to send event to ${generationId}:`, err);
    SSE_CLIENTS.delete(generationId);
  }
}

/**
 * Helper: Send completion event with optional data
 */
export function sendCompleted(generationId: string, payload: Record<string, any> = {}): void {
  sendSSEEvent(generationId, "completed", { 
    message: "Generation complete",
    ...payload 
  });
}

/**
 * Cleanup SSE client after generation completes
 */
export function cleanupSSEClient(generationId: string): void {
  const res = SSE_CLIENTS.get(generationId);
  if (res && !res.destroyed) {
    res.end();
  }
  SSE_CLIENTS.delete(generationId);
}

/**
 * Helper: Send stage started event
 */
export function sendStageStart(generationId: string, stage: number, message: string): void {
  sendSSEEvent(generationId, "stage_start", { stage, message });
}

/**
 * Helper: Send stage completed event
 */
export function sendStageComplete(generationId: string, stage: number, message: string): void {
  sendSSEEvent(generationId, "stage_complete", { stage, message });
}

/**
 * Helper: Send progress detail (thinking/analysis step)
 */
export function sendProgressDetail(generationId: string, detail: string): void {
  sendSSEEvent(generationId, "detail", { detail });
}

/**
 * Helper: Send error event
 */
export function sendError(generationId: string, error: string): void {
  sendSSEEvent(generationId, "error", { error });
}
