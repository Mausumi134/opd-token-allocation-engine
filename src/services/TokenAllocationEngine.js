const { Doctor, Slot, Token, TOKEN_SOURCES, TOKEN_STATUS } = require('../models');

/**
 * Core Token Allocation Engine
 * Handles dynamic token allocation with priority management and elastic capacity
 */
class TokenAllocationEngine {
  constructor() {
    this.doctors = new Map(); // doctorId -> Doctor object
    this.tokens = new Map();  // tokenId -> Token object
    this.waitingQueue = [];   // Tokens waiting for reallocation
  }

  /**
   * Add a doctor to the system
   */
  addDoctor(doctor) {
    this.doctors.set(doctor.id, doctor);
    this.initializeDoctorSlots(doctor);
  }

  /**
   * Initialize time slots for a doctor based on working hours
   */
  initializeDoctorSlots(doctor) {
    const startHour = parseInt(doctor.workingHours.start.split(':')[0]);
    const endHour = parseInt(doctor.workingHours.end.split(':')[0]);
    
    for (let hour = startHour; hour < endHour; hour++) {
      const startTime = `${hour.toString().padStart(2, '0')}:00`;
      const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
      const slotKey = `${doctor.id}-${startTime}`;
      
      const slot = new Slot(doctor.id, startTime, endTime);
      doctor.slots.set(slotKey, slot);
    }
  }

