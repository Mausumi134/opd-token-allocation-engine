const { Doctor, Patient, TOKEN_SOURCES } = require('../models');
const TokenAllocationEngine = require('../services/TokenAllocationEngine');

/**
 * OPD Day Simulation
 * Simulates a full day at an OPD with 3 doctors handling various scenarios
 */
class OPDSimulation {
  constructor() {
    this.engine = new TokenAllocationEngine();
    this.patients = new Map();
    this.simulationLog = [];
  }

  /**
   * Initialize the simulation with doctors and patients
   */
  initialize() {
    console.log('Initializing OPD Simulation...\n');

    // Add 3 doctors with different specializations
    const doctors = [
      new Doctor('DOC001', 'Dr. Sarah Johnson', 'General Medicine', { start: '09:00', end: '17:00' }),
      new Doctor('DOC002', 'Dr. Michael Chen', 'Cardiology', { start: '10:00', end: '16:00' }),
      new Doctor('DOC003', 'Dr. Priya Sharma', 'Pediatrics', { start: '08:00', end: '18:00' })
    ];

    doctors.forEach(doctor => {
      this.engine.addDoctor(doctor);
      console.log(`Added ${doctor.name} (${doctor.specialization})`);
    });

    // Create sample patients
    const patients = [
      new Patient('P001', 'John Smith', '555-0101', 'regular'),
      new Patient('P002', 'Emma Wilson', '555-0102', 'priority'),
      new Patient('P003', 'Robert Brown', '555-0103', 'regular'),
      new Patient('P004', 'Lisa Davis', '555-0104', 'followup'),
      new Patient('P005', 'David Miller', '555-0105', 'emergency'),
      new Patient('P006', 'Anna Garcia', '555-0106', 'regular'),
      new Patient('P007', 'James Wilson', '555-0107', 'priority'),
      new Patient('P008', 'Maria Rodriguez', '555-0108', 'regular'),
      new Patient('P009', 'Thomas Anderson', '555-0109', 'followup'),
      new Patient('P010', 'Jennifer Lee', '555-0110', 'regular')
    ];

    patients.forEach(patient => {
      this.patients.set(patient.id, patient);
    });

    console.log(`Created ${patients.length} sample patients\n`);
  }