  /**
   * Request a token allocation
   */
  allocateToken(patientId, doctorId, preferredTime, source) {
    try {
      const doctor = this.doctors.get(doctorId);
      if (!doctor) {
        throw new Error('Doctor not found');
      }

      // Determine priority based on source
      const sourceConfig = this.getSourceConfig(source);
      const token = new Token(patientId, doctorId, preferredTime, source, sourceConfig.priority);

      // Try to allocate to preferred slot first
      if (this.tryAllocateToSlot(token, preferredTime)) {
        this.tokens.set(token.id, token);
        return { success: true, token, message: 'Token allocated successfully' };
      }

      // If preferred slot is full, try alternative slots
      const alternativeSlot = this.findAlternativeSlot(doctorId, preferredTime, sourceConfig.priority);
      if (alternativeSlot) {
        token.slotTime = alternativeSlot;
        if (this.tryAllocateToSlot(token, alternativeSlot)) {
          this.tokens.set(token.id, token);
          return { 
            success: true, 
            token, 
            message: `Token allocated to alternative slot: ${alternativeSlot}` 
          };
        }
      }

      // Add to waiting queue if no slots available
      this.waitingQueue.push(token);
      return { 
        success: false, 
        token, 
        message: 'No slots available, added to waiting queue' 
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Try to allocate token to a specific slot
   */
  tryAllocateToSlot(token, slotTime) {
    const doctor = this.doctors.get(token.doctorId);
    const slotKey = `${token.doctorId}-${slotTime}`;
    const slot = doctor.slots.get(slotKey);

    if (!slot) return false;

    // Check if slot has capacity
    if (slot.availableCapacity > 0) {
      return slot.addToken(token);
    }

    // If slot is full, check if we can bump a lower priority token
    return this.tryBumpLowerPriorityToken(slot, token);
  }

  /**
   * Try to bump a lower priority token to make room
   */
  tryBumpLowerPriorityToken(slot, newToken) {
    // Find the lowest priority token in the slot
    let lowestPriorityToken = null;
    let lowestPriority = newToken.priority;

    for (const existingToken of slot.tokens) {
      if (existingToken.priority < lowestPriority) {
        lowestPriority = existingToken.priority;
        lowestPriorityToken = existingToken;
      }
    }

    if (lowestPriorityToken) {
      // Remove the lower priority token and add to waiting queue
      slot.removeToken(lowestPriorityToken.id);
      this.waitingQueue.push(lowestPriorityToken);
      
      // Add the new higher priority token
      slot.addToken(newToken);
      return true;
    }

    return false;
  }

  /**
   * Find alternative slot for allocation
   */
  findAlternativeSlot(doctorId, preferredTime, priority) {
    const doctor = this.doctors.get(doctorId);
    const preferredHour = parseInt(preferredTime.split(':')[0]);
    
    // Try slots around the preferred time (±2 hours)
    const timeRange = [-2, -1, 1, 2];
    
    for (const offset of timeRange) {
      const alternativeHour = preferredHour + offset;
      const alternativeTime = `${alternativeHour.toString().padStart(2, '0')}:00`;
      const slotKey = `${doctorId}-${alternativeTime}`;
      const slot = doctor.slots.get(slotKey);
      
      if (slot && (slot.availableCapacity > 0 || this.canBumpTokenInSlot(slot, priority))) {
        return alternativeTime;
      }
    }
    
    return null;
  }

  /**
   * Check if we can bump a token in the slot
   */
  canBumpTokenInSlot(slot, newPriority) {
    return slot.tokens.some(token => token.priority < newPriority);
  }

  /**
   * Cancel a token and trigger reallocation
   */
  cancelToken(tokenId) {
    const token = this.tokens.get(tokenId);
    if (!token) {
      return { success: false, message: 'Token not found' };
    }

    // Remove token from slot
    const doctor = this.doctors.get(token.doctorId);
    const slotKey = `${token.doctorId}-${token.slotTime}`;
    const slot = doctor.slots.get(slotKey);
    
    if (slot) {
      slot.removeToken(tokenId);
    }

    // Update token status
    token.status = TOKEN_STATUS.CANCELLED;
    
    // Try to reallocate waiting tokens
    this.processWaitingQueue();

    return { success: true, message: 'Token cancelled successfully' };
  }

  /**
   * Handle emergency token insertion
   */
  insertEmergencyToken(patientId, doctorId, urgentTime) {
    const emergencyToken = new Token(
      patientId, 
      doctorId, 
      urgentTime, 
      TOKEN_SOURCES.EMERGENCY.name, 
      TOKEN_SOURCES.EMERGENCY.priority
    );

    // Emergency tokens get immediate allocation, bumping others if needed
    if (this.tryAllocateToSlot(emergencyToken, urgentTime)) {
      this.tokens.set(emergencyToken.id, emergencyToken);
      this.processWaitingQueue(); // Process any bumped tokens
      
      return { 
        success: true, 
        token: emergencyToken, 
        message: 'Emergency token allocated successfully' 
      };
    }

    return { success: false, message: 'Failed to allocate emergency token' };
  }

  /**
   * Process waiting queue and try to reallocate tokens
   */
  processWaitingQueue() {
    const reallocated = [];
    const stillWaiting = [];

    for (const token of this.waitingQueue) {
      // Try to find any available slot for this doctor
      const availableSlot = this.findAnyAvailableSlot(token.doctorId, token.priority);
      
      if (availableSlot) {
        token.slotTime = availableSlot;
        if (this.tryAllocateToSlot(token, availableSlot)) {
          reallocated.push(token);
          continue;
        }
      }
      
      stillWaiting.push(token);
    }

    this.waitingQueue = stillWaiting;
    return reallocated;
  }

  /**
   * Find any available slot for a doctor
   */
  findAnyAvailableSlot(doctorId, priority) {
    const doctor = this.doctors.get(doctorId);
    
    for (const [slotKey, slot] of doctor.slots) {
      if (slot.availableCapacity > 0 || this.canBumpTokenInSlot(slot, priority)) {
        return slot.startTime;
      }
    }
    
    return null;
  }

  /**
   * Get source configuration
   */
  getSourceConfig(source) {
    return Object.values(TOKEN_SOURCES).find(s => s.name === source) || TOKEN_SOURCES.WALKIN;
  }

  /**
   * Get doctor's schedule for a day
   */
  getDoctorSchedule(doctorId) {
    const doctor = this.doctors.get(doctorId);
    if (!doctor) return null;

    const schedule = [];
    for (const [slotKey, slot] of doctor.slots) {
      // Sort tokens by priority (highest first) for better display
      const sortedTokens = slot.tokens
        .map(t => ({
          id: t.id,
          patientId: t.patientId,
          source: t.source,
          priority: t.priority,
          status: t.status
        }))
        .sort((a, b) => b.priority - a.priority); // Sort by priority descending

      schedule.push({
        time: `${slot.startTime}-${slot.endTime}`,
        capacity: slot.maxCapacity,
        allocated: slot.tokens.length,
        available: slot.availableCapacity,
        tokens: sortedTokens
      });
    }

    return {
      doctor: { id: doctor.id, name: doctor.name, specialization: doctor.specialization },
      schedule: schedule.sort((a, b) => a.time.localeCompare(b.time))
    };
  }

  /**
   * Get system statistics
   */
  getSystemStats() {
    let totalSlots = 0;
    let occupiedSlots = 0;
    let totalCapacity = 0;
    let allocatedTokens = 0;

    for (const doctor of this.doctors.values()) {
      for (const slot of doctor.slots.values()) {
        totalSlots++;
        totalCapacity += slot.maxCapacity;
        allocatedTokens += slot.tokens.length;
        if (slot.tokens.length > 0) occupiedSlots++;
      }
    }

    return {
      totalDoctors: this.doctors.size,
      totalSlots,
      occupiedSlots,
      totalCapacity,
      allocatedTokens,
      waitingQueue: this.waitingQueue.length,
      utilizationRate: ((allocatedTokens / totalCapacity) * 100).toFixed(2) + '%'
    };
  }
}

module.exports = TokenAllocationEngine;