  /**
   * Log simulation events
   */
  log(message, type = 'INFO') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${type}: ${message}`;
    this.simulationLog.push(logEntry);
    console.log(logEntry);
  }

  /**
   * Simulate morning rush (9:00 AM - 11:00 AM)
   */
  simulateMorningRush() {
    this.log('Starting Morning Rush Simulation', 'PHASE');
    
    // Online bookings (made previous night)
    const onlineBookings = [
      { patientId: 'P001', doctorId: 'DOC001', time: '09:00', source: 'online' },
      { patientId: 'P002', doctorId: 'DOC002', time: '10:00', source: 'priority' },
      { patientId: 'P003', doctorId: 'DOC003', time: '08:00', source: 'online' },
      { patientId: 'P004', doctorId: 'DOC001', time: '10:00', source: 'followup' }
    ];

    onlineBookings.forEach(booking => {
      const result = this.engine.allocateToken(
        booking.patientId, 
        booking.doctorId, 
        booking.time, 
        booking.source
      );
      
      const patient = this.patients.get(booking.patientId);
      this.log(`Online booking: ${patient.name} → ${result.message}`);
    });

    // Walk-in patients arriving
    const walkIns = [
      { patientId: 'P006', doctorId: 'DOC001', time: '09:00' },
      { patientId: 'P008', doctorId: 'DOC003', time: '09:00' },
      { patientId: 'P010', doctorId: 'DOC002', time: '11:00' }
    ];

    walkIns.forEach(walkIn => {
      const result = this.engine.allocateToken(
        walkIn.patientId, 
        walkIn.doctorId, 
        walkIn.time, 
        'walkin'
      );
      
      const patient = this.patients.get(walkIn.patientId);
      this.log(`Walk-in: ${patient.name} → ${result.message}`);
    });

    this.log('Morning rush completed\n');
  }

  /**
   * Simulate midday scenarios
   */
  simulateMiddayScenarios() {
    this.log('Starting Midday Scenarios', 'PHASE');

    // Emergency patient arrives
    this.log('Emergency patient arrives!');
    const emergencyResult = this.engine.insertEmergencyToken('P005', 'DOC001', '12:00');
    const emergencyPatient = this.patients.get('P005');
    this.log(`Emergency: ${emergencyPatient.name} → ${emergencyResult.message}`);

    // Patient cancellation
    const tokens = Array.from(this.engine.tokens.values());
    if (tokens.length > 0) {
      const tokenToCancel = tokens[0];
      const cancelResult = this.engine.cancelToken(tokenToCancel.id);
      const cancelledPatient = this.patients.get(tokenToCancel.patientId);
      this.log(`Cancellation: ${cancelledPatient.name} → ${cancelResult.message}`);
    }

    // More priority patients
    const priorityResult = this.engine.allocateToken('P007', 'DOC002', '13:00', 'priority');
    const priorityPatient = this.patients.get('P007');
    this.log(`Priority booking: ${priorityPatient.name} → ${priorityResult.message}`);

    this.log('Midday scenarios completed\n');
  }

  /**
   * Simulate afternoon operations
   */
  simulateAfternoonOperations() {
    this.log('Starting Afternoon Operations', 'PHASE');

    // Follow-up patients
    const followUpResult = this.engine.allocateToken('P009', 'DOC003', '15:00', 'followup');
    const followUpPatient = this.patients.get('P009');
    this.log(`Follow-up: ${followUpPatient.name} → ${followUpResult.message}`);

    // Try to book when slots are getting full
    const lateBookingResult = this.engine.allocateToken('P010', 'DOC001', '16:00', 'online');
    const latePatient = this.patients.get('P010');
    this.log(`Late booking: ${latePatient.name} → ${lateBookingResult.message}`);

    this.log('Afternoon operations completed\n');
  }

  /**
   * Display comprehensive results
   */
  displayResults() {
    this.log('Simulation Results', 'RESULTS');
    
    console.log('\n' + '='.repeat(80));
    console.log('📋 FINAL SCHEDULES');
    console.log('='.repeat(80));

    // Display each doctor's schedule
    ['DOC001', 'DOC002', 'DOC003'].forEach(doctorId => {
      const schedule = this.engine.getDoctorSchedule(doctorId);
      if (schedule) {
        console.log(`\n${schedule.doctor.name} (${schedule.doctor.specialization})`);
        console.log('-'.repeat(60));
        
        schedule.schedule.forEach(slot => {
          console.log(`Time ${slot.time} | Capacity: ${slot.allocated}/${slot.capacity} | Available: ${slot.available}`);
          
          if (slot.tokens.length > 0) {
            slot.tokens.forEach(token => {
              const patient = this.patients.get(token.patientId);
              const sourceEmoji = this.getSourceEmoji(token.source);
              console.log(`   ${sourceEmoji} ${patient.name} (${token.source}, Priority: ${token.priority})`);
            });
          } else {
            console.log('   No appointments');
          }
        });
      }
    });

    // Display system statistics
    console.log('\n' + '='.repeat(80));
    console.log('📈 SYSTEM STATISTICS');
    console.log('='.repeat(80));
    
    const stats = this.engine.getSystemStats();
    Object.entries(stats).forEach(([key, value]) => {
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      console.log(`${label}: ${value}`);
    });

    // Display waiting queue
    if (this.engine.waitingQueue.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('⏳ WAITING QUEUE');
      console.log('='.repeat(80));
      
      this.engine.waitingQueue.forEach((token, index) => {
        const patient = this.patients.get(token.patientId);
        const doctor = this.engine.doctors.get(token.doctorId);
        console.log(`${index + 1}. ${patient.name} → ${doctor.name} (${token.source}, Priority: ${token.priority})`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('SIMULATION COMPLETED');
    console.log('='.repeat(80));
  }

  /**
   * Get symbol for token source
   */
  getSourceEmoji(source) {
    const symbols = {
      'online': '[ONLINE]',
      'walkin': '[WALKIN]',
      'priority': '[PRIORITY]',
      'followup': '[FOLLOWUP]',
      'emergency': '[EMERGENCY]'
    };
    return symbols[source] || '[UNKNOWN]';
  }

  /**
   * Run the complete simulation
   */
  run() {
    console.log('OPD TOKEN ALLOCATION ENGINE SIMULATION');
    console.log('='.repeat(80));
    
    this.initialize();
    this.simulateMorningRush();
    this.simulateMiddayScenarios();
    this.simulateAfternoonOperations();
    this.displayResults();
    
    return {
      engine: this.engine,
      patients: this.patients,
      log: this.simulationLog
    };
  }
}

// Export for use in other modules
module.exports = OPDSimulation;

// Run simulation if this file is executed directly
if (require.main === module) {
  const simulation = new OPDSimulation();
  simulation.run();
